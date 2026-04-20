let currentUser = null;
const burger = document.getElementById("burger");
const nav = document.getElementById("nav");

if (burger && nav) {
  burger.addEventListener("click", () => {
    nav.classList.toggle("open");
  });
}

const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get("id");

const titleEl = document.getElementById("product-title");
const categoryEl = document.getElementById("product-category");
const imageEl = document.getElementById("product-image");
const priceEl = document.getElementById("product-price");
const oldPriceEl = document.getElementById("product-old-price");
const stockEl = document.getElementById("product-stock");

const flavorOptionsEl = document.getElementById("flavor-options");
const weightOptionsEl = document.getElementById("weight-options");
const tabContentEl = document.getElementById("product-tab-content");
const addToCartBtn = document.getElementById("add-to-cart-btn");
const cartCount = document.getElementById("cart-count");

let currentProduct = null;
let allVariants = [];
let selectedFlavor = null;
let selectedWeight = null;
let selectedVariant = null;
let currentTab = "description";

function formatPrice(value) {
  return new Intl.NumberFormat("ru-RU").format(Number(value || 0)) + " ₸";
}

function categoryLabel(category) {
  const map = {
    whey: "Протеин",
    creatine: "Креатин",
    preworkout: "Предтрен",
    vitamins: "Витамины",
    gainer: "Гейнер",
    fatburner: "Жиросжигатель"
  };

  return map[category] || category || "Товар";
}

 function getCart() {
  const raw = JSON.parse(localStorage.getItem("cart")) || [];

  return raw
    .map((item) => ({
      variantId: Number(item.variantId),
      qty: Number(item.qty) || 0
    }))
    .filter((item) => item.variantId > 0 && item.qty > 0);
}

function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

function updateCartCount() {
  const cart = getCart();
  const total = cart.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

  if (cartCount) {
    cartCount.textContent = total;
  }
}

function renderFavoriteButton() {
  if (!favoriteBtn) return;

  if (isFavorite) {
    favoriteBtn.textContent = "❤️ В закладках";
    favoriteBtn.classList.add("active");
  } else {
    favoriteBtn.textContent = "♡ В закладки";
    favoriteBtn.classList.remove("active");
  }
}

async function loadFavoriteState() {
  if (!favoriteBtn || !currentUser || !productId) {
    isFavorite = false;
    renderFavoriteButton();
    return;
  }

  const { data, error } = await supabaseClient
    .from("favorites")
    .select("id")
    .eq("product_id", Number(productId))
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.error("Ошибка проверки избранного:", error);
    isFavorite = false;
    renderFavoriteButton();
    return;
  }

  isFavorite = !!data;
  renderFavoriteButton();
}

async function toggleFavorite() {
  if (!currentUser) {
    showToast("Нужно войти", "error");
    return;
  }

  if (!productId) {
    showToast("Товар не найден", "error");
    return;
  }

  const { data: existing, error: checkError } = await supabaseClient
    .from("favorites")
    .select("id")
    .eq("product_id", Number(productId))
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (checkError) {
    console.error("Ошибка проверки закладок:", checkError);
    showToast("Не удалось обновить закладки", "error");
    return;
  }

  if (existing) {
    const { error: deleteError } = await supabaseClient
      .from("favorites")
      .delete()
      .eq("id", existing.id);

    if (deleteError) {
      console.error("Ошибка удаления из закладок:", deleteError);
      showToast("Не удалось удалить из закладок", "error");
      return;
    }

    isFavorite = false;
    renderFavoriteButton();
    showToast("Удалено из закладок", "success");
    return;
  }

  const { error: insertError } = await supabaseClient
    .from("favorites")
    .insert({
      product_id: Number(productId),
      user_id: currentUser.id
    });

  if (insertError) {
    console.error("Ошибка добавления в закладки:", insertError);
    showToast("Не удалось добавить в закладки", "error");
    return;
  }

  isFavorite = true;
  renderFavoriteButton();
  showToast("Добавлено в закладки", "success");
}

