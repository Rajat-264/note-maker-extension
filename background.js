// background.js
const API = 'https://note-maker-backend-ecxb.onrender.com/api';

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed.");
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "copy_to_topic") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id },
          func: () => window.getSelection().toString().trim(),
        },
        async (results) => {
          const selectedText = results[0]?.result;
          if (!selectedText) return;

          chrome.storage.local.get(["token", "selectedTopicId"], async (data) => {
            if (!data.token || !data.selectedTopicId) return;

            try {
              // Step 1: Get existing notes
              const topicRes = await fetch(`${API}/topics/${data.selectedTopicId}`, {
                headers: { Authorization: `Bearer ${data.token}` }
              });

              const topic = await topicRes.json();
              const existingNotes = Array.isArray(topic.notes) ? topic.notes : [];

              // Step 2: Append new note
              const newNote = {
                id: crypto.randomUUID(),
                content: selectedText
              };
              const updatedNotes = [...existingNotes, newNote];

              // Step 3: Save updated notes
              const response = await fetch(`${API}/topics/${data.selectedTopicId}/updateNotes`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${data.token}`
                },
                body: JSON.stringify({ notes: updatedNotes })
              });

              const result = await response.json();
              if (response.ok) {
                chrome.notifications.create({
                  type: "basic",
                  iconUrl: "icons/icon128.png",
                  title: "Note Added",
                  message: "Text successfully saved to the topic."
                });
              } else {
                console.error("Error:", result.message);
              }
            } catch (error) {
              console.error("Request failed:", error);
            }
          });
        }
      );
    });
  }
});
