// js/api.js
// Small shared helper so every page talks to the backend the same way.
// Since the backend now serves the frontend itself (see server.js),
// relative URLs like "/api/ideas" work whether you're running locally
// or on OCI - no hardcoded domain needed.

const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('ideaforge_token');
}

function setSession(token, user) {
  localStorage.setItem('ideaforge_token', token);
  localStorage.setItem('ideaforge_user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('ideaforge_token');
  localStorage.removeItem('ideaforge_user');
}

function getCurrentUser() {
  const raw = localStorage.getItem('ideaforge_user');
  return raw ? JSON.parse(raw) : null;
}

function isLoggedIn() {
  return !!getToken();
}

// Wraps fetch(): adds the API base URL, JSON headers, and the auth token
// (if logged in). Throws a plain Error with the server's message on
// non-2xx responses so callers can just try/catch.
async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}