addToCartBtn?.addEventListener("click", () => {
  if (!selectedVariant?.id) {
   showToast("Выбери вариант товара", "error");
    return;
  }

favoriteBtn?.addEventListener("click", async () => {
  await toggleFavorite();
});

  let cart = getCart();

  const existing = cart.find(
    (item) => Number(item.variantId) === Number(selectedVariant.id)
  );

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      variantId: Number(selectedVariant.id),
      qty: 1
    });
  }

  saveCart(cart);
  updateCartCount();

  console.log("CART AFTER ADD:", cart);
  showToast("Товар добавлен в корзину", "success");
});

function renderTabs() {
  if (!currentProduct) return;

  const tabData = {
    description: currentProduct.description || "Описание пока не добавлено.",
    composition: currentProduct.composition || "Состав пока не добавлен.",
    usage: currentProduct.usage || "Способ применения пока не добавлен.",
    safety: currentProduct.safety || "Информация по безопасности пока не добавлена."
  };

  const reviewsTab = document.getElementById("reviews-tab");

  if (currentTab === "reviews") {
    tabContentEl.textContent = "";
    if (reviewsTab) reviewsTab.style.display = "block";
  } else {
    tabContentEl.textContent = tabData[currentTab] || "";
    if (reviewsTab) reviewsTab.style.display = "none";
  }
}

function setActiveTabButton() {
  document.querySelectorAll(".product-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === currentTab);
  });
}

function renderWeightOptions() {
  weightOptionsEl.innerHTML = "";

  const availableWeights = allVariants.filter((variant) => variant.flavor === selectedFlavor);

  availableWeights.forEach((variant) => {
    const btn = document.createElement("button");
    btn.className = "product-option-btn";
    btn.type = "button";
    btn.textContent = variant.weight || "Без веса";

    if (variant.weight === selectedWeight) {
      btn.classList.add("active");
    }

    btn.addEventListener("click", () => {
      selectedWeight = variant.weight;
      selectedVariant = allVariants.find(
        (item) => item.flavor === selectedFlavor && item.weight === selectedWeight
      );

      renderWeightOptions();
      renderCurrentVariant();
    });

    weightOptionsEl.appendChild(btn);
  });
}

function renderFlavorOptions() {
  flavorOptionsEl.innerHTML = "";

  const uniqueFlavors = [...new Set(allVariants.map((variant) => variant.flavor || "Без вкуса"))];

  uniqueFlavors.forEach((flavor) => {
    const btn = document.createElement("button");
    btn.className = "product-option-btn";
    btn.type = "button";
    btn.textContent = flavor;

    if (flavor === selectedFlavor) {
      btn.classList.add("active");
    }

    btn.addEventListener("click", () => {
      selectedFlavor = flavor;

      const weightsForFlavor = allVariants.filter((variant) => variant.flavor === flavor);
      selectedWeight = weightsForFlavor[0]?.weight || null;
      selectedVariant = weightsForFlavor[0] || null;

      renderFlavorOptions();
      renderWeightOptions();
      renderCurrentVariant();
    });

    flavorOptionsEl.appendChild(btn);
  });
}

function renderCurrentVariant() {
  if (!selectedVariant) return;

  imageEl.src = selectedVariant.image && selectedVariant.image.trim()
    ? selectedVariant.image
    : "images/home/product-1.png";

  priceEl.textContent = formatPrice(selectedVariant.price);

  if (selectedVariant.old_price) {
    oldPriceEl.textContent = formatPrice(selectedVariant.old_price);
    oldPriceEl.style.display = "inline";
  } else {
    oldPriceEl.textContent = "";
    oldPriceEl.style.display = "none";
  }

  stockEl.textContent = `В наличии: ${selectedVariant.stock ?? 0}`;
}

