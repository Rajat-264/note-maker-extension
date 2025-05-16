document.addEventListener('keydown', async (e) => {
  if (e.ctrlKey && e.altKey && e.key === 's') {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText.length === 0) return;

    const topicId = await chrome.storage.local.get('selectedTopicId');
    const token = await chrome.storage.local.get('token');

    if (!topicId.selectedTopicId || !token.token) return;

    const response = await fetch('http://localhost:5000/api/topics/' + topicId.selectedTopicId + '/notes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.token}`
      },
      body: JSON.stringify({ content: selectedText })
    });

    const result = await response.json();
    if (response.ok) {
      alert('Text saved successfully!');
    } else {
      alert('Error: ' + result.message);
    }
  }
});
