// js/signup.js
// Talks to POST /api/auth/signup instead of just redirecting.

document.getElementById("signupForm").addEventListener("submit", async function (e) {
  e.preventDefault();
  const username = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorBox = document.getElementById("errorMessage");
  const button = document.querySelector('button[type="submit"]');

  if (errorBox) errorBox.textContent = '';

  if (!username || !email || !password) {
    if (errorBox) errorBox.textContent = "Please fill in all fields.";
    else alert("Please fill in all fields.");
    return;
  }

  const originalHTML = button.innerHTML;
  button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  button.disabled = true;

  try {
    const data = await apiFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });
    setSession(data.token, data.user);
    window.location.href = "idea.html";
  } catch (err) {
    if (errorBox) errorBox.textContent = err.message;
    else alert(err.message);
    button.innerHTML = originalHTML;
    button.disabled = false;
  }
});

// Password toggle functionality (unchanged from original)
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');
if (togglePassword && passwordInput) {
  togglePassword.addEventListener('click', function() {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    this.classList.toggle('fa-eye-slash');
  });
}