async function loadProductPage() {
    const { data } = await supabaseClient.auth.getUser();
currentUser = data?.user || null;
  if (!productId) {
    titleEl.textContent = "Товар не найден";
    return;
  }

  const { data: product, error: productError } = await supabaseClient
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  if (productError || !product) {
    console.error("Ошибка загрузки товара:", productError);
    titleEl.textContent = "Товар не найден";
    return;
  }

  const { data: variants, error: variantsError } = await supabaseClient
    .from("product_variants")
    .select("*")
    .eq("product_id", productId)
    .order("id", { ascending: true });

  if (variantsError) {
    console.error("Ошибка загрузки вариантов:", variantsError);
    titleEl.textContent = "Ошибка загрузки товара";
    return;
  }

  currentProduct = product;
  allVariants = variants || [];

  titleEl.textContent = product.name || "Товар";
  categoryEl.textContent = categoryLabel(product.category);

  if (!allVariants.length) {
    selectedVariant = null;
    imageEl.src = "images/home/product-1.png";
    priceEl.textContent = "0 ₸";
    oldPriceEl.textContent = "";
    stockEl.textContent = "Нет доступных вариантов";
    flavorOptionsEl.innerHTML = "<span style='color:#aaa;'>Нет вариантов</span>";
    weightOptionsEl.innerHTML = "";
    renderTabs();
    return;
  }

  selectedFlavor = allVariants[0].flavor || "Без вкуса";
  selectedWeight = allVariants[0].weight || null;
  selectedVariant = allVariants[0];

  renderFlavorOptions();
  renderWeightOptions();
  renderCurrentVariant();
  renderTabs();
  await loadFavoriteState();
}

document.querySelectorAll(".product-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    currentTab = btn.dataset.tab;
    setActiveTabButton();
    renderTabs();
  });
});

let selectedRating = 0;

const reviewStars = document.getElementById("review-stars");
const reviewForm = document.getElementById("review-form");
const reviewText = document.getElementById("review-text");
const reviewFormWrap = document.getElementById("review-form-wrap");
const reviewFormTitle = document.getElementById("review-form-title");
const reviewSubmitBtn = document.getElementById("review-submit-btn");
const openReviewFormBtn = document.getElementById("open-review-form-btn");

function updateStarsUI() {
  reviewStars.querySelectorAll("span").forEach((star) => {
    const value = Number(star.dataset.value);
    star.classList.toggle("active", value <= selectedRating);
  });
}

reviewStars?.addEventListener("click", (e) => {
  const value = e.target.dataset.value;
  if (!value) return;

  selectedRating = Number(value);
  updateStarsUI();
});

openReviewFormBtn?.addEventListener("click", () => {
  if (!currentUser) {
    showToast("Нужно войти", "error");
    return;
  }

  if (reviewFormWrap) {
    reviewFormWrap.style.display = "block";
  }

  if (reviewFormTitle) {
    reviewFormTitle.textContent = "Оставить отзыв";
  }

  if (reviewSubmitBtn) {
    reviewSubmitBtn.textContent = "Отправить";
  }

  if (reviewForm) {
    reviewForm.dataset.editId = "";
  }

  if (reviewText) {
    reviewText.value = "";
  }

  selectedRating = 0;
  updateStarsUI();
});

