# SmartBrowseAI - Chrome Extension

SmartBrowseAI is a powerful Chrome extension that acts as an intelligent customer service assistant, automatically hooking itself to any website you visit. On e-commerce websites like Amazon, Walmart, and others, it provides real-time chat assistance, allowing users to inquire about products, compare items, and get product details.

## Key Features
- **Real-time Chat Assistance**: SmartBrowseAI hooks into any website you visit and offers an AI-powered chat box that users can interact with.
- **Product Queries**: On e-commerce sites like Amazon or Walmart, users can ask about specific products, including price, description, features, and availability.
- **Product Comparison**: Users can compare products side by side to make informed purchase decisions.
- **Auto-Response**: When users interact with the extension, it automatically pulls up relevant product details, descriptions, and compares items based on the user’s queries.
- **Seamless Integration**: No setup required from the user; the extension works automatically as soon as the user visits an e-commerce website.

## APIs Used
- **Prompt API**: Used to generate dynamic responses to user queries based on the context of the current webpage.
- **Summarization API**: Used to automatically summarize product descriptions and other relevant information when a webpage is loaded.

## Installation

To install and use SmartBrowseAI:

1. **Clone the repository** or download the extension code:
    ```bash
    git clone https://github.com/justinDevel/smartbrowseai.git
    ```

2. **Load the extension** in Chrome:
    - Go to `chrome://extensions/`.
    - Enable **Developer mode** at the top-right corner.
    - Click **Load unpacked** and select the folder containing the extension files.

3. **Enable the extension**:
    - Once installed, the SmartBrowseAI extension will automatically activate whenever you visit an e-commerce website or any other website with relevant content.

## Usage

1. **Visit an E-Commerce Website**:
   - Go to websites like Amazon, Walmart, Best Buy, etc.
   - Upon loading, SmartBrowseAI automatically activates and appears as a floating chat box.
   
2. **Interact with the Chat Assistant**:
   - Ask questions like:
     - "What is the price of this product?"
     - "Can you compare this item with another?"
     - "What are the features of this product?"
   - SmartBrowseAI will instantly fetch the relevant information from the page and respond in a conversational format.
   
3. **Get Product Descriptions and Comparisons**:
   - SmartBrowseAI can compare multiple products at once, providing descriptions, features, and prices side by side.

4. **Automatic Summarization**:
   - When a page loads, SmartBrowseAI automatically summarizes key product information, ensuring users get quick insights.

## Testing Instructions

1. **Install the extension** (follow the [installation instructions](#installation)).
2. **Navigate to E-commerce Websites** (e.g., Amazon, Walmart, etc.).
3. **Interact with the Chat**:
   - Open the chat assistant by clicking the extension icon.
   - Ask questions related to the product, such as:
     - "What is the price of this product?"
     - "Compare this product with another one."
4. **Check Real-Time Responses**:
   - Ensure that the assistant pulls accurate information based on the content of the webpage.
   - Test various products and different websites for consistency and reliability of responses.

## Features in Detail

### Chatbox Interaction
- **Product Details**: Ask for product name, price, features, and more.
- **Product Comparison**: Compare multiple products by asking the assistant to show differences in price, features, and availability.
- **Summerized websites**: Visit any website ask the assistant , it will summerize the whole idea of a website , document, product , and a lot more

### Seamless Integration
- **Automatic Activation**: The extension automatically detects when you visit any website and launches the chatbox.
- **Minimal User Effort**: No setup is needed—just install the extension and start chatting.

### Summarization
- **Page Summarization**: On page load, SmartBrowseAI extracts and displays relevant information from product listings or content on the page.

---
  
## What's Next
- **Enhanced Query Handling**: Improve the AI's ability to handle more complex queries and provide even more context-aware responses.
- **Customizable User Interface**: Allow users to adjust the look and feel of the chat assistant.

## License
This project is open-source and available under the MIT License. See the [LICENSE](LICENSE) file for more details.

## Demo Video

Watch the demo of SmartBrowseAI in action: [Link to YouTube or Vimeo Video].

## Feedback
We would love to hear your thoughts on the extension. Open an issue or leave feedback on the [GitHub Issues page](https://github.com/justinDevel/smartbrowseai/issues).

