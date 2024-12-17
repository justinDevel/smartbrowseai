(function () {
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
        productElement.querySelector('[class*="price"], [id*="price"], .price')
          ?.textContent || "Unknown"
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

  /**
   * Sanitizes HTML to prevent XSS attacks.
   * @param {string} input - The input string to sanitize.
   * @returns {string} - The sanitized string.
   */
  const sanitizeHTML = (input) => {
    const tempDiv = document.createElement("div");
    tempDiv.textContent = input;
    return tempDiv.innerHTML;
  };
  const sanitizedContent = sanitizeHTML(document.body.innerHTML);

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

  function handlePlaceholder(shadowRoot) {
    const typingArea = shadowRoot.getElementById("typing-area");
    const placeholder = shadowRoot.getElementById("placeholder");

    const hasText = typingArea.textContent.trim() !== "";

    console.log("hasText " + hasText);

    if (hasText) {
      placeholder.style.display = "none";
    } else {
      placeholder.style.display = "block";
    }
  }

  const limitProducts = extractProducts().slice(0, 5);
  const pageContent = {
    title: document.title,
    metaDescription: getMetaContent("description"),
    metaKeywords: getMetaContent("keywords"),
    metaAuthor: getMetaContent("author"),
    metaTags: extractMetaTags(),
    isUserPicked: false,
    headText: extractHeadText(),
    webData: limitProducts,
    bodyText: sanitizedContent.slice(0, 600),
    searchFormData: getSearchFormData(),
    url: window.location.href,
  };

  let isRequestInProgress = false;
  let shadowRoot;
  let isFeatureEnabled = false;
  let throttledMouseoverHandler;

  function sendSummerizeRequest(pageContent) {
    console.log("Sending Summarization Request:", pageContent);

    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(
          {
            type: "extractContent",
            pageContent: pageContent,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error(
                "Error communicating with background script:",
                chrome.runtime.lastError.message
              );
              reject(chrome.runtime.lastError.message);
            } else {
              console.log("Response from background script:", response);
              resolve(response);
            }
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  let isChatUIInitialized = false;
  let chatContainer;
  const createChatUI = () => {
    if (isChatUIInitialized) return;

    const chatContainer = document.createElement("div");
    chatContainer.id = "gemini-chat-container";

    shadowRoot = chatContainer.attachShadow({ mode: "open" });

    const linkElement = document.createElement("link");
    linkElement.setAttribute("rel", "stylesheet");
    linkElement.setAttribute(
      "href",
      chrome.runtime.getURL("assets/styles.css")
    );
    shadowRoot.appendChild(linkElement);

    shadowRoot.innerHTML += `
      <div id="chat-header" part="chat-header">
      <div id="chat-resizer" part="chat-resizer"></div>
        <div class="chat-header-left" part="chat-header-left"></div>
        <div class="chat-header-title" part="chat-header-title">SmartWebAI Assistant</div>
        <div class="chat-header-right" part="chat-header-right">
        <!--<button id="settings-btn" part="settings-btn" aria-label="Settings" data-tooltip="Settings">
          ⚙️
        </button>-->
        </div>
      </div>
      <div id="chat-btns-holder" part="chat-btns-holder">
      <div class="sub-switch" part="sub-switch"> 
            <div class="switch-container left" part="switch-container">
          <span>Ai Summarizer</span>
          <label class="switch" part="switch">
            <input type="checkbox" class="toggle-switch" id="text-summarizer-switch" part="text-summarizer-switch">
            <span class="slider"  part="slider"></span>
          </label>
        </div>
        <div class="switch-container left" part="switch-container">
          <span>Ai Writer</span>
          <label class="switch" part="switch">
            <input type="checkbox" class="toggle-switch" id="text-writer-switch" part="text-writer-switch">
            <span class="slider"  part="slider"></span>
          </label>
        </div>
        </div>
        <div class="sub-switch" part="sub-switch">
      <div class="switch-container right" part="switch-container">
          <span>Text Picker</span>
          <label class="switch" part="switch">
            <input type="checkbox" class="toggle-switch" id="text-picker-switch" part="text-picker-switch">
            <span class="slider"  part="slider"></span>
          </label>
        </div>
        <div class="switch-container right" part="switch-container">
          <span>Rewrite text</span>
          <label class="switch" part="switch">
            <input type="checkbox" class="toggle-switch" id="text-rewriter-switch" part="text-rewriter-switch">
            <span class="slider"  part="slider"></span>
          </label>
        </div>
        </div>
        </div>
        <div id="chat-body" part="chat-body"></div>
            <div id="chat-box-holder" part="chat-box-holder">
              <div id="editableArea" part="editable-area" class="editable-area" contenteditable="true" placeholder="Type your message here...">
                <div class="typing-area" id="typing-area" part="typing-area" contenteditable="true"></div>
                <span id="placeholder" part="placeholder"  class="placeholder">Type your message here...</span>
              </div>
              <button id="chat-send" part="chat-send">Send</button>
            <small part="info">Powered by Google Nano AI APIs</small>
        </div>
      
      `;

    document.body.appendChild(chatContainer);

    shadowRoot
      .getElementById("editableArea")
      .addEventListener("keydown", (event) => {
        console.log(`Key pressed: ${event.key}`);
        event.stopPropagation();
      });

    isChatUIInitialized = true;
  };

  createChatUI();

  if (!shadowRoot) {
    console.error("Shadow root is not initialized.");
    return;
  }

  chrome.runtime.sendMessage({ type: "injectScript" }, (response) => {
    console.log(response.message);
  });

  let modalOverlay = document.querySelector(".modal-overlay");
  if (!modalOverlay) {
    modalOverlay = document.createElement("div");
    modalOverlay.id = "modal";
    modalOverlay.className = "modal-overlay";
    modalOverlay.setAttribute("part", "modalOverlay");

    modalOverlay.innerHTML = `
    
      <div class="modal-box" part="modal-box">
        <h3 class="modalHeader">provide a context</h3>
        <input type="text" id="userInput" part="userInput" placeholder="e.g. Summarize/ Rewrite for a beginner" />
          <div class="actions" part="actions">
            <button class="btn-confirm" id="btn-confirm" part="btn-confirm">Send</button>
            <button class="btn-cancel" id="btn-cancel" part="btn-cancel">Cancel</button>
            <button class="btn-default" id="btn-default" part="btn-default">Continue</button>
          </div>
        </div>
    
    `;

    document.body.appendChild(modalOverlay);
  }

  handlePlaceholder(shadowRoot);

  shadowRoot.querySelectorAll(".toggle-switch").forEach((toggle) => {
    toggle.addEventListener("change", (event) => {
      const isChecked = event.target.checked;
      const slider = event.target.nextElementSibling;

      if (isChecked) {
        slider.classList.add("slider-checked");
      } else {
        slider.classList.remove("slider-checked");
      }
    });
  });

  /**
   * Sanitizes input to prevent XSS attacks.
   * @param {string} input - The input string to sanitize.
   * @returns {string} - The sanitized string.
   */
  function sanitizeInput(input) {
    const tempDiv = document.createElement("div");
    tempDiv.textContent = input;
    return tempDiv.innerHTML;
  }

  /**
   * Handles messages of type 'summeryData'.
   * @param {Object} message - The message object.
   */
  function handleSummaryData(message) {
    console.log("Received summary data:" + message.response);

    const chatBodyElement = getElementByIdFromShadowOrDocument(
      "chat-body",
      shadowRoot
    );

    if (!chatBodyElement) {
      console.error("Chat body element not found.");
      return;
    }

    const summaryHTML = `
            <div class="ai-msg" part="ai-msg">
              Gemi- ${sanitizeInput(message.response)}
            </div>`;
    chatBodyElement.innerHTML += summaryHTML;

    scrollToBottom(chatBodyElement);
  }

  console.log("Content loaded");

  if (isRequestInProgress) {
    console.warn("Request in progress. Ignoring duplicate request.");
    return;
  }

  isRequestInProgress = true;

  sendSummerizeRequest(pageContent)
    .then((response) => {
      console.log("Summarization successful:", response);
      handleSummaryData(response);
    })
    .catch((error) => {
      console.error("Error during summarization:", error);
    })
    .finally(() => {
      isRequestInProgress = false;
    });

  const element = getElementByIdFromShadowOrDocument(
    "editableArea",
    shadowRoot
  );

  const resizer = getElementByIdFromShadowOrDocument(
    "chat-resizer",
    shadowRoot
  );

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

  function updatePageContent() {
    const pageContent = {
      title: document.title,
      metaDescription: getMetaContent("description"),
      metaKeywords: getMetaContent("keywords"),
      metaAuthor: getMetaContent("author"),
      metaTags: extractMetaTags(),
      isUserPicked: false,
      headText: extractHeadText(),
      webData: limitProducts,
      bodyText: sanitizedContent.slice(0, 600),
      searchFormData: getSearchFormData(),
      url: window.location.href,
    };

    console.log("New Data fetched :: " + pageContent);
    return pageContent;
  }

  function detectHeadChanges(callback) {
    let hasFired = false;

    const observer = new MutationObserver((mutations) => {
      if (hasFired) return;

      mutations.forEach((mutation) => {
        if (mutation.type === "childList" || mutation.type === "attributes") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeName === "TITLE") {
              console.log("Title changed:", node.innerText);
              callback("Title changed: " + node.innerText);

              return;
            } else if (node.nodeName === "META") {
              const metaName = node.getAttribute("name");
              const metaProperty = node.getAttribute("property");
              if (
                metaName === "description" ||
                metaProperty === "og:description"
              ) {
                console.log(
                  "Meta tag changed:",
                  metaName || metaProperty,
                  node.content
                );
                callback(
                  "Meta tag changed: " +
                    (metaName || metaProperty) +
                    " - " +
                    node.content
                );

                return;
              }
            }
          });

          if (mutation.type === "attributes") {
            const targetNode = mutation.target;
            if (targetNode.nodeName === "TITLE") {
              console.log("Title modified:", targetNode.innerText);
              callback("Title modified: " + targetNode.innerText);

              return;
            } else if (targetNode.nodeName === "META") {
              const metaName = targetNode.getAttribute("name");
              const metaProperty = targetNode.getAttribute("property");
              if (
                metaName === "description" ||
                metaProperty === "og:description"
              ) {
                console.log(
                  "Meta tag modified:",
                  metaName || metaProperty,
                  targetNode.content
                );
                callback(
                  "Meta tag modified: " +
                    (metaName || metaProperty) +
                    " - " +
                    targetNode.content
                );

                return;
              }
            }
          }
        }
      });
    });

    observer.observe(document.head, {
      childList: true,
      attributes: true,
      subtree: true,
    });

    console.log(
      "Listening for changes in <head> (title, description, og:description)..."
    );
  }

  async function onHeadChange(message) {
    console.log("Change detected in <head>: ", message);
    if (isRequestInProgress) {
      console.warn("Request in progress. Ignoring duplicate request.");
      return;
    }
  }

  detectHeadChanges(onHeadChange);

  function observeDynamicProducts(callback) {
    const observer = new MutationObserver(() => {
      const products = extractProducts();
      callback(products);
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  const staticProducts = extractProducts();
  console.log("Static products:", staticProducts);

  function scrollToBottom() {
    const chatBody = getElementByIdFromShadowOrDocument(
      "chat-body",
      shadowRoot
    );
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function sendMessageToBackground(messageData) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(messageData, (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            "Error communicating with background script:",
            chrome.runtime.lastError.message
          );
          reject(chrome.runtime.lastError.message);
        } else {
          console.log("Response from background script:", response);
          resolve(response);
        }
      });
    });
  }

  const sendUserMessage = () => {
    console.log("sendMessage page content:", pageContent);

    const inputElement = shadowRoot.getElementById("typing-area");
    let input = "";
    let embeddedTxt = "";

    input = inputElement.textContent.trim();

    if (!input) {
      console.warn("Input field is empty.");
      return;
    }
    appendMessageToChat("user-msg", `Me- ${sanitizeHTML(input)}`);

    if (isUserEmbeddedText(shadowRoot)) {
      const quoteTextElement = shadowRoot.querySelector("#quote-text");

      console.info("User embedded a Text.");

      if (quoteTextElement) {
        embeddedTxt = quoteTextElement.textContent.trim() + "\n";
      } else {
        console.warn("quote-text element not found.");
      }
    }

    inputElement.textContent = "";

    console.log("ai input " + input);
    scrollToBottom();

    const messageData = {
      type: "analyzePage",
      userQuery: input,
      embeddedTxt: embeddedTxt,
      pageContent: pageContent,
    };

    sendMessageToBackground(messageData)
      .then((response) => {
        console.log("Message sent successfully:", response);
        handleAIResponse(response);
      })
      .catch((error) => {
        console.error("Error sending message:", error);
      });
  };

  const typingArea = shadowRoot.querySelector(".editable-area");

  typingArea.addEventListener("input", function () {
    console.log("user typing ...");
    handlePlaceholder(shadowRoot);
  });

  /**
   * Checks if the user Embedded text, has the quoteText element,
   * and whether the quoteText contains any text content.
   *
   * @param {ShadowRoot|Document} root - The root to query (shadowRoot or document).
   * @returns {boolean} - Returns true if quoteBox exists, has quoteText, and contains text; otherwise, false.
   */
  function isUserEmbeddedText(root) {
    if (!root) {
      console.error(
        "Invalid root provided. Ensure you pass a ShadowRoot or Document."
      );
      return false;
    }

    const quoteBox = root.getElementById("quoteBox");
    if (!quoteBox) {
      console.warn("quoteBox does not exist.");
      return false;
    }

    const quoteText = quoteBox.querySelector("#quote-text");
    if (!quoteText) {
      console.warn("quoteText element is missing inside quoteBox.");
      return false;
    }

    const hasText = quoteText.textContent.trim().length > 0;
    if (!hasText) {
      console.warn("quoteText exists but is empty.");
      return false;
    }

    return true;
  }

  function removeHtmlTagsUsingParser(input) {
    let doc = new DOMParser().parseFromString(input, "text/html");
    return doc.body.textContent || "";
  }

  /**
   * Handles messages of type 'responseFromAI'.
   * @param {Object} message - The message object.
   */
  function handleAIResponse(message) {
    const chatBodyElement = getElementByIdFromShadowOrDocument(
      "chat-body",
      shadowRoot
    );
    let aiMessageHTML = "";
    if (!chatBodyElement) {
      console.error("Chat body element not found.");
      return;
    }

    console.log("Marked.js loaded successfully!");

    const markdown = sanitizeInput(message.response);
    const html = marked.parse(markdown);

    aiMessageHTML = `
      <div class="ai-msg" part="ai-msg">
        Gemi- <span>${html}</span>
      </div>`;
    console.log(html);

    chatBodyElement.innerHTML += aiMessageHTML;

    scrollToBottom(chatBodyElement);
  }

  /**
   * Scrolls the chat container to the bottom.
   * @param {HTMLElement} chatBodyElement - The chat body element.
   */

  function scrollToBottom() {
    const chatBody = getElementByIdFromShadowOrDocument(
      "chat-body",
      shadowRoot
    );
    console.log("scroll called");
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  /**
   * Appends a message to the chat body.
   * @param {string} messageType - The CSS class for the message (e.g., "user-msg", "error-msg").
   * @param {string} messageContent - The content of the message to display.
   */
  const appendMessageToChat = (messageType, messageContent) => {
    const chatBody = getElementByIdFromShadowOrDocument(
      "chat-body",
      shadowRoot
    );
    if (!chatBody) {
      console.error("Chat body element not found.");
      return;
    }

    chatBody.innerHTML += `<div class="${messageType}" part="${messageType}">${messageContent}</div>`;
    scrollToBottom();
  };

  const chatSend = getElementByIdFromShadowOrDocument("chat-send", shadowRoot);
  chatSend.addEventListener("click", sendUserMessage);

  const chatInput = getElementByIdFromShadowOrDocument(
    "editableArea",
    shadowRoot
  );

  let isResizing = false;
  let initialX, initialY, initialWidth, initialHeight;

  const geminiContainer = document.querySelector("#gemini-chat-container");
  const chatBody = getElementByIdFromShadowOrDocument("chat-body", shadowRoot);
  resizer.addEventListener("mousedown", (e) => {
    e.preventDefault();
    isResizing = true;

    initialX = e.clientX;
    initialY = e.clientY;
    initialWidth = geminiContainer.offsetWidth;
    initialHeight = geminiContainer.offsetHeight;

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  });

  function handleMouseMove(e) {
    if (isResizing) {
      const dx = (e.clientX - initialX) * -1;
      const dy = (e.clientY - initialY) * -1;

      const newWidth = initialWidth + dx;
      const newHeight = initialHeight + dy;

      if (newWidth > 340 && newWidth < 745) {
        geminiContainer.style.width = `${newWidth}px`;
      }

      if (newHeight > 495 && newHeight < 800) {
        geminiContainer.style.height = `${newHeight}px`;
      }
    }
  }

  function handleMouseUp() {
    isResizing = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }
  console.log("chatInput " + chatInput);
  chatInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();

      sendUserMessage();
    }
  });

  const tooltip = document.createElement("div");
  let tooltipTxt = "Add to Chat";
  tooltip.textContent = tooltipTxt;
  tooltip.style.position = "absolute";
  tooltip.style.backgroundColor = "#007bff";
  tooltip.style.color = "white";
  tooltip.style.padding = "6px 10px";
  tooltip.style.borderRadius = "6px";
  tooltip.style.fontSize = "14px";
  tooltip.style.pointerEvents = "none";
  tooltip.style.zIndex = "1000";
  tooltip.style.display = "none";
  tooltip.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.2)";
  tooltip.style.transform = "translate(-50%, -150%)";
  document.body.appendChild(tooltip);

  function throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return function (...args) {
      const context = this;
      if (!lastRan) {
        func.apply(context, args);
        lastRan = Date.now();
      } else {
        clearTimeout(lastFunc);
        lastFunc = setTimeout(() => {
          if (Date.now() - lastRan >= limit) {
            func.apply(context, args);
            lastRan = Date.now();
          }
        }, limit - (Date.now() - lastRan));
      }
    };
  }

  function applyHighlight(element) {
    element.style.backgroundColor = "rgba(0, 123, 255, 0.2)";
    element.style.transition = "background-color 0.3s ease";
  }

  function removeHighlight(element) {
    element.style.backgroundColor = "";
    element.style.transition = "background-color 0.3s ease";
  }

  function updateTooltipPosition(event) {
    tooltip.style.left = `${event.pageX}px`;
    tooltip.style.top = `${event.pageY}px`;
    tooltip.style.display = "block";
  }

  let context = "";
  const quoteBox = shadowRoot.getElementById("quoteBox");
  const quoteTxt = shadowRoot.getElementById("quote-text");

  const editableArea = shadowRoot.getElementById("editableArea");

  function addQuoteText(quoteText, shadowRoot) {
    let quoteBox = shadowRoot.getElementById("quoteBox");

    if (!quoteBox) {
      quoteBox = document.createElement("div");
      quoteBox.id = "quoteBox";
      quoteBox.className = "quote-box";
      quoteBox.contentEditable = "false";
      quoteBox.setAttribute("part", "quote-box");

      const editableArea = shadowRoot.querySelector(".editable-area");
      editableArea.prepend(quoteBox);
    }

    let quoteSpan = shadowRoot.getElementById("quote-text");

    if (!quoteSpan) {
      quoteSpan = document.createElement("span");
      quoteSpan.id = "quote-text";
      quoteSpan.className = "quote-text";
      quoteSpan.setAttribute("part", "quote-text");

      const removeBtn = document.createElement("button");
      removeBtn.id = "removeQuoteBtn";
      removeBtn.className = "remove-quote-btn";
      removeBtn.setAttribute("aria-label", "Remove Quote");
      removeBtn.setAttribute("part", "remove-quote-btn");
      removeBtn.textContent = "✖";

      removeBtn.addEventListener("click", () => {
        quoteBox.remove();
      });

      quoteBox.appendChild(quoteSpan);
      quoteBox.appendChild(removeBtn);
    }

    quoteSpan.textContent = quoteText;

    console.log("Quote text added:", quoteText);
  }

  function adjustPlaceholderTop(shadowRoot, resetToDefault = false) {
    const quoteBox = shadowRoot.getElementById("quoteBox");
    const editableArea = shadowRoot.querySelector(".editable-area");
    const placeholder = shadowRoot.querySelector(".placeholder");
    const typingArea = shadowRoot.querySelector(".typing-area");

    if (!editableArea) {
      console.warn("editable-area not found!");
      return;
    }

    if (!placeholder) {
      console.warn("placeholder not found!");
      return;
    }

    if (resetToDefault) {
      editableArea.style.setProperty("--placeholder-top", `4px`);
      placeholder.style.setProperty("--placeholder-top", `7px`);
      typingArea.style.setProperty("--placeholder-top", `4px`);
      console.log("Placeholder top reset to default 10px");
      return;
    }

    if (quoteBox) {
      const quoteBoxHeight = quoteBox.offsetHeight;
      console.log("quoteBoxHeight:: " + quoteBoxHeight);
      editableArea.style.setProperty(
        "--placeholder-top",
        `${quoteBoxHeight + 10}px`
      );
      typingArea.style.setProperty("--placeholder-top", `0`);
      placeholder.style.setProperty(
        "--placeholder-top",
        `${quoteBoxHeight + 10}px`
      );
      console.log(`Placeholder top adjusted to ${quoteBoxHeight + 10}px`);
    } else {
      console.warn("quoteBox not found!");
    }
  }

  function addQuoteBoxClickListener() {
    const quoteBox = shadowRoot.getElementById("quoteBox");

    if (quoteBox) {
      quoteBox.addEventListener("mousedown", (event) => {
        event.preventDefault();
        console.log("clicked");
      });
    } else {
      console.warn("quoteBox not found!");
    }
  }

  function removeQuoteBox() {
    const quoteBox = shadowRoot.getElementById("quoteBox");
    if (quoteBox) {
      adjustPlaceholderTop(shadowRoot, true);
      quoteBox.remove();
    } else {
      console.warn("quoteBox does not exist!");
      adjustPlaceholderTop(shadowRoot, true);
    }
  }

  function createQuoteBox(quoteText, chatInput = editableArea) {
    if (!chatInput) {
      console.error("chatInput container not found!");
      return;
    }

    let quoteBox = chatInput.querySelector("#quoteBox");

    if (!quoteBox) {
      quoteBox = document.createElement("div");
      quoteBox.id = "quoteBox";
      quoteBox.className = "quote-box";
      quoteBox.contentEditable = "false";
      quoteBox.setAttribute("part", "quote-box");

      const removeButton = document.createElement("button");
      removeButton.id = "removeQuoteBtn";
      removeButton.className = "remove-quote-btn";
      removeButton.setAttribute("aria-label", "Remove Quote");
      removeButton.setAttribute("part", "remove-quote-btn");
      removeButton.textContent = "✖";

      removeButton.addEventListener("click", () => {
        removeQuoteBox(chatInput);
      });

      quoteBox.appendChild(removeButton);

      chatInput.insertBefore(quoteBox, chatInput.firstChild);
    }

    let quoteSpan = quoteBox.querySelector("#quote-text");
    if (!quoteSpan) {
      quoteSpan = document.createElement("span");
      quoteSpan.id = "quote-text";
      quoteSpan.className = "quote-text";
      quoteSpan.setAttribute("part", "quote-text");
      quoteBox.insertBefore(quoteSpan, quoteBox.firstChild);
    }

    quoteSpan.textContent = quoteText;
    adjustPlaceholderTop(shadowRoot);
    quoteBox.setAttribute("part", "quote-box show");
    quoteBox.classList.add("show");

    console.log("QuoteBox updated with text:", quoteText);
  }

  function copyToClipboard(text, element) {
    tooltip.textContent = "Quoted!";

    element.style.backgroundColor = "rgba(0, 255, 0, 0.2)";

    addText(text);
    createQuoteBox(context);
    console.log("context:: " + context);

    navigator.clipboard
      .writeText(text)
      .then(() => {
        console.log("Text copied to clipboard:", text);
      })
      .catch((err) => console.error("Clipboard write failed:", err));

    setTimeout(() => {
      tooltip.textContent = "Click to Quote to Chat";
      element.style.backgroundColor = "rgba(0, 123, 255, 0.2)";
    }, 500);
  }

  function addText(newText) {
    context += newText + "\n";
    console.log(context);
  }

  let isTextRewriteEnabled = false;
  let mouseupListener, keyupListener;

  const targetDiv = shadowRoot.getElementById("typing-area");

  let userContext = "";
  let messageData = {};
  const modal = document.getElementById("modal");
  const sendContext = document.getElementById("btn-confirm");
  const sendDefault = document.getElementById("btn-default");
  const cancelProccess = document.getElementById("btn-cancel");

  console.log("modeal " + sendContext);
  function closePrompt() {
    modal.classList.remove("active");
  }

  function showCustomPrompt() {
    modal.classList.add("active");
  }

  function saveSelection() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return null;
    return selection.getRangeAt(0);
  }

  function restoreSelection(range) {
    if (!range) return;
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function waitForUserInput() {
    return new Promise((resolve, reject) => {
      const onConfirm = () => {
        const userInput = document.getElementById("userInput").value.trim();
        if (userInput) {
          resolve(userInput);
        } else {
          alert("No input provided!");
          reject(new Error("No input provided"));
        }
        cleanup();
      };

      const onContinue = () => {
        const userInput = "";

        resolve(userInput);

        cleanup();
      };

      const onCancel = () => {
        reject(new Error("User canceled the input"));
        cleanup();
      };

      const cleanup = () => {
        sendContext.removeEventListener("click", onConfirm);
        sendDefault.removeEventListener("click", onContinue);
        cancelProccess.removeEventListener("click", onCancel);
        closePrompt();
      };

      sendContext.addEventListener("click", onConfirm);
      sendDefault.addEventListener("click", onContinue);
      cancelProccess.addEventListener("click", onCancel);
    });
  }

  const getReplacementText = async (
    selectedText,
    isSummarizer = false,
    isWriter = false
  ) => {
    console.log("isSummarizer: ", isSummarizer);
    console.log("isWriter: ", isWriter);

    try {
      tooltip.textContent = "Please wait";

      const savedSelection = saveSelection();

      showCustomPrompt();

      const userInput = await waitForUserInput();

      restoreSelection(savedSelection);

      console.log("User input:", userInput);
      userContext = userInput;

      messageData = {
        type: isSummarizer
          ? "summarizeContent"
          : isWriter
          ? "writeContent"
          : "rewriteContent",
        userQuery: userContext,
        selectedText: selectedText,
      };

      const response = await sendMessageToBackground(messageData);

      tooltip.textContent = "Done";
      setTimeout(() => {
        tooltip.textContent = "Rewrite this (use the mouse Select text)";
      }, 700);

      console.log("Message sent successfully:", response.response);
      return response.response;
    } catch (error) {
      console.error("Error:", error.message);

      return "";
    }
  };

  /**
   * A function to toggle the text rewrite feature.
   * @param {boolean} enable - Whether to enable or disable the feature.
   * @param {Function} getReplacementText - A callback function for replacement text.
   */
  function toggleTextRewrite(
    enable,
    getReplacementText,
    isSummarizer = false,
    isWriter = false
  ) {
    isTextRewriteEnabled = enable;

    if (enable) {
      tooltip.textContent = "Summarize this (use the mouse Select text)";
      if (!isSummarizer && !isWriter) {
        tooltip.textContent = "Rewrite this (use the mouse Select text)";
      }
      if (isWriter) {
        tooltip.textContent =
          "Write content in here (use the mouse Select text)";
      }
      enableTextRewrite(getReplacementText, isSummarizer, isWriter);
      console.log("Text rewrite enabled.");
    } else {
      disableTextRewrite();
      console.log("Text rewrite disabled.");
    }
  }

  /**
   * Enables the text rewrite functionality.
   * @param {Function} getReplacementText - A callback function for replacement text.
   */
  function enableTextRewrite(getReplacementText, ...args) {
    throttledMouseoverHandler = throttle((event) => {
      if (!isTextRewriteEnabled) return;
      const hoveredElement = event.target;
      console.log("hoveredElement ", hoveredElement.id);

      if (hoveredElement) {
        if (hoveredElement.id === "gemini-chat-container") return;
        if (modal && modal.contains(hoveredElement)) return;

        applyHighlight(hoveredElement);
        updateTooltipPosition(event);
      }
    }, 200);

    document.addEventListener("mouseover", throttledMouseoverHandler);

    mouseupListener = async () => {
      if (!isTextRewriteEnabled) return;
      const selectedText = getSelectedText();
      if (selectedText) {
        const newText = await getReplacementText(selectedText, ...args);
        if (newText && newText.trim() !== "") {
          replaceSelectedText(newText);
        }
      }
    };

    keyupListener = async (e) => {
      if (!isTextRewriteEnabled) return;
      if (e.key === "Enter" || e.key === " ") {
        const selectedText = getSelectedText();
        if (selectedText) {
          const newText = await getReplacementText(selectedText);

          if (newText && newText.trim() !== "") {
            replaceSelectedText(newText);
          }
        }
      }
    };

    document.addEventListener("mouseup", mouseupListener);
    document.addEventListener("keyup", keyupListener);
  }

  function disableTextRewrite() {
    if (mouseupListener) {
      if (throttledMouseoverHandler) {
        document.removeEventListener("mouseover", throttledMouseoverHandler);
      }

      tooltip.style.display = "none";
      document.removeEventListener("mouseup", mouseupListener);
      mouseupListener = null;
      throttledMouseoverHandler = null;
    }
    if (keyupListener) {
      document.removeEventListener("keyup", keyupListener);

      tooltip.style.display = "none";
      keyupListener = null;
      throttledMouseoverHandler = null;
    }
  }

  /**
   * Gets the currently selected text on the page.
   * @returns {string|null} The selected text or null if no text is selected.
   */
  function getSelectedText() {
    const selection = window.getSelection();
    return selection && selection.rangeCount > 0 ? selection.toString() : null;
  }

  /**
   * Replaces the selected text in the document with the provided new text.
   * @param {string} newText - The text to replace the selected text with.
   */
  function replaceSelectedText(newText) {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(newText));
      selection.removeAllRanges();
    }
  }

  const textRewrite = getElementByIdFromShadowOrDocument(
    "text-rewriter-switch",
    shadowRoot
  );

  const textSummarizer = getElementByIdFromShadowOrDocument(
    "text-summarizer-switch",
    shadowRoot
  );

  const textWriter = getElementByIdFromShadowOrDocument(
    "text-writer-switch",
    shadowRoot
  );

  function handleSwitchChange(event) {
    const currentSwitch = event.target;
    const otherSwitches = shadowRoot.querySelectorAll(".toggle-switch");

    if (currentSwitch.checked) {
      otherSwitches.forEach((switchElement) => {
        if (switchElement !== currentSwitch) {
          switchElement.disabled = true;
        }
      });
    } else {
      otherSwitches.forEach((switchElement) => {
        switchElement.disabled = false;
      });
    }
  }

  textRewrite.addEventListener("change", (event) => {
    handleSwitchChange(event);
    const enable = event.target.checked;
    toggleTextRewrite(enable, getReplacementText);
  });

  textSummarizer.addEventListener("change", (event) => {
    handleSwitchChange(event);
    const enable = event.target.checked;
    const isSummarizer = true;
    toggleTextRewrite(enable, getReplacementText, isSummarizer);
  });

  textWriter.addEventListener("change", (event) => {
    handleSwitchChange(event);
    const enable = event.target.checked;
    const isSummarizer = false;
    const isWriter = true;
    toggleTextRewrite(enable, getReplacementText, isSummarizer, isWriter);
  });

  const featureSwitch = getElementByIdFromShadowOrDocument(
    "text-picker-switch",
    shadowRoot
  );

  featureSwitch.addEventListener("change", (event) => {
    handleSwitchChange(event);
    isFeatureEnabled = event.target.checked;
    toggleFeature();
  });

  const enableFeature = () => {
    tooltip.textContent = "Click to Quote to Chat";
    throttledMouseoverHandler = throttle((event) => {
      const hoveredElement = event.target;
      const hoveredText = hoveredElement.innerText?.trim();

      if (hoveredText) {
        applyHighlight(hoveredElement);
        updateTooltipPosition(event);

        hoveredElement.addEventListener(
          "click",
          function handleClick(e) {
            e.preventDefault();
            e.stopPropagation();

            if (!isFeatureEnabled) {
              hoveredElement.removeEventListener("click", handleClick);
              return;
            }

            copyToClipboard(hoveredText, hoveredElement);
            removeHighlight(hoveredElement);

            hoveredElement.removeEventListener("click", handleClick);
          },
          { once: true }
        );
      }
    }, 200);

    document.addEventListener("mouseover", throttledMouseoverHandler);
    console.log("Feature enabled.");
  };

  const disableFeature = () => {
    if (throttledMouseoverHandler) {
      document.removeEventListener("mouseover", throttledMouseoverHandler);
      throttledMouseoverHandler = null;
    }
    console.log("Feature disabled.");
  };

  const toggleFeature = () => {
    if (isFeatureEnabled) {
      enableFeature();
    } else {
      disableFeature();
    }
  };

  toggleFeature();

  document.addEventListener("mouseout", (event) => {
    const hoveredElement = event.target;
    removeHighlight(hoveredElement);
    tooltip.style.display = "none";
  });

  document.addEventListener("mousemove", (event) => {
    if (tooltip.style.display === "block") {
      updateTooltipPosition(event);
    }
  });

  function getElementByIdFromShadowOrDocument(id, shadowRoot = null) {
    if (shadowRoot) {
      return shadowRoot.getElementById(id) || null;
    }
    return document.getElementById(id);
  }
})();
