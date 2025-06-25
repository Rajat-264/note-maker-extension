const API = 'https://note-maker-backend-ecxb.onrender.com/api';

document.addEventListener('DOMContentLoaded', () => {
  checkSession();
  setEventListeners();
});

function setEventListeners() {
  document.getElementById('loginBtn').onclick = handleLogin;
  document.getElementById('createTopicBtn').onclick = createTopic;
  document.getElementById('refreshBtn').onclick = fetchTopics;
  document.getElementById('topicList').onchange = onTopicChange;
  document.getElementById('improveBtn').onclick = improveTopic;
  document.getElementById('acceptBtn').onclick = acceptChanges;
  document.getElementById('rejectBtn').onclick = rejectChanges;
}

async function handleLogin() {
  const email = document.getElementById('email').value.trim();
  const pass = document.getElementById('password').value.trim();

  if (!email || !pass) {
    alert("Please enter email and password.");
    return;
  }

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });

    const data = await res.json();

    if (res.ok) {
      const expirationTime = Date.now() + 7 * 24 * 60 * 60 * 1000;
      await chrome.storage.local.set({ token: data.token, tokenExpiration: expirationTime });
      toggleAuth(true);
      fetchTopics();
    } else {
      alert(data.message || 'Login failed.');
    }
  } catch (err) {
    console.error('Login error:', err);
    alert("Network error during login.");
  }
}

async function checkSession() {
  const { token, tokenExpiration } = await chrome.storage.local.get(['token', 'tokenExpiration']);
  const validSession = token && tokenExpiration && Date.now() < tokenExpiration;

  toggleAuth(validSession);

  if (validSession) {
    fetchTopics();
  } else {
    await chrome.storage.local.remove(['token', 'tokenExpiration']);
  }
}

function toggleAuth(loggedIn) {
  document.getElementById('auth-section').style.display = loggedIn ? 'none' : 'block';
  document.getElementById('main-section').style.display = loggedIn ? 'block' : 'none';
}

async function fetchTopics() {
  const { token, selectedTopicId } = await chrome.storage.local.get(['token', 'selectedTopicId']);

  try {
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

  } catch (err) {
    console.error('Fetch topics error:', err);
    alert("Failed to load topics.");
  }
}

async function fetchNotesForTopic(topicId) {
  const { token } = await chrome.storage.local.get('token');

  try {
    const res = await fetch(`${API}/topics/${topicId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const topic = await res.json();
    const notesDiv = document.getElementById('notesList');
    notesDiv.innerHTML = '';

    if (Array.isArray(topic.notes) && topic.notes.length > 0) {
      topic.notes.forEach(note => {
        const p = document.createElement('p');
        p.textContent = note.content || '[Empty Note]';
        notesDiv.appendChild(p);
      });
    } else {
      notesDiv.innerHTML = '<p>No notes yet.</p>';
    }
  } catch (err) {
    console.error('Fetch notes error:', err);
    alert("Could not load notes.");
  }
}

async function createTopic() {
  const title = document.getElementById('newTopic').value.trim();
  if (!title) return alert("Please enter a topic title.");

  const { token } = await chrome.storage.local.get('token');

  try {
    const res = await fetch(`${API}/topics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ title })
    });

    if (res.ok) {
      document.getElementById('newTopic').value = '';
      fetchTopics();
    } else {
      const err = await res.json();
      alert(err.message || 'Failed to create topic.');
    }
  } catch (err) {
    console.error('Create topic error:', err);
    alert("Network error during topic creation.");
  }
}

async function improveTopic() {
  const { token, selectedTopicId } = await chrome.storage.local.get(['token','selectedTopicId']);
  const mode = document.getElementById('aiMode').value;
  try {
    const res = await fetch(`https://note-maker-ai-service.onrender.com/improve/enhance/${selectedTopicId}?mode=${mode}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    const { originalNotes, improvedNotes, message } = await res.json();
    if (res.ok) {
      document.getElementById('originalContent').textContent = originalNotes.map(n => typeof n === 'string' ? n : n.content).join('\n\n');
      document.getElementById('improvedContent').textContent = improvedNotes.map(n => typeof n === 'string' ? n : n.content).join('\n\n');

      document.getElementById('aiCompareSection').style.display = 'block';
    } else alert(message || 'AI failed');
  } catch (err) { console.error(err); alert('Network error during AI'); }
}

async function acceptChanges() {
  const id = document.getElementById('aiMode').value;
  const { token, selectedTopicId } = await chrome.storage.local.get(['token','selectedTopicId']);
  const improved = document.getElementById('improvedContent').textContent = improvedNotes.map(n => typeof n === 'string' ? n : n.content).join('\n\n');

  const notesArray = improved.map(txt => ({ id: crypto.randomUUID(), content: txt }));
  const res = await fetch(`${API}/topics/${selectedTopicId}/updateNotes`, {
    method:'PUT',
    headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
    body: JSON.stringify({ notes: notesArray })
  });
  if (res.ok) fetchNotesForTopic(selectedTopicId);
  document.getElementById('aiCompareSection').style.display = 'none';
}

function rejectChanges() {
  document.getElementById('aiCompareSection').style.display = 'none';
}


async function onTopicChange(e) {
  const topicId = e.target.value;
  await chrome.storage.local.set({ selectedTopicId: topicId });
  fetchNotesForTopic(topicId);
}
