document.getElementById("analyze-button").addEventListener("click", () => {
    const userQuery = document.getElementById("user-query").value;
  
    chrome.runtime.sendMessage({ type: "analyzePage", userQuery }, (response) => {
      const responseDiv = document.getElementById("response");
      if (chrome.runtime.lastError) {
        console.error("Error:", chrome.runtime.lastError.message);
        responseDiv.innerText = "Error: Could not communicate with the background script.";
        return;
      }
  
      if (response.success) {
        responseDiv.innerText = response.data.response;
      } else {
        responseDiv.innerText = `Error: ${response.error}`;
      }
    });
  });
  