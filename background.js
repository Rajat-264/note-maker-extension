chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed.");
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "copy_to_topic") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id },
          func: getSelectedText,
        },
        async (results) => {
          if (results && results[0] && results[0].result) {
            const selectedText = results[0].result;

            chrome.storage.local.get(["token", "selectedTopicId"], async (data) => {
  if (!data.token || !data.selectedTopicId) return;

  try {
    const response = await fetch("https://note-maker-backend-ecxb.onrender.com/api/topics/" + data.selectedTopicId + "/notes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.token}`,
      },
      body: JSON.stringify({
        content: selectedText,
      }),
    });

    const result = await response.json();
    if (response.ok) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon128.png",
        title: "Note Added",
        message: "Text successfully saved to the topic.",
      });
    } else {
      console.error("Error:", result.message);
    }
  } catch (error) {
    console.error("Request failed:", error);
  }
});

          }
        }
      );
    });
  }
});

function getSelectedText() {
  return window.getSelection().toString();
}
