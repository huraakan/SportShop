const burger = document.getElementById("burger");
const nav = document.getElementById("nav");

if (burger && nav) {
  burger.addEventListener("click", () => {
    nav.classList.toggle("open");
  });
}

const productsGrid = document.getElementById("products-grid");
const productsFound = document.getElementById("products-found");
const emptyState = document.getElementById("empty-state");
const searchInput = document.getElementById("search");
const sortSelect = document.getElementById("sort");
const minPriceInput = document.getElementById("min-price");
const maxPriceInput = document.getElementById("max-price");
const clearFiltersBtn = document.getElementById("clear-filters");
const categoryButtons = document.querySelectorAll(".filter-chip");

let currentCategory = "all";
let allProducts = [];

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

function renderProducts(list) {
  productsGrid.innerHTML = "";
  productsFound.textContent = `Найдено: ${list.length}`;

  if (!list.length) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  list.forEach((product) => {
  const card = document.createElement("article");
  card.className = "product-card";

  const firstVariant = product.product_variants?.[0];

  const imageSrc = firstVariant?.image && firstVariant.image.trim()
    ? firstVariant.image
    : "images/home/product-1.png";

  const currentPrice = firstVariant?.price || 0;

  const oldPriceHtml = firstVariant?.old_price
    ? `<span class="product-old-price">${formatPrice(firstVariant.old_price)}</span>`
    : "";

  card.innerHTML = `

   <div class="product-media" onclick="openProduct(${product.id})" style="cursor:pointer;">
  <span class="product-badge">${categoryLabel(product.category)}</span>
 <button class="product-fav" data-id="${product.id}" type="button">♡</button>
  <img src="${imageSrc}" alt="${product.name}">
</div>

    <div class="product-body">
      <h3 class="product-title">${product.name}</h3>

      <div class="product-bottom">
        <div class="product-price-wrap">
          <span class="product-price">${formatPrice(currentPrice)}</span>
          ${oldPriceHtml}
        </div>

        <div class="product-actions">
  <a href="product.html?id=${product.id}" class="product-btn">Подробнее</a>
  <button class="product-btn primary add-to-cart-btn" type="button">В корзину</button>
</div>
      </div>
    </div>
  `;

  const favBtn = card.querySelector(".product-fav");

favBtn.addEventListener("click", async (e) => {
  e.stopPropagation();

  const { data } = await supabaseClient.auth.getUser();
  const user = data?.user;

  if (!user) {
    showToast("Нужно войти", "error");
    return;
  }

  const productId = Number(favBtn.dataset.id);

  const { data: existing } = await supabaseClient
    .from("favorites")
    .select("*")
    .eq("product_id", productId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabaseClient
      .from("favorites")
      .delete()
      .eq("id", existing.id);

    favBtn.textContent = "♡";
  } else {
    await supabaseClient
      .from("favorites")
      .insert({
        product_id: productId,
        user_id: user.id
      });

    favBtn.textContent = "❤️";
  }
});

const addToCartBtn = card.querySelector(".add-to-cart-btn");

addToCartBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  addToCart(firstVariant.id);
});

  productsGrid.appendChild(card);
});
}

function applyFilters() {
  let filtered = [...allProducts];

  const searchValue = searchInput.value.trim().toLowerCase();
  const sortValue = sortSelect.value;
  const minPrice = Number(minPriceInput.value) || 0;
  const maxPrice = Number(maxPriceInput.value) || Infinity;

  if (currentCategory !== "all") {
    filtered = filtered.filter((product) => product.category === currentCategory);
  }

  if (searchValue) {
    filtered = filtered.filter((product) =>
      (product.name || "").toLowerCase().includes(searchValue) ||
      (product.description || "").toLowerCase().includes(searchValue) ||
      categoryLabel(product.category).toLowerCase().includes(searchValue)
    );
  }

  filtered = filtered.filter((product) => {
    const firstVariant = product.product_variants?.[0];
    const price = Number(firstVariant?.price) || 0;
    return price >= minPrice && price <= maxPrice;
  });

  if (sortValue === "price-asc") {
    filtered.sort((a, b) => {
      const priceA = Number(a.product_variants?.[0]?.price) || 0;
      const priceB = Number(b.product_variants?.[0]?.price) || 0;
      return priceA - priceB;
    });
  } else if (sortValue === "price-desc") {
    filtered.sort((a, b) => {
      const priceA = Number(a.product_variants?.[0]?.price) || 0;
      const priceB = Number(b.product_variants?.[0]?.price) || 0;
      return priceB - priceA;
    });
  } else if (sortValue === "name-asc") {
    filtered.sort((a, b) => (a.name || "").localeCompare(b.name || "", "ru"));
  }

  renderProducts(filtered);
}

async function loadProducts() {
  productsGrid.innerHTML = `<p style="color:#aaa;">Загрузка товаров...</p>`;

  const { data, error } = await supabaseClient
    .from("products")
.select(`
  *,
  product_variants (*)
`)
    .order("id", { ascending: false });

  if (error) {
    console.error("Ошибка загрузки товаров:", error);
    productsGrid.innerHTML = `<p style="color:#ff7a7a;">Ошибка загрузки товаров</p>`;
    return;
  }

  allProducts = data || [];
  applyFilters();
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

function addToCart(variantId) {
  const id = Number(variantId);

  if (!id) {
    showToast("Ошибка: вариант товара не найден", "error");
    return;
  }

  let cart = getCart();

  const existing = cart.find((item) => item.variantId === id);

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      variantId: id,
      qty: 1
    });
  }

  saveCart(cart);
  updateCartCount();

  console.log("CART AFTER ADD:", cart);
  showToast("Товар добавлен в корзину", "success");
}

function updateCartCount() {
  const cart = getCart();
  const total = cart.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const cartCount = document.getElementById("cart-count");

  if (cartCount) {
    cartCount.textContent = total;
  }
}

function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const total = cart.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const cartCount = document.getElementById("cart-count");
  if (cartCount) {
    cartCount.textContent = total;
  }
}

categoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    categoryButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");
    currentCategory = button.dataset.category;
    applyFilters();
  });
});

[searchInput, sortSelect, minPriceInput, maxPriceInput].forEach((element) => {
  element.addEventListener("input", applyFilters);
  element.addEventListener("change", applyFilters);
});

clearFiltersBtn.addEventListener("click", () => {
  currentCategory = "all";
  searchInput.value = "";
  sortSelect.value = "default";
  minPriceInput.value = "";
  maxPriceInput.value = "";

  categoryButtons.forEach((btn) => btn.classList.remove("active"));
  document.querySelector('.filter-chip[data-category="all"]')?.classList.add("active");

  applyFilters();
});

updateCartCount();
loadProducts(); 
function openProduct(id) {
  window.location.href = `product.html?id=${id}`;
}
