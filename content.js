document.addEventListener('keydown', async (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 's') {
    const selectedText = window.getSelection().toString().trim();
    if (!selectedText) return;

    const { selectedTopicId } = await chrome.storage.local.get('selectedTopicId');
    const { token } = await chrome.storage.local.get('token');

    if (!selectedTopicId || !token) return;

    try {
      const topicRes = await fetch(`https://note-maker-backend-ecxb.onrender.com/api/topics/${selectedTopicId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const topicData = await topicRes.json();
      const existingNotes = Array.isArray(topicData.notes) ? topicData.notes : [];

      const newNote = {
        id: crypto.randomUUID(),
        content: selectedText
      };
      const updatedNotes = [...existingNotes, newNote];

      const response = await fetch(`https://note-maker-backend-ecxb.onrender.com/api/topics/${selectedTopicId}/updateNotes`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notes: updatedNotes })
      });

      const result = await response.json();
      if (response.ok) {
        alert('Text saved successfully!');
      } else {
        alert('Error: ' + result.message);
      }
    } catch (err) {
      console.error('Failed to save note:', err);
      alert('Error saving note.');
    }
  }
});
