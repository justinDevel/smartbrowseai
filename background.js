chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background received message:", request);

  try {
    if (request.type === "injectScript" && sender.tab) {
      chrome.scripting.executeScript(
        {
          target: { tabId: sender.tab.id },
          files: ["assets/marked.min.js"],
        },
        () => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
            sendResponse({ message: "Script injection failed!" });
          } else {
            console.log("Script injected successfully.");
            sendResponse({ message: "Script injected successfully!" });
          }
        }
      );
    } else if (request.type === "analyzePage") {
      handleAnalyzePage(request, sendResponse);
    } else if (request.type === "extractContent") {
      handleExtractContent(request, sendResponse);
    } else if (request.type === "rewriteContent") {
      handleRewriteContent(request, sendResponse);
    } else if (request.type === "writeContent") {
      handleWriteContent(request, sendResponse);
    } else if (request.type === "summarizeContent") {
      handleSummarizeContent(request, sendResponse);
    } else {
      console.warn("Unknown request type:", request.type);
      sendResponse({ success: false, error: "Unknown request type." });
    }
  } catch (error) {
    console.error("Error in background script:", error);
    sendResponse({ success: false, error: error.message });
  }

  return true;
});

/**
 * Handles the 'analyzePage' request.
 * @param {Object} request - The request object.
 * @param {Function} sendResponse - The function to send the response.
 */
