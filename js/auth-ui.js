document.addEventListener("DOMContentLoaded", updateHeaderAuth);

async function updateHeaderAuth() {
  const guestActions = document.getElementById("guest-actions");
  const userActions = document.getElementById("user-actions");
  const headerLogoutBtn = document.getElementById("header-logout-btn");

  const headerAvatar = document.getElementById("header-avatar");
  const headerAvatarImage = document.getElementById("header-avatar-image");
  const adminDropdownLink = document.getElementById("admin-dropdown-link");

  if (!guestActions || !userActions) return;

  const { data, error } = await supabaseClient.auth.getUser();
  const user = data?.user;

  if (error || !user) {
    guestActions.classList.remove("hidden");
    userActions.classList.add("hidden");
    if (adminDropdownLink) adminDropdownLink.classList.add("hidden");
    return;
  }

  guestActions.classList.add("hidden");
  userActions.classList.remove("hidden");

  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("name, avatar, role")
    .eq("id", user.id)
    .single();

  if (profile?.avatar && headerAvatarImage) {
    headerAvatarImage.src = profile.avatar;
    headerAvatarImage.classList.remove("hidden");
    if (headerAvatar) headerAvatar.classList.add("hidden");
  } else if (headerAvatar) {
    const source = (profile?.name || user.email || "U").trim();
    headerAvatar.textContent = source.charAt(0).toUpperCase();
    headerAvatar.classList.remove("hidden");
    if (headerAvatarImage) headerAvatarImage.classList.add("hidden");
  }

  if (profile?.role === "admin") {
    if (adminDropdownLink) adminDropdownLink.classList.remove("hidden");
  } else {
    if (adminDropdownLink) adminDropdownLink.classList.add("hidden");
  }

  if (headerLogoutBtn) {
    headerLogoutBtn.onclick = async () => {
      await supabaseClient.auth.signOut();
      window.location.href = "index.html";
    };
  }
}