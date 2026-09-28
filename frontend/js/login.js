// js/login.js
// Talks to POST /api/auth/login instead of redirecting blindly.

document.getElementById("loginForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const username = document.getElementById("email").value.trim(); // accepts email or username
  const password = document.getElementById("password").value.trim();
  const errorBox = document.getElementById("errorMessage");
  const button = document.querySelector('button[type="submit"]');

  if (errorBox) errorBox.textContent = '';

  if (!username || !password) {
    if (errorBox) errorBox.textContent = "Please fill in all fields.";
    return;
  }

  const originalText = button.textContent;
  button.textContent = "Logging in...";
  button.disabled = true;

  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    setSession(data.token, data.user);
    window.location.href = "idea.html";
  } catch (err) {
    if (errorBox) errorBox.textContent = err.message;
    button.textContent = originalText;
    button.disabled = false;
  }
});
