// js/idea.js
// Main "Ideas" page: post an idea, search/filter, vote, comment.
// Previously this all lived in localStorage (so ideas only existed in your
// own browser and vanished if you cleared it). It now talks to the real
// backend API (/api/ideas), so ideas are shared across everyone using the
// app and persist in the SQL database.

const ideaForm = document.getElementById("ideaForm");
const ideaList = document.getElementById("ideaList");
const yourIdeasList = document.getElementById("yourIdeasList");
const searchInput = document.getElementById("searchInput");
const languageFilter = document.getElementById("languageFilter");
const difficultyFilter = document.getElementById("difficultyFilter");
const themeToggle = document.getElementById("themeToggle");
const voiceSearchBtn = document.getElementById("voiceSearchBtn");
const voiceTitleBtn = document.getElementById("voiceTitleBtn");
const voiceDescBtn = document.getElementById("voiceDescBtn");

// Speech Recognition setup (unchanged from original - browser feature, no backend needed)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
}
let isRecording = false;

document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
  }

  setupEventListeners();
  loadAndDisplayIdeas();
}

function setupEventListeners() {
  ideaForm.addEventListener("submit", handleFormSubmit);

  if (themeToggle) themeToggle.addEventListener("click", toggleTheme);

  [searchInput, languageFilter, difficultyFilter].forEach(input => {
    if (!input) return;
    input.addEventListener("input", debounce(loadAndDisplayIdeas, 300));
  });

  if (voiceSearchBtn) {
    if (recognition) voiceSearchBtn.addEventListener("click", toggleVoiceSearch);
    else voiceSearchBtn.style.display = 'none';
  }
  if (voiceTitleBtn) {
    if (recognition) voiceTitleBtn.addEventListener("click", () => startVoiceInput('title'));
    else voiceTitleBtn.style.display = 'none';
  }
  if (voiceDescBtn) {
    if (recognition) voiceDescBtn.addEventListener("click", () => startVoiceInput('description'));
    else voiceDescBtn.style.display = 'none';
  }
}

// Small helper so we don't fire an API request on every single keystroke
// while searching.
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ---------------------------------------------------------------------
// Voice input (unchanged logic from the original prototype)
// ---------------------------------------------------------------------
function toggleVoiceSearch() {
  if (isRecording) stopRecording();
  else startRecording('search');
}

function startRecording(target) {
  if (!recognition) {
    showNotification('Speech recognition not supported in your browser', 'error');
    return;
  }
  isRecording = true;
  const button = target === 'search' ? voiceSearchBtn :
                target === 'title' ? voiceTitleBtn : voiceDescBtn;
  button.classList.add('recording');

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    if (target === 'search') {
      searchInput.value = transcript;
      loadAndDisplayIdeas();
    } else {
      document.getElementById(target).value = transcript;
    }
  };
  recognition.onerror = (event) => {
    showNotification('Error occurred in recognition: ' + event.error, 'error');
    stopRecording();
  };
  recognition.onend = () => stopRecording();
  recognition.start();
}

function stopRecording() {
  isRecording = false;
  [voiceSearchBtn, voiceTitleBtn, voiceDescBtn].forEach(b => b && b.classList.remove('recording'));
}

function startVoiceInput(target) {
  if (isRecording) { stopRecording(); return; }
  startRecording(target);
}

