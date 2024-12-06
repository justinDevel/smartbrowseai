(function () {
  const createChatUI = () => {
    const chatContainer = document.createElement("div");
    chatContainer.id = "gemini-chat-container";

    const shadowRoot = chatContainer.attachShadow({ mode: "open" });

    const linkElement = document.createElement("link");
    linkElement.setAttribute("rel", "stylesheet");
    linkElement.setAttribute(
      "href",
      chrome.runtime.getURL("assets/styles.css")
    );
    shadowRoot.appendChild(linkElement);

    shadowRoot.innerHTML += `
      <div id="chat-header" part="chat-header">SmartBrowseAI Assistant</div>
      <div id="chat-body" part="chat-body"></div>
      <textarea id="chat-input" part="chat-input" placeholder="Type your message..."></textarea>
      <button id="chat-send" part="chat-send">Send</button>
    `;

    document.body.appendChild(chatContainer);

    console.log("Content loaded");

    const element = getElementByIdFromShadowOrDocument(
      "chat-input",
      shadowRoot
    );

    const userQuery = element.value;

    function markdownToPlainText(markdown) {
      if (!markdown || typeof markdown !== "string") {
        throw new Error(
          "Invalid Markdown input: Input must be a non-empty string."
        );
      }

      const html = marked(markdown);

      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = html;

      const plainText = tempDiv.textContent || tempDiv.innerText || "";

      return plainText.trim();
    }

    function sanitizeHTML(html) {
      const div = document.createElement("div");
      div.innerHTML = html;
      return div.textContent || div.innerText || "";
    }
    const sanitizedContent = sanitizeHTML(document.body.innerHTML);
    // const  pageContent = {
    //     title: document.title,
    //     headText: document.head.innerText.slice(0, 400),
    //     bodyText: sanitizedContent.slice(0, 600),
    //     url: window.location.href,
    //   };
    const limitProducts = extractProducts().slice(0, 5);
    const pageContent = {
      title: document.title,
      metaDescription: getMetaContent("description"),
      metaKeywords: getMetaContent("keywords"),
      metaAuthor: getMetaContent("author"),
      metaTags: extractMetaTags(),
      headText: extractHeadText(),
      webData: limitProducts,
      bodyText: sanitizedContent.slice(0, 600),
      searchFormData: getSearchFormData(),
      url: window.location.href,
    };
    console.log("first 5 prod:: " + limitProducts);
    function detectDynamicSearch() {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              if (
                node.matches(
                  'input[type="search"], input[name*="search"], input[name*="query"]'
                ) ||
                node
                  .closest("form")
                  ?.querySelector(
                    'input[type="search"], input[name*="search"], input[name*="query"]'
                  )
              ) {
                console.log("Search input detected:", node);

                const form = node.closest("form");
                if (form) {
                  const action = form.getAttribute("action") || "";
                  const method = form.getAttribute("method") || "GET";
                  console.log("Form action:", action);
                  console.log("Form method:", method);
                }
              }
            }
          });
        });
      });

      observer.observe(document.body, { childList: true, subtree: true });
    }

    detectDynamicSearch();

    // function listenForSearchEvents() {

    //   document.addEventListener("input", (event) => {
    //     if (
    //       event.target &&
    //       (event.target.type === "search" ||
    //         event.target.name.includes("search"))
    //     ) {
    //       console.log("Search event detected on input:", event.target);
    //     }
    //   });

    //   document.addEventListener("ajaxSearchRequest", (event) => {
    //     console.log("AJAX search request initiated:", event.detail);
    //   });
    // }

    // listenForSearchEvents();

    function extractProducts() {
      const productSelectors = [
        '[class*="product"]',
        '[class*="search-result"]',
        '[id*="product"]',
        "[data-product]",
      ];

      const productElements = Array.from(
        document.querySelectorAll(productSelectors.join(","))
      );

      const products = productElements.map((productElement) => {
        const name = cleanText(
          productElement.querySelector(
            '[class*="name"], [id*="name"], h1, h2, h3, p, span'
          )?.textContent || "Unknown"
        );
        const price = cleanText(
          productElement.querySelector(
            '[class*="price"], [id*="price"], .price'
          )?.textContent || "Unknown"
        );
        const link = productElement.querySelector("a[href]")?.href || null;

        return { name, price, link };
      });
      // console.log("products:: " + productElements);

      return products.filter(
        (product) =>
          product.name !== "Unknown" ||
          product.price !== "Unknown" ||
          product.link
      );
    }

    function cleanText(text) {
      return text
        .replace(/[\n\r\t]+/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
    }

    function observeDynamicProducts(callback) {
      const observer = new MutationObserver(() => {
        const products = extractProducts();
        callback(products);
      });

      observer.observe(document.body, { childList: true, subtree: true });
    }

    const staticProducts = extractProducts();
    console.log("Static products:", staticProducts);

    // Observe dynamic changes for new products
    // observeDynamicProducts((products) => {
    //   console.log('Dynamic products:', products);
    // });

    function getMetaContent(name) {
      const metaTag = document.querySelector(`meta[name="${name}"]`);
      return metaTag ? metaTag.getAttribute("content") : null;
    }

    function extractMetaTags() {
      const metaTags = document.querySelectorAll("meta");
      const result = [];

      metaTags.forEach((tag) => {
        const name = tag.getAttribute("name") || tag.getAttribute("property");
        const content = tag.getAttribute("content");
        if (name && content) {
          result.push({ name, content });
        }
      });

      return result;
    }

    function extractHeadText() {
      const relevantTags = ["title", "meta"];
      let headText = "";

      relevantTags.forEach((tagName) => {
        const elements = document.getElementsByTagName(tagName);
        for (const element of elements) {
          if (tagName === "title") {
            headText += element.innerText;
          } else if (tagName === "meta" && element.hasAttribute("content")) {
            headText += `${
              element.getAttribute("name") || element.getAttribute("property")
            }: ${element.getAttribute("content")} `;
          }
        }
      });

      return headText.slice(0, 400);
    }

    function scrollToBottom() {
      const chatContainer = getElementByIdFromShadowOrDocument(
        "chat-body",
        shadowRoot
      );
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function getSearchFormData() {
      const forms = document.querySelectorAll("body form");

      for (let form of forms) {
        const searchInput = form.querySelector(
          'input[type="search"], input[name*="search"], input[name*="query"]'
        );

        if (searchInput) {
          const action = form.getAttribute("action") || "";
          const method = form.getAttribute("method") || "GET";

          const inputs = Array.from(
            form.querySelectorAll("input, select, textarea")
          ).map((input) => ({
            name: input.name || input.id,
            type: input.type,
            value: input.value || "",
          }));

          return {
            searchFormFound: true,
            formAction: action,
            formMethod: method,
            inputs: inputs,
          };
        }
      }

      return {
        searchFormFound: false,
      };
    }

    chrome.runtime.sendMessage(
      {
        type: "extractContent",
        pageContent: pageContent,
        userQuery: userQuery,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            "Error communicating with background script:",
            chrome.runtime.lastError.message
          );
        }
      }
    );

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log("summery message:: " + JSON.stringify(message));

      if (message.type === "summeryData") {
        // const markdownInput = `<div class="ai-msg" part="ai-msg">Gemi- <small part="res">${message.data}</small></div>`;
        // const htmlContent = marked(markdownInput);
        getElementByIdFromShadowOrDocument(
          "chat-body",
          shadowRoot
        ).innerHTML += `<div class="ai-msg" part="ai-msg">Gemi- <small part="res">${message.data}</small></div>`;
        console.log("Received summery data:", message.data);
        console.log("raw message:: " + JSON.stringify(message));
      }
    });

    const sendMessage = () => {
      // const pageContent = {
      //   title: document.title,
      //   metaDescription: getMetaContent("description"),
      //   metaKeywords: getMetaContent("keywords"),
      //   metaAuthor: getMetaContent("author"),
      //   metaTags: extractMetaTags(),
      //   headText: extractHeadText(),
      //   webData: extractProducts(),
      //   bodyText: sanitizedContent.slice(0, 600),
      //   searchFormData: getSearchFormData(),
      //   url: window.location.href,
      // };
      console.log("sendMessage page content:: " + pageContent);
      const input = getElementByIdFromShadowOrDocument(
        "chat-input",
        shadowRoot
      ).value;
      if (!input) return;
      getElementByIdFromShadowOrDocument("chat-input", shadowRoot).value = "";
      getElementByIdFromShadowOrDocument(
        "chat-body",
        shadowRoot
      ).innerHTML += `<div class="user-msg" part="user-msg">Me- ${input}</div>`;

      chrome.runtime.sendMessage(
        { type: "analyzePage", userQuery: input, pageContent: pageContent },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              "Error communicating with background script:",
              chrome.runtime.lastError.message
            );
          }
        }
      );
      scrollToBottom();
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log("message:: " + JSON.stringify(message));
        if (message.type === "responseFromAI") {
          console.log("Received data in content.js:", message.data);
          console.log("message:: " + JSON.stringify(message));
          if (message && message.success) {
            // const markdownInput = `<div class="ai-msg">Gemi- ${message.data}</div>`;
            // const htmlContent = marked(markdownInput);

            getElementByIdFromShadowOrDocument(
              "chat-body",
              shadowRoot
            ).innerHTML += `<div class="ai-msg" part="ai-msg">Gemi- ${message.data}</div>`;
            scrollToBottom();
          } else {
            const errorMsg = message?.error || "Unexpected response format.";
            getElementByIdFromShadowOrDocument(
              "chat-body",
              shadowRoot
            ).innerHTML += `<div class="error-msg">Error: ${errorMsg}</div>`;
            scrollToBottom();
          }
        }

        if (message.type === "summeryData") {
          const markdownInput = `<div class="ai-msg" part="ai-msg">Gemi- ${message.data}</div>`;
          const htmlContent = marked(markdownInput);
          console.log("Received summery data:", message.data);
          console.log("raw message:: " + JSON.stringify(message));
        }
      });
    };

    const chatSend = shadowRoot.querySelector("#chat-send");
    chatSend.addEventListener("click", sendMessage);
  };

  function getElementByIdFromShadowOrDocument(id, shadowRoot = null) {
    if (shadowRoot) {
      return shadowRoot.getElementById(id) || null;
    }
    return document.getElementById(id);
  }

  createChatUI();
})();