async function handleAnalyzePage(request, sendResponse) {
  try {
    analyzePage(request.userQuery, request.embeddedTxt, request.pageContent)
      .then((modelResponse) => {
        console.log("modelResponse:", modelResponse);

        sendResponse({ success: true, response: modelResponse });
      })
      .catch((error) => {
        console.error("Error in analyzePage:", error);

        sendResponse({ success: false, error: error.message });
      });
  } catch (error) {
    console.error("Error in analyzePage:", error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handles the 'extractContent' request.
 * @param {Object} request - The request object.
 * @param {Function} sendResponse - The function to send the response.
 */
async function handleExtractContent(request, sendResponse) {
  try {
    summarizeContent(request.pageContent)
      .then((summary) => {
        console.log("backend summary:", summary);

        sendResponse({ success: true, response: summary });
      })
      .catch((error) => {
        console.error("Error in extractContent:", error);

        sendResponse({ success: false, error: error.message });
      });
  } catch (error) {
    console.error("Error in extractContent:", error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handles the 'summarizeContent' request.
 * @param {Object} request - The request object.
 * @param {Function} sendResponse - The function to send the response.
 */
async function handleSummarizeContent(request, sendResponse) {
  try {
    const defaultContext = "same length as the question/user input";
    summarizeResponse(request.userQuery, request.selectedText)
      .then((text) => {
        console.log("backend summarize:", text);

        sendResponse({ success: true, response: text });
      })
      .catch((error) => {
        console.error("Error in summarizeContent:", error);

        sendResponse({ success: false, error: error.message });
      });
  } catch (error) {
    console.error("Error in summarizeContent:", error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handles the 'writeContent' request.
 * @param {Object} request - The request object.
 * @param {Function} sendResponse - The function to send the response.
 */
async function handleWriteContent(request, sendResponse) {
  try {
    const defaultContext = "same length as the question/user input";
    writer(request.userQuery, request.selectedText)
      .then((text) => {
        console.log("backend rewrite:", text);

        sendResponse({ success: true, response: text });
      })
      .catch((error) => {
        console.error("Error in rewriteContent:", error);

        sendResponse({ success: false, error: error.message });
      });
  } catch (error) {
    console.error("Error in rewriteContent:", error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handles the 'rewriteContent' request.
 * @param {Object} request - The request object.
 * @param {Function} sendResponse - The function to send the response.
 */
async function handleRewriteContent(request, sendResponse) {
  try {
    rewrite("rewrite text proffessionaly", request.selectedText)
      .then((text) => {
        console.log("backend rewrite:", text);

        sendResponse({ success: true, response: text });
      })
      .catch((error) => {
        console.error("Error in rewriteContent:", error);

        sendResponse({ success: false, error: error.message });
      });
  } catch (error) {
    console.error("Error in rewriteContent:", error);
    sendResponse({ success: false, error: error.message });
  }
}

async function analyzePage(userQuery, embeddedTxt = "", pageContent) {
  console.log("pageContent " + JSON.stringify(pageContent.webData));
  let prompt = "";
  prompt = `
  **STRICT**: Do not mention any internal variable names, placeholders, code terms, or raw data structures in your responses. Be a professional customer service representative.

You are a customer service representative for websites especially  online stores. Your role is to assist customers by providing helpful, professional, and friendly responses to their inquiries about products available in the store.

The information about the website can be summarized from below:
meta data ${String(
    pageContent.title || pageContent.metaDescription || ""
  )} | ${String(pageContent.metaDescription || pageContent.title || "")}
 .You also have access to a product list derived from the website. Customers may ask questions about this list, and your job is to provide responses based solely on the information provided. Never mention or expose technical terms like 'webData,' 'metaDescription,' or any other internal variables.

 If webData List is empty then ignore products related info 
The product list includes the following information:
${String(JSON.stringify(pageContent.webData))}

When answering questions, your responses must be:
1. Clear, polite, and customer-friendly.
2. Focused on the product's or website's (determine from above) details like specifications, price, availability, etc ..., and usage.
3. Limited to the  provided meta data information get the context from ${String(
    pageContent.title || pageContent.metaDescription || ""
  )} | ${String(pageContent.metaDescription || pageContent.title || "")}.

**strickt: refine responses**
If insufficient information is available, respond with: "I don't have enough information about that."

### Example Interaction:

**Customer:** "What is the price of Product 2?"
**Response:** "Product 2 is priced at $20, but unfortunately, it's currently out of stock. Would you like to be notified when it becomes available?"

**Customer:** "Tell me about the products in Category 1."
**Response:** "Category 1 includes items like Product 1, which is priced at $10. It is currently available and perfect for [brief description]."

**Customer:** "What is this website about?"
**Response:** "[Provide a summary derived from the website meta description in a professional and natural tone.]"

Your goal is to replicate the professionalism of a website's customer service team. Avoid mentioning terms like 'product list,' 'metaDescription,' or 'webData,' and focus solely on providing accurate and engaging responses based on the given information.
**strickt: return plain-text format only**
`;

  if (embeddedTxt && embeddedTxt.trim() !== "") {
    prompt = `use the following data to answer the upcoming questions : ${embeddedTxt.trim()}`;

    console.log("Ai prompt" + prompt);
  }

  console.log("original prompt" + prompt);
  console.log("pageContent:: " + pageContent);

  const session = await ai.languageModel.create({
    format: "plain-text",
    systemPrompt: prompt,
  });

  console.log("userQuery " + userQuery);
  const promptAi = await session.prompt(userQuery);

  console.log("raw promptAi response " + promptAi);

  return promptAi;
}

async function rewrite(context, content) {
  console.log("rewrite:: called");
  const rewriter = await ai.rewriter.create({
    tone: "as-is",
    format: "plain-text",
    // length: 'shorter',
    //  sharedContext: context,
  });

  const result = await rewriter.rewrite(content, {
    context: context,
  });

  console.log("rewrite result:: " + result);
  return result;
}

async function writer(context, input) {
  console.log("rewrite:: called");
  const writer = await ai.writer.create({
    tone: "as-is",
    format: "plain-text",
    length: "shorter",
    //  sharedContext: context,
  });

  const result = await writer.write(input, {
    context: context,
  });

  console.log("writer result:: " + result);

  return result;
}

async function translator(text) {
  const translator = await ai.translator.create({
    sourceLanguage: "en",
    targetLanguage: "ar",
  });

  const result = await translator.translate(text);

  console.log(result);

  return result;
}

async function forwardToContentScript(message) {
  const tabs = await getActiveTab();
  if (tabs.length > 0) {
    chrome.tabs.sendMessage(tabs[0].id, message);
  }
}

function getActiveTab() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve(tabs);
    });
  });
}

async function summarizeResponse(context, input) {
  try {
    const capabilities = await ai.summarizer.capabilities();

    if (!capabilities || capabilities.available === "no") {
      throw new Error("Summarizer is not available");
    }

    const options = {
      type: "tl;dr",
      format: "plain-text",
      length: "medium",
    };

    let summarizer;

    if (capabilities.available === "readily") {
      summarizer = await ai.summarizer.create(options);
    } else {
      summarizer = await ai.summarizer.create(options);
      summarizer.addEventListener("downloadprogress", (e) => {
        console.log("Summarizer download progress:", e.loaded, e.total);
      });
      await summarizer.ready;
    }

    console.log("Summarizer capabilities:", capabilities);
    console.log("Summarizer instance:", summarizer);
    console.log("Page content for summarization:", input);

    console.log("User Picked Text:: " + input);
    let summaryData = await summarizer.summarize(input, {
      context: context,
    });

    return summaryData;
  } catch (error) {
    console.error("Error during summarization:", error);
    throw new Error("Failed to summarize content");
  }
}

async function summarizeContent(pageContent) {
  try {
    const capabilities = await ai.summarizer.capabilities();

    if (!capabilities || capabilities.available === "no") {
      throw new Error("Summarizer is not available");
    }

    // const options = { type: "key-points", format: "plain-text" };
    let options = {
      type: "tl;dr",
      format: "plain-text",
      length: "short",
      sharedContext: "Provide a quick, high-level overview of the content",
    };
    console.log("isUserPicked:: " + pageContent.isUserPicked);

    if (pageContent.isUserPicked) {
      console.log("isUserPicked:: " + pageContent.isUserPicked);
      options = {
        type: "tl;dr",
        format: "plain-text",
        length: "medium",
        sharedContext:
          "E-commerce product or website's descriptions with specifications and highlights",
      };
    }
    let summarizer;

    if (capabilities.available === "readily") {
      summarizer = await ai.summarizer.create(options);
    } else {
      summarizer = await ai.summarizer.create(options);
      summarizer.addEventListener("downloadprogress", (e) => {
        console.log("Summarizer download progress:", e.loaded, e.total);
      });
      await summarizer.ready;
    }

    console.log("Summarizer capabilities:", capabilities);
    console.log("Summarizer instance:", summarizer);
    console.log("Page content for summarization:", pageContent);

    const userPrompt = `
    **Strict**: Do not return phrases like "The text does not specify..." or any placeholders such as "generate the website name here". Be professional.
    Act as the website's  ${
      pageContent.title
    } customer service and provide a concise, informative summary without any additional greetings or placeholders.
    Extract only the clear, readable summary from the following content, focusing on the product's name, description, and relevant details.
    Remove any encrypted data, tokens, or irrelevant elements such as IDs or non-human-readable information.
    Ensure that the summary is concise, professional, and easy to understand, without additional phrases or vague statements.
    
    Content: ${pageContent.title} | ${JSON.stringify(
      pageContent.metaDescription
    )}
  `;

    const summeryContext = `${pageContent.title} | ${JSON.stringify(
      pageContent.metaDescription
    )} | ${JSON.stringify(pageContent.metaKeywords)}`;
    let summaryData = await summarizer.summarize(summeryContext, {
      context: userPrompt,
    });

    if (pageContent.userPicked) {
      console.log("User Picked Text:: " + pageContent.userPicked);
      summaryData = await summarizer.summarize(
        `${pageContent.title} | ${pageContent.userPicked}`,
        { context: userPrompt }
      );
    }

    return summaryData;
  } catch (error) {
    console.error("Error during summarization:", error);
    throw new Error("Failed to summarize content");
  }
}
