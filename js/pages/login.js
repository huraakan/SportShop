const burger = document.getElementById("burger");
const nav = document.getElementById("nav");

if (burger && nav) {
  burger.addEventListener("click", () => {
    nav.classList.toggle("open");
  });
}

const loginForm = document.getElementById("login-form");
const loginMsg = document.getElementById("login-msg");
const loginBtn = document.getElementById("login-btn");
const togglePasswordBtn = document.getElementById("toggle-password");
const passwordInput = document.getElementById("password");

if (togglePasswordBtn && passwordInput) {
  togglePasswordBtn.addEventListener("click", () => {
    passwordInput.type = passwordInput.type === "password" ? "text" : "password";
  });
}

function showLoginMessage(text, type = "") {
  loginMsg.textContent = text;
  loginMsg.className = `auth-message ${type}`;
}

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showLoginMessage("Заполни все поля.", "error");
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = "Входим...";

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showLoginMessage(error.message, "error");
    loginBtn.disabled = false;
    loginBtn.textContent = "Войти";
    return;
  }

  showLoginMessage("Успешный вход. Перенаправляем...", "success");

  setTimeout(() => {
    window.location.href = "index.html";
  }, 900);
});