// ---------------------------------------------------------------------
// Posting an idea - now a real POST request to the database
// ---------------------------------------------------------------------
async function handleFormSubmit(e) {
  e.preventDefault();

  const nickname = document.getElementById("nickname").value.trim();
  const title = document.getElementById("title").value.trim();
  const description = document.getElementById("description").value.trim();
  const language = document.getElementById("language").value;
  const tags = document.getElementById("tags").value.split(",").map(t => t.trim()).filter(Boolean);
  const difficulty = document.getElementById("difficulty").value;

  if (!title || !description || !difficulty) {
    showNotification("Please fill in all required fields.", "error");
    return;
  }
  if (title.length > 150) {
    showNotification("Title must be 150 characters or fewer.", "error");
    return;
  }
  if (description.length > 3000) {
    showNotification("Description must be 3000 characters or fewer.", "error");
    return;
  }

  const submitBtn = ideaForm.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  try {
    // If the user typed a nickname but isn't logged in, we still post it
    // anonymously (nickname is just a display label in that case, not a
    // real account) - only a logged-in user can post non-anonymously.
    await apiFetch('/ideas', {
      method: 'POST',
      body: JSON.stringify({
        title,
        description: tags.length ? `${description}\n\nTech: ${tags.join(', ')}` : description,
        language: language || null,
        difficulty,
        postAnonymously: !isLoggedIn() ? true : (nickname ? false : true)
      })
    });

    showNotification("Idea submitted successfully!", "success");
    ideaForm.reset();
    loadAndDisplayIdeas();
  } catch (err) {
    showNotification(err.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

// ---------------------------------------------------------------------
// Loading + rendering ideas from the API (replaces the old localStorage
// read + client-side filtering)
// ---------------------------------------------------------------------
async function loadAndDisplayIdeas() {
  const params = new URLSearchParams();
  if (searchInput && searchInput.value.trim()) params.set('q', searchInput.value.trim());
  if (languageFilter && languageFilter.value) params.set('language', languageFilter.value);
  if (difficultyFilter && difficultyFilter.value) params.set('difficulty', difficultyFilter.value);

  try {
    const ideas = await apiFetch(`/ideas?${params.toString()}`);
    renderIdeaList(ideaList, ideas, "No ideas yet. Be the first to share!");

    const mine = ideas.filter(i => i.is_mine);
    renderIdeaList(yourIdeasList, mine, "Your submitted ideas will appear here (log in to track them).");
  } catch (err) {
    ideaList.innerHTML = `<p class="empty-state">Couldn't load ideas: ${escapeHtml(err.message)}</p>`;
  }
}

function renderIdeaList(container, ideas, emptyMessage) {
  if (!ideas || ideas.length === 0) {
    container.innerHTML = `<p>${emptyMessage}</p>`;
    return;
  }

  container.innerHTML = ideas.map(idea => `
    <div class="idea-card" data-id="${idea.id}">
      <h3>${escapeHtml(idea.title)}</h3>
      <p>${escapeHtml(idea.description)}</p>
      <div class="idea-meta">
        <span>👤 ${escapeHtml(idea.author)}</span>
        ${idea.language ? `<span>🏷️ ${escapeHtml(idea.language)}</span>` : ''}
        ${idea.difficulty ? `<span>📊 ${escapeHtml(idea.difficulty)}</span>` : ''}
        <span>🕒 ${new Date(idea.created_at).toLocaleDateString()}</span>
      </div>
      <div class="idea-actions">
        <button class="upvote-btn ${idea.voted_by_me ? 'voted' : ''}" onclick="handleVote(${idea.id})">
          👍 <span class="vote-count">${idea.vote_count}</span>
        </button>
        <button class="comment-btn" onclick="toggleComments(${idea.id})">
          💬 ${idea.comment_count}
        </button>
      </div>
      <div class="comments-section" id="comments-${idea.id}" style="display:none;"></div>
    </div>
  `).join('');
}

async function handleVote(ideaId) {
  if (!isLoggedIn()) {
    showNotification("Please log in to vote on ideas.", "error");
    return;
  }
  try {
    await apiFetch(`/ideas/${ideaId}/vote`, { method: 'POST' });
    loadAndDisplayIdeas();
  } catch (err) {
    showNotification(err.message, "error");
  }
}

async function toggleComments(ideaId) {
  const section = document.getElementById(`comments-${ideaId}`);
  if (section.style.display === 'block') {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  section.innerHTML = '<p>Loading comments...</p>';

  try {
    const idea = await apiFetch(`/ideas/${ideaId}`);
    section.innerHTML = `
      <div class="comments-list">
        ${idea.comments.map(c => `
          <div class="comment">
            <strong>${escapeHtml(c.author)}:</strong> ${escapeHtml(c.text)}
          </div>
        `).join('') || '<p>No comments yet.</p>'}
      </div>
      <form class="comment-form" onsubmit="return handleCommentSubmit(event, ${ideaId})">
        <input type="text" class="comment-input" placeholder="Add a comment..." required maxlength="500" />
        <button type="submit">Post</button>
      </form>
    `;
  } catch (err) {
    section.innerHTML = `<p>Couldn't load comments: ${escapeHtml(err.message)}</p>`;
  }
}

async function handleCommentSubmit(e, ideaId) {
  e.preventDefault();
  const input = e.target.querySelector('input');
  const text = input.value.trim();
  if (!text) return false;

  try {
    await apiFetch(`/ideas/${ideaId}/comment`, {
      method: 'POST',
      body: JSON.stringify({ text })
    });
    input.value = '';
    toggleComments(ideaId); // close
    toggleComments(ideaId); // reopen with fresh data
    loadAndDisplayIdeas(); // refresh comment counts
  } catch (err) {
    showNotification(err.message, "error");
  }
  return false;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function toggleTheme() {
  document.body.classList.toggle("dark-mode");
  const isDark = document.body.classList.contains("dark-mode");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  themeToggle.innerHTML = isDark
    ? '<i class="fas fa-sun"></i> Light Mode'
    : '<i class="fas fa-moon"></i> Dark Mode';
}

function showNotification(message, type = "info") {
  let notification = document.getElementById("notification");
  if (!notification) {
    notification = document.createElement("div");
    notification.id = "notification";
    document.body.appendChild(notification);
  }
  notification.textContent = message;
  notification.className = `notification ${type} show`;
  setTimeout(() => notification.classList.remove("show"), 3000);
}
