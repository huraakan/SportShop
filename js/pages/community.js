const burger = document.getElementById("burger");
const nav = document.getElementById("nav");

if (burger && nav) {
  burger.addEventListener("click", () => {
    nav.classList.toggle("open");
  });
}

const communityTitle = document.getElementById("community-title");
const communitySubtitle = document.getElementById("community-subtitle");
const communityCountryName = document.getElementById("community-country-name");
const communityUserName = document.getElementById("community-user-name");

const communityPostsCount = document.getElementById("posts-count");
const communityPosts = document.getElementById("community-posts");
const communityCategories = document.getElementById("community-categories");

const createPostForm = document.getElementById("create-post-form");
const createPostMessage = document.getElementById("create-post-message");
const createPostCountryBadge = document.getElementById("create-post-country-badge");

const postCategory = document.getElementById("post-category");
const postContent = document.getElementById("post-content");
const postImageUrl = document.getElementById("post-image");

const statPosts = document.getElementById("stat-posts");
const statCountry = document.getElementById("stat-country");

let currentUser = null;
let currentProfile = null;
let allCategories = [];
let allPosts = [];
let selectedCategory = "all";
let communityChannel = null;

function formatDate(value) {
  try {
    return new Date(value).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return value || "";
  }
}

function escapeHtml(text = "") {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setCreatePostMessage(text = "", type = "") {
  if (!createPostMessage) return;

  createPostMessage.textContent = text;
  createPostMessage.classList.remove("success", "error");

  if (type) {
    createPostMessage.classList.add(type);
  }
}

async function updateCartCount() {
  const raw = JSON.parse(localStorage.getItem("cart")) || [];
  const total = raw.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const cartCount = document.getElementById("cart-count");

  if (cartCount) {
    cartCount.textContent = total;
  }
}

function updateStats(filteredPostsCount = allPosts.length) {
  if (communityPostsCount) {
    communityPostsCount.textContent = `Постов: ${filteredPostsCount}`;
  }

  if (statPosts) {
    statPosts.textContent = String(allPosts.length);
  }

  if (statCountry) {
    statCountry.textContent = currentProfile?.country_name || "—";
  }

  if (createPostCountryBadge) {
    createPostCountryBadge.textContent = currentProfile?.country_name || "—";
  }
}

function getVisibleCategories() {
  return (allCategories || []).filter((category) => category?.slug && category.slug !== "all");
}

function renderCategories() {
  if (!communityCategories) return;

  const visibleCategories = getVisibleCategories();
  communityCategories.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.className = `community-category ${selectedCategory === "all" ? "active" : ""}`;
  allBtn.dataset.category = "all";
  allBtn.textContent = "Все посты";
  allBtn.addEventListener("click", () => {
    selectedCategory = "all";
    renderCategories();
    renderPosts();
  });
  communityCategories.appendChild(allBtn);

  visibleCategories.forEach((category) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `community-category ${selectedCategory === category.slug ? "active" : ""}`;
    btn.dataset.category = category.slug;
    btn.textContent = category.name;

    btn.addEventListener("click", () => {
      selectedCategory = category.slug;
      renderCategories();
      renderPosts();
    });

    communityCategories.appendChild(btn);
  });

  if (postCategory) {
    postCategory.innerHTML = "";

    visibleCategories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category.slug;
      option.textContent = category.name;
      postCategory.appendChild(option);
    });
  }
}

async function fetchComments(postId) {
  const { data, error } = await supabaseClient
    .from("community_comments")
    .select(`
      *,
      profiles(name)
    `)
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Ошибка загрузки комментариев:", error);
    return [];
  }

  return data || [];
}

async function userLikedPost(postId) {
  if (!currentUser) return false;

  const { data, error } = await supabaseClient
    .from("community_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.error("Ошибка проверки лайка:", error);
    return false;
  }

  return !!data;
}

async function toggleLike(postId) {
  if (!currentUser) {
    showToast("Сначала войди в аккаунт", "error");
    return;
  }

  const { data: existing, error: existingError } = await supabaseClient
    .from("community_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (existingError) {
    console.error("Ошибка лайка:", existingError);
    showToast("Не удалось обработать лайк", "error");
    return;
  }

  if (existing) {
    const { error } = await supabaseClient
      .from("community_likes")
      .delete()
      .eq("id", existing.id);

    if (error) {
      console.error("Ошибка удаления лайка:", error);
      showToast("Не удалось убрать лайк", "error");
      return;
    }

    showToast("Лайк убран", "info");
  } else {
    const { error } = await supabaseClient
      .from("community_likes")
      .insert([
        {
          post_id: postId,
          user_id: currentUser.id
        }
      ]);

    if (error) {
      console.error("Ошибка добавления лайка:", error);
      showToast("Не удалось поставить лайк", "error");
      return;
    }

    showToast("Лайк поставлен", "success");
  }

  await loadPosts();
}

