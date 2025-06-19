const API = 'https://note-maker-backend-ioqg.onrender.com/api';

async function login(email, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();

  if (res.ok) {
    const expirationTime = Date.now() + 7 * 24 * 60 * 60 * 1000; 
    await chrome.storage.local.set({ token: data.token, tokenExpiration: expirationTime });
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('main-section').style.display = 'block';
    fetchTopics();
  } else {
    alert(data.message);
  }
}

async function checkSession() {
  const { token, tokenExpiration } = await chrome.storage.local.get(['token', 'tokenExpiration']);
  if (token && tokenExpiration && Date.now() < tokenExpiration) {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('main-section').style.display = 'block';
    fetchTopics();
  } else {
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('main-section').style.display = 'none';
    await chrome.storage.local.remove(['token', 'tokenExpiration']); // Clear expired session
  }
}

async function fetchTopics() {
  const { token, selectedTopicId } = await chrome.storage.local.get(['token', 'selectedTopicId']);
  const res = await fetch(`${API}/topics`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const topics = await res.json();

  const select = document.getElementById('topicList');
  select.innerHTML = '';

  topics.forEach(topic => {
    const opt = document.createElement('option');
    opt.value = topic._id;
    opt.innerText = topic.title;
    select.appendChild(opt);
  });

  if (topics.length > 0) {
    const validSelected = topics.find(t => t._id === selectedTopicId);
    const currentId = validSelected ? selectedTopicId : topics[0]._id;
    select.value = currentId;
    await chrome.storage.local.set({ selectedTopicId: currentId });
    fetchNotesForTopic(currentId);
  } else {
    document.getElementById('notesList').innerHTML = '<p>No topics available.</p>';
  }
}

async function fetchNotesForTopic(topicId) {
  const { token } = await chrome.storage.local.get('token');
  const res = await fetch(`${API}/topics/${topicId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const topic = await res.json();

  const notesDiv = document.getElementById('notesList');
  notesDiv.innerHTML = '';

  if (topic.notes && topic.notes.length > 0) {
    topic.notes.forEach(note => {
      const p = document.createElement('p');
      p.textContent = note;
      notesDiv.appendChild(p);
    });
  } else {
    notesDiv.innerHTML = '<p>No notes yet.</p>';
  }
}

document.addEventListener('DOMContentLoaded', checkSession);

document.getElementById('topicList').onchange = async (e) => {
  const topicId = e.target.value;
  await chrome.storage.local.set({ selectedTopicId: topicId });
  fetchNotesForTopic(topicId);
};

document.getElementById('loginBtn').onclick = () => {
  const email = document.getElementById('email').value;
  const pass = document.getElementById('password').value;
  login(email, pass);
};

document.getElementById('createTopicBtn').onclick = async () => {
  const title = document.getElementById('newTopic').value;
  if (!title) return alert("Please enter a topic title.");
  const { token } = await chrome.storage.local.get('token');

  const res = await fetch(`${API}/topics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ title })
  });

  if (res.ok) {
    document.getElementById('newTopic').value = '';
    fetchTopics();
  } else {
    const err = await res.json();
    alert(err.message || 'Failed to create topic.');
  }
};

document.getElementById('refreshBtn').onclick = fetchTopics;

document.getElementById('improveBtn').onclick = async () => {
  const { token } = await chrome.storage.local.get('token');
  const { selectedTopicId } = await chrome.storage.local.get('selectedTopicId');

  try {
    const res = await fetch(`https://note-maker-ai-service.onrender.com/improve/${selectedTopicId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();

    if (res.ok) {
      alert(data.message || 'Topic improved successfully!');
      await fetchNotesForTopic(selectedTopicId); 
    } else {
      alert(data.message || 'AI improvement failed.');
    }
  } catch (err) {
    console.error('Improvement error:', err);
    alert('An error occurred while improving the notes.');
  }
};


