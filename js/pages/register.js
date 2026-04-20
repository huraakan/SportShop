const burger = document.getElementById("burger");
const nav = document.getElementById("nav");

if (burger && nav) {
  burger.addEventListener("click", () => {
    nav.classList.toggle("open");
  });
}

const registerForm = document.getElementById("register-form");
const registerMsg = document.getElementById("register-msg");
const registerBtn = document.getElementById("register-btn");

const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirm-password");

const togglePasswordBtn = document.getElementById("toggle-password");
const toggleConfirmPasswordBtn = document.getElementById("toggle-confirm-password");

const strength1 = document.getElementById("strength-1");
const strength2 = document.getElementById("strength-2");
const strength3 = document.getElementById("strength-3");
const strengthText = document.getElementById("strength-text");

function togglePasswordVisibility(button, input) {
  if (!button || !input) return;

  button.addEventListener("click", () => {
    input.type = input.type === "password" ? "text" : "password";
  });
}

togglePasswordVisibility(togglePasswordBtn, passwordInput);
togglePasswordVisibility(toggleConfirmPasswordBtn, confirmPasswordInput);

function showRegisterMessage(text, type = "") {
  registerMsg.textContent = text;
  registerMsg.className = `auth-message ${type}`;
}

function updateStrengthBars(level, text, type) {
  [strength1, strength2, strength3].forEach((el) => {
    el.className = "";
  });

  if (level >= 1) strength1.className = `active ${type}`;
  if (level >= 2) strength2.className = `active ${type}`;
  if (level >= 3) strength3.className = `active ${type}`;

  strengthText.textContent = text;
}

function checkPasswordStrength(password) {
  let score = 0;

  if (password.length >= 6) score++;
  if (/[A-ZА-Я]/.test(password) || /[a-zа-я]/.test(password) && /\d/.test(password)) score++;
  if (password.length >= 8 && /[^A-Za-zА-Яа-я0-9]/.test(password)) score++;

  if (!password) {
    updateStrengthBars(0, "Надёжность пароля", "");
    return;
  }

  if (score === 1) {
    updateStrengthBars(1, "Слабый пароль", "weak");
  } else if (score === 2) {
    updateStrengthBars(2, "Средний пароль", "medium");
  } else {
    updateStrengthBars(3, "Сильный пароль", "strong");
  }
}

passwordInput?.addEventListener("input", () => {
  checkPasswordStrength(passwordInput.value);
});

registerForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  const phone = document.getElementById("phone").value.trim();
  const age = document.getElementById("age").value;
  const country = document.getElementById("country").value.trim();
  const city = document.getElementById("city").value.trim();

  if (!name || !email || !password || !confirmPassword) {
    showRegisterMessage("Заполни обязательные поля.", "error");
    return;
  }

  if (password !== confirmPassword) {
    showRegisterMessage("Пароли не совпадают.", "error");
    return;
  }

  registerBtn.disabled = true;
  registerBtn.textContent = "Создаём аккаунт...";

  // 1. Регистрируем пользователя
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password
  });

  if (error) {
    showRegisterMessage(error.message, "error");
    registerBtn.disabled = false;
    registerBtn.textContent = "Создать аккаунт";
    return;
  }

  const user = data.user;

  // 2. Добавляем профиль
  if (user) {
    await supabaseClient.from("profiles").insert([
      {
        id: user.id,
        name,
        phone,
        age: age ? Number(age) : null,
        country,
        city
      }
    ]);
  }

  showRegisterMessage("Аккаунт создан 🔥", "success");

  setTimeout(() => {
    window.location.href = "login.html";
  }, 1200);
});