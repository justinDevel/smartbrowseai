chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.type === "analyzePage") {
    (async () => {
      try {
        const modelResponse = await analyzePage(
          request.userQuery,
          request.pageContent
        );
        sendResponse({ success: true, data: { response: modelResponse } });

        await forwardToContentScript({
          type: "responseFromAI",
          success: true,
          data: modelResponse,
        });
      } catch (error) {
        console.error("Error in message listener:", error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  } else if (request.type === "extractContent") {
    (async () => {
      try {
        const summary = await summarizeContent(request.pageContent);
        console.log("summary:: " + summary);

        sendResponse({ success: true, data: { response: summary } });
        await forwardToContentScript({
          type: "summeryData",
          success: true,
          data: summary,
        });
      } catch (error) {
        console.error("Error in extractContent:", error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
});

async function analyzePage(userQuery, pageContent) {
  console.log("pageContent " + JSON.stringify(pageContent.webData));

  const prompt = `
  **strickt** do not mentioned any internal variable names , be proffessional customer service
You are a customer service representative for an online store. Your task is to provide helpful, professional, and friendly responses to customer inquiries regarding products in the store. You will be given a list of products (referred to as \`webData\`), and the customer may ask questions about the products. Your responses should be clear, concise, and based on the information available in \`webData\`.

Your goal is to assist customers in finding product details, prices, availability, and other relevant information. You must always respond politely and professionally, ensuring the customer feels valued. Please answer any questions the customer might have, such as product specifications, usage, price, and availability.

\`webData\` (list of products) is as follows:

${String(JSON.stringify(pageContent.webData))}

When a customer asks a question about products, respond using the product data in \`webData\` and provide the necessary details in a friendly and professional tone.

Example:

Customer: "Customer"
Response: "Product 1 is a great choice! It is priced at $10, and it's currently available in stock. It belongs to Category 1 and is perfect for [briefly describe use case or features]. Would you like to add it to your cart?"

Customer: "What is the price of Product 2?"
Response: "Product 2 is priced at $20, but unfortunately, it's currently out of stock. Would you like to be notified when it becomes available?"

Always ensure your responses are customer-friendly as it came from the website customer's service chat, polite, and clear. If you don't have enough information about a product or something else, return: "I don't have enough info about that" or return categories with details.
`;

  console.log("pageContent prompt" + prompt);
  const session = await ai.languageModel.create({
    systemPrompt: prompt,
  });
  return await session.prompt(userQuery);
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

async function summarizeContent(pageContent) {
  try {
    const capabilities = await ai.summarizer.capabilities();
    if (!capabilities || capabilities.available === "no") {
      throw new Error("Summarizer is not available");
    }
    const options = { type: "key-points", format: "plain-text" };
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

    const webPrompt = `
Analyze the  HTML content and return  website's purpose, main topic, and any additional relevant information:
The AI should infer the website's purpose and main focus based on the meta tags, title, and other available information within the <head> tag.
`;

    console.log("capabilities ::" + capabilities);
    console.log("summarizer:: " + JSON.stringify(summarizer));
    console.log("summarizer pageContent:: " + JSON.stringify(pageContent));

    const aa = `**strickt** Do not return stuff like 'The text does not specify etc ' be proffessional Act as the website's customer service like say ' Welcome to [website] Extract and return only the clear, readable summary from the following content. 
Remove any encrypted data, tokens, or any irrelevant elements such as IDs or non-human-readable information. 
Ensure that the returned summary is concise, informative, and easy to understand, without additional phrases like 'The text is' or similar. 
Avoid responses like 'The provided text does not specify' or 'provided text etc ..' or other vague statements. Instead, provide a direct, professional summary of the context as it came from the website customer's service chat. 
Here is the content: ${
      pageContent.title + "|" + JSON.stringify(pageContent.metaDescription)
    }`;

    const summaryData = await summarizer.summarize(
      pageContent.title +
        "|" +
        JSON.stringify(pageContent.metaDescription) +
        "|" +
        JSON.stringify(pageContent.metaKeywords),
      {
        context: aa,
        // context:
        //   "Identify the CMS from the head and return it ,  then resolve any proper links with title and return them afterwards organize the prompt for AI understanding only real Json response with relevant keys",
      }
    );

    return summaryData;
  } catch (error) {
    console.error("Error during summarization:", error);
    throw new Error("Failed to summarize content");
  }
}
