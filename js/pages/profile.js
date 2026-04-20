const burger = document.getElementById("burger");
const nav = document.getElementById("nav");

if (burger && nav) {
  burger.addEventListener("click", () => {
    nav.classList.toggle("open");
  });
}

const editBtn = document.getElementById("edit-btn");
const logoutBtn = document.getElementById("logout-btn");
const cancelBtn = document.getElementById("cancel-btn");
const editForm = document.getElementById("edit-form");
const viewMode = document.getElementById("view-mode");
const profileMessage = document.getElementById("profile-message");

let currentUser = null;
let currentProfile = null;

function showProfileMessage(text, type = "") {
  profileMessage.textContent = text;
  profileMessage.className = `profile-message ${type}`;
}

function setAvatarLetter(name, email) {
  const avatar = document.getElementById("avatar-circle");
  const source = (name || email || "U").trim();
  avatar.textContent = source.charAt(0).toUpperCase();
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function fillView(profile, user) {
  setText("profile-name", profile?.name || user?.user_metadata?.name || "Пользователь");
  setText("profile-email", user?.email || "—");

  setText("view-name", profile?.name || "—");
  setText("view-email", user?.email || "—");
  setText("view-phone", profile?.phone || "—");
  setText("view-age", profile?.age ?? "—");
  setText("view-country", profile?.country || "—");
  setText("view-city", profile?.city || "—");
  setText("view-bio", profile?.bio || "—");

  setAvatar(profile, user);
}

function fillForm(profile) {
  document.getElementById("name").value = profile?.name || "";
  document.getElementById("phone").value = profile?.phone || "";
  document.getElementById("age").value = profile?.age ?? "";
  document.getElementById("country").value = profile?.country || "";
  document.getElementById("city").value = profile?.city || "";
  document.getElementById("bio").value = profile?.bio || "";
}

function openEditMode() {
  viewMode.classList.add("hidden");
  editForm.classList.remove("hidden");
  fillForm(currentProfile);
  showProfileMessage("");
}

function closeEditMode() {
  editForm.classList.add("hidden");
  viewMode.classList.remove("hidden");
  showProfileMessage("");
}

async function loadProfile() {
  const { data: authData, error: authError } = await supabaseClient.auth.getUser();

  if (authError || !authData?.user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = authData.user;

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Ошибка загрузки профиля:", error);
  }

  currentProfile = data || {
    id: currentUser.id,
    name: currentUser.user_metadata?.name || "",
    phone: "",
    age: null,
    country: "",
    city: "",
    role: "user"
  };

  fillView(currentProfile, currentUser);
  fillForm(currentProfile);
}

editBtn?.addEventListener("click", openEditMode);
cancelBtn?.addEventListener("click", closeEditMode);

logoutBtn?.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
});

editForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentUser) return;

  const updatedProfile = {
  id: currentUser.id,
  name: document.getElementById("name").value.trim(),
  phone: document.getElementById("phone").value.trim(),
  age: document.getElementById("age").value ? Number(document.getElementById("age").value) : null,
  country: document.getElementById("country").value.trim(),
  city: document.getElementById("city").value.trim(),
  bio: document.getElementById("bio").value.trim()
};

  const { data, error } = await supabaseClient
  .from("profiles")
  .update(updatedProfile)
  .eq("id", currentUser.id)
  .select()
  .single();

  if (error) {
  console.error("Ошибка сохранения профиля:", error);
  showProfileMessage(
    `${error.message || "Ошибка"} ${error.details || ""} ${error.hint || ""}`,
    "error"
  );
  return;
}

  currentProfile = data;
  fillView(currentProfile, currentUser);
  closeEditMode();
  await loadStats();
  await loadMyPosts();
});

loadProfile();

const avatarInput = document.getElementById("avatar-input");

function setAvatar(profile, user) {
  const avatarText = document.getElementById("avatar-circle");
  const avatarImage = document.getElementById("avatar-image");

  if (profile?.avatar) {
    avatarImage.src = profile.avatar;
    avatarImage.classList.remove("hidden");
    avatarText.classList.add("hidden");
  } else {
    avatarImage.classList.add("hidden");
    avatarText.classList.remove("hidden");

    const source = (profile?.name || user?.email || "U").trim();
    avatarText.textContent = source.charAt(0).toUpperCase();
  }
}

avatarInput?.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file || !currentUser) return;

  const fileExt = file.name.split(".").pop();
  const filePath = `${currentUser.id}.${fileExt}`;

  const { error: uploadError } = await supabaseClient.storage
    .from("avatars")
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    console.error("Ошибка загрузки аватарки:", uploadError);
    showProfileMessage(uploadError.message || "Ошибка загрузки", "error");
    return;
  }

  const { data } = supabaseClient.storage
    .from("avatars")
    .getPublicUrl(filePath);

  const avatarUrl = data.publicUrl;

  const { data: updatedProfile, error: updateError } = await supabaseClient
    .from("profiles")
    .update({ avatar: avatarUrl })
    .eq("id", currentUser.id)
    .select()
    .single();

  if (updateError) {
    console.error("Ошибка сохранения аватарки:", updateError);
    showProfileMessage(updateError.message || "Не удалось сохранить аватарку.", "error");
    return;
  }

  currentProfile = updatedProfile;
  fillView(currentProfile, currentUser);

  if (typeof updateHeaderAuth === "function") {
    updateHeaderAuth();
  }

  showProfileMessage("Аватарка обновлена.", "success");
});

  async function loadStats() {
  if (!currentUser) return;

  // посты
  const { count: postsCount } = await supabaseClient
    .from("community_posts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", currentUser.id);

  // лайки
  const { count: likesCount } = await supabaseClient
    .from("community_likes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", currentUser.id);

  document.getElementById("stat-posts").textContent = postsCount || 0;
  document.getElementById("stat-likes").textContent = likesCount || 0;
}

async function loadMyPosts() {
  if (!currentUser) return;

  const { data, error } = await supabaseClient
    .from("community_posts")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  const container = document.getElementById("my-posts");
  container.innerHTML = "";

  if (!data.length) {
    container.innerHTML = `<div class="community-empty">У тебя пока нет постов</div>`;
    return;
  }

  data.forEach(post => {
    const div = document.createElement("div");
    div.className = "community-post";

    div.innerHTML = `
      <p>${post.content}</p>
      ${post.image_url ? `<img src="${post.image_url}" class="community-post-image">` : ""}
    `;

    container.appendChild(div);
  });
}