async function addComment(postId, content) {
  if (!currentUser) {
    showToast("Сначала войди в аккаунт", "error");
    return;
  }

  const text = content.trim();
  if (!text) {
    showToast("Напиши комментарий", "error");
    return;
  }

  const { error } = await supabaseClient
    .from("community_comments")
    .insert([
      {
        post_id: postId,
        user_id: currentUser.id,
        content: text
      }
    ]);

  if (error) {
    console.error("Ошибка добавления комментария:", error);
    showToast("Не удалось добавить комментарий", "error");
    return;
  }

  showToast("Комментарий добавлен", "success");
  await loadPosts();
}

async function deletePost(postId) {
  if (!currentUser) return;

  const confirmed = confirm("Удалить пост?");
  if (!confirmed) return;

  const { error } = await supabaseClient
    .from("community_posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", currentUser.id);

  if (error) {
    console.error("Ошибка удаления поста:", error);
    showToast("Не удалось удалить пост", "error");
    return;
  }

  showToast("Пост удалён", "success");
  allPosts = allPosts.filter((post) => Number(post.id) !== Number(postId));
  renderPosts();
}

async function editPost(postId, oldContent) {
  if (!currentUser) return;

  const newContent = prompt("Измени текст поста:", oldContent);

  if (!newContent || !newContent.trim()) return;

  const { error } = await supabaseClient
    .from("community_posts")
    .update({ content: newContent.trim() })
    .eq("id", postId)
    .eq("user_id", currentUser.id);

  if (error) {
    console.error("Ошибка редактирования поста:", error);
    showToast("Не удалось обновить пост", "error");
    return;
  }

  showToast("Пост обновлён", "success");

  const target = allPosts.find((post) => Number(post.id) === Number(postId));
  if (target) {
    target.content = newContent.trim();
  }

  renderPosts();
}