async function loadReviews() {
  if (!productId) return;

  const list = document.getElementById("reviews-list");
  const ratingEl = document.getElementById("reviews-rating");
  const countEl = document.getElementById("reviews-count");

  if (!list || !ratingEl || !countEl) {
    console.error("Не найдены элементы отзывов");
    return;
  }

  const { data, error } = await supabaseClient
    .from("reviews")
    .select(`
      *,
      profiles(name)
    `)
    .eq("product_id", productId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  list.innerHTML = "";

  if (!data.length) {
    ratingEl.textContent = "0.0";
    countEl.textContent = "(0)";
    list.innerHTML = "<div class='community-empty'>Пока нет отзывов</div>";

    if (openReviewFormBtn) {
      openReviewFormBtn.style.display = currentUser ? "inline-flex" : "none";
    }

    if (reviewFormWrap) {
      reviewFormWrap.style.display = "none";
    }

    return;
  }

  const avg = data.reduce((sum, r) => sum + Number(r.rating || 0), 0) / data.length;
  ratingEl.textContent = avg.toFixed(1);
  countEl.textContent = `(${data.length})`;

  data.forEach((review) => {
    const isMine = !!(currentUser && review.user_id === currentUser.id);

    if (isMine) {
      myReview = review;
    }

    const div = document.createElement("div");
    div.className = "review-item";

    div.innerHTML = `
      <strong>${review.profiles?.name || "Пользователь"}</strong>
      <div>${"⭐".repeat(review.rating)}</div>
      <p>${review.content || ""}</p>

      ${isMine ? `
        <div style="margin-top:8px; display:flex; gap:10px;">
          <button type="button" class="btn-small edit-review">Изменить</button>
          <button type="button" class="btn-small delete-review">Удалить</button>
        </div>
      ` : ""}
    `;

    div.querySelector(".edit-review")?.addEventListener("click", () => {
      if (!reviewForm || !reviewText) return;

      if (reviewFormWrap) {
        reviewFormWrap.style.display = "block";
      }

      if (reviewFormTitle) {
        reviewFormTitle.textContent = "Изменить отзыв";
      }

      if (reviewSubmitBtn) {
        reviewSubmitBtn.textContent = "Сохранить";
      }

      selectedRating = review.rating;
      reviewText.value = review.content || "";
      updateStarsUI();

      reviewForm.dataset.editId = review.id;
    });

    div.querySelector(".delete-review")?.addEventListener("click", async () => {
      const confirmed = confirm("Удалить отзыв?");
      if (!confirmed) return;

      const { error } = await supabaseClient
        .from("reviews")
        .delete()
        .eq("id", review.id);

      if (error) {
        console.error(error);
        showToast("Ошибка удаления отзыва", "error");
        return;
      }

      if (reviewForm) {
        reviewForm.dataset.editId = "";
      }

      if (reviewText) {
        reviewText.value = "";
      }

      selectedRating = 0;
      updateStarsUI();

      if (reviewFormWrap) {
        reviewFormWrap.style.display = "none";
      }

      if (reviewFormTitle) {
        reviewFormTitle.textContent = "Оставить отзыв";
      }

      if (reviewSubmitBtn) {
        reviewSubmitBtn.textContent = "Отправить";
      }

      await loadReviews();
    });

    list.appendChild(div);
  });

  if (openReviewFormBtn) {
    openReviewFormBtn.style.display = myReview ? "none" : (currentUser ? "inline-flex" : "none");
  }

  if (reviewFormWrap && !myReview) {
    reviewFormWrap.style.display = "none";

    showToast("Отзыв удалён", "success");
  }
}

reviewForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentUser) {
  showToast("Нужно войти", "error");
  return;
}

  if (!selectedRating) {
  showToast("Выбери рейтинг", "error");
  return;
}

  const content = reviewText.value.trim();

  if (!content) {
  showToast("Напиши отзыв", "error");
  return;
}

  const editId = reviewForm.dataset.editId;

  if (editId) {
    // ОБНОВЛЕНИЕ
    const { error } = await supabaseClient
      .from("reviews")
      .update({
        rating: selectedRating,
        content
      })
      .eq("id", editId);

    if (error) {
      console.error(error);
      showToast("Ошибка обновления отзыва", "error");
      return;
    }

  } else {
    // СОЗДАНИЕ
    const { error } = await supabaseClient
      .from("reviews")
      .insert({
        product_id: Number(productId),
        user_id: currentUser.id,
        rating: selectedRating,
        content
      });

    if (error) {
      console.error(error);
      showToast("Ошибка создания отзыва", "error");
      return;
    }
  }

  reviewForm.dataset.editId = "";
  reviewText.value = "";
  selectedRating = 0;
  updateStarsUI();

  if (reviewFormWrap) reviewFormWrap.style.display = "none";

  await loadReviews();
});

loadProductPage();
updateCartCount();
loadReviews(); // ВОТ ЭТО ВАЖНО