async function sharePost(authorName, content) {
  const shareText = `${authorName}: ${content}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: "Пост SportShop",
        text: shareText
      });
      return;
    } catch {
      return;
    }
  }

  try {
    await navigator.clipboard.writeText(shareText);
    showToast("Текст поста скопирован", "success");
  } catch (error) {
    console.error("Ошибка шаринга:", error);
    showToast("Не удалось поделиться постом", "error");
  }
}

async function renderPosts() {
  if (!communityPosts) return;

  let filtered = [...allPosts];

  if (selectedCategory !== "all") {
    filtered = filtered.filter((post) => post.category_slug === selectedCategory);
  }

  updateStats(filtered.length);

  if (!filtered.length) {
    communityPosts.innerHTML = `<div class="community-empty">Постов пока нет. Будь первым.</div>`;
    return;
  }

  communityPosts.innerHTML = "";

  for (const post of filtered) {
    const article = document.createElement("article");
    article.className = "community-post";

    const liked = await userLikedPost(post.id);
    const comments = await fetchComments(post.id);

    const category = allCategories.find((cat) => cat.slug === post.category_slug);
    const authorName = post.profiles?.name || "Пользователь";
    const canManagePost = !!(currentUser && post.user_id === currentUser.id);

    const imageHtml = post.image_url
      ? `
        <div class="community-post-image-wrap">
          <img src="${escapeHtml(post.image_url)}" alt="post image">
        </div>
      `
      : "";

    article.innerHTML = `
      <div class="community-post-top">
        <div class="community-post-author">
          <strong>${escapeHtml(authorName)}</strong>
          <span>${formatDate(post.created_at)}</span>
        </div>

        <div class="community-post-top-right">
          <span class="community-post-category">${escapeHtml(category?.name || post.category_slug || "Без категории")}</span>

          ${canManagePost ? `
            <div class="post-menu">
              <button type="button" class="post-menu-toggle">⋯</button>
              <div class="post-menu-dropdown">
                <button type="button" class="post-menu-item edit-post-btn">Редактировать</button>
                <button type="button" class="post-menu-item share-post-btn">Поделиться</button>
                <button type="button" class="post-menu-item danger delete-post-btn">Удалить</button>
              </div>
            </div>
          ` : ""}
        </div>
      </div>

      <p class="community-post-content">${escapeHtml(post.content || "")}</p>

      ${imageHtml}

      <div class="community-post-actions">
        <button type="button" class="community-small-btn like-btn ${liked ? "active" : ""}">
          ❤️ ${Number(post.likes_count || 0)}
        </button>

        <button type="button" class="community-small-btn comments-count-btn">
          💬 ${comments.length}
        </button>
      </div>

      <div class="community-comments">
        ${comments.map((comment) => `
          <div class="community-comment">
            <strong>${escapeHtml(comment.profiles?.name || "Пользователь")}</strong>
            <p>${escapeHtml(comment.content || "")}</p>
          </div>
        `).join("")}

        <form class="community-comment-form">
          <input type="text" placeholder="Написать комментарий...">
          <button type="submit" class="community-small-btn">Отправить</button>
        </form>
      </div>
    `;

    article.querySelector(".like-btn")?.addEventListener("click", () => {
      toggleLike(post.id);
    });

    article.querySelector(".community-comment-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = e.currentTarget.querySelector("input");
      const value = input?.value || "";

      await addComment(post.id, value);

      if (input) {
        input.value = "";
      }
    });

    const menu = article.querySelector(".post-menu");
    const menuToggle = article.querySelector(".post-menu-toggle");

    menuToggle?.addEventListener("click", (e) => {
      e.stopPropagation();

      document.querySelectorAll(".post-menu.open").forEach((item) => {
        if (item !== menu) {
          item.classList.remove("open");
        }
      });

      menu?.classList.toggle("open");
    });

    article.querySelector(".delete-post-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      deletePost(post.id);
    });

    article.querySelector(".edit-post-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      editPost(post.id, post.content || "");
    });

    article.querySelector(".share-post-btn")?.addEventListener("click", async (e) => {
      e.stopPropagation();
      await sharePost(authorName, post.content || "");
    });

    communityPosts.appendChild(article);
  }
}

async function loadCategories() {
  const { data, error } = await supabaseClient
    .from("community_categories")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("Ошибка загрузки категорий:", error);
    return;
  }

  allCategories = data || [];
  renderCategories();
}

async function loadProfile() {
  const { data, error } = await supabaseClient.auth.getUser();
  currentUser = data?.user || null;

  if (error || !currentUser) {
    if (communityTitle) {
      communityTitle.textContent = "Сообщество";
    }

    if (communitySubtitle) {
      communitySubtitle.textContent = "Сначала войди в аккаунт, чтобы увидеть свою локальную ленту.";
    }

    if (communityCountryName) {
      communityCountryName.textContent = "—";
    }

    if (communityUserName) {
      communityUserName.textContent = "Гость";
    }

    if (communityPosts) {
      communityPosts.innerHTML = `<div class="community-empty">Нужно войти в аккаунт.</div>`;
    }

    updateStats(0);
    return false;
  }

  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("name, country_code, country_name")
    .eq("id", currentUser.id)
    .single();

  if (profileError || !profile) {
    console.error("Ошибка профиля:", profileError);

    if (communityPosts) {
      communityPosts.innerHTML = `<div class="community-empty">Профиль не найден.</div>`;
    }

    return false;
  }

  currentProfile = profile;

  if (communityTitle) {
    communityTitle.textContent = `Сообщество ${profile.country_name || ""}`.trim();
  }

  if (communitySubtitle) {
    communitySubtitle.textContent = `Посты и обсуждения только для страны: ${profile.country_name || "—"}`;
  }

  if (communityCountryName) {
    communityCountryName.textContent = profile.country_name || "—";
  }

  if (communityUserName) {
    communityUserName.textContent = profile.name || "Пользователь";
  }

  updateStats(allPosts.length);
  return true;
}

async function loadPosts() {
  if (!currentProfile?.country_code) {
    if (communityPosts) {
      communityPosts.innerHTML = `<div class="community-empty">У профиля не указана страна.</div>`;
    }

    updateStats(0);
    return;
  }

  const { data, error } = await supabaseClient
    .from("community_posts")
    .select(`
      *,
      profiles(name)
    `)
    .eq("country_code", currentProfile.country_code)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Ошибка загрузки постов:", error);

    if (communityPosts) {
      communityPosts.innerHTML = `<div class="community-empty">Не удалось загрузить посты.</div>`;
    }

    updateStats(0);
    return;
  }

  allPosts = data || [];
  await renderPosts();
}

createPostForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  setCreatePostMessage("", "");

  if (!currentUser || !currentProfile) {
    showToast("Сначала войди в аккаунт", "error");
    return;
  }

  if (!currentProfile?.country_code) {
    showToast("У профиля не указана страна", "error");
    return;
  }

  if (!postCategory?.value || postCategory.value === "all") {
    showToast("Выбери категорию", "error");
    return;
  }

  const content = postContent?.value?.trim() || "";
  const imageUrl = postImageUrl?.value?.trim() || null;

  if (!content) {
    showToast("Напиши текст поста", "error");
    return;
  }

  const payload = {
    user_id: currentUser.id,
    country_code: currentProfile.country_code,
    category_slug: postCategory.value,
    content,
    image_url: imageUrl
  };

  const { error } = await supabaseClient
    .from("community_posts")
    .insert([payload]);

  if (error) {
    console.error("Ошибка создания поста:", error);
    setCreatePostMessage("Не удалось опубликовать пост", "error");
    showToast("Не удалось опубликовать пост", "error");
    return;
  }

  createPostForm.reset();
  setCreatePostMessage("Пост опубликован", "success");
  showToast("Пост опубликован", "success");
  await loadPosts();
});

document.addEventListener("click", () => {
  document.querySelectorAll(".post-menu.open").forEach((item) => {
    item.classList.remove("open");
  });
});

function setupCommunityRealtime() {
  if (communityChannel) {
    supabaseClient.removeChannel(communityChannel);
  }

  communityChannel = supabaseClient
    .channel("community-realtime")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "community_posts"
      },
      () => {
        loadPosts();
      }
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "community_comments"
      },
      () => {
        loadPosts();
      }
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "community_likes"
      },
      () => {
        loadPosts();
      }
    )
    .subscribe((status) => {
      console.log("Realtime:", status);
    });
}

(async () => {
  await updateCartCount();
  await loadCategories();
  const ok = await loadProfile();
  if (!ok) return;

  await loadPosts();
  setupCommunityRealtime();
})();