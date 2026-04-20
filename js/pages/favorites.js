const favoritesList = document.getElementById("favorites-list");
const favoritesSearch = document.getElementById("favorites-search");
const favoritesCategory = document.getElementById("favorites-category");
const favoritesSort = document.getElementById("favorites-sort");

function initCustomSelects() {
  const selects = document.querySelectorAll(".custom-select");

  selects.forEach((select) => {
    const trigger = select.querySelector(".custom-select-trigger");
    const label = select.querySelector(".custom-select-label");
    const options = select.querySelectorAll(".custom-select-option");
    const targetId = select.dataset.target;
    const hiddenInput = document.getElementById(targetId);

    if (!trigger || !label || !hiddenInput) return;

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();

      document.querySelectorAll(".custom-select.open").forEach((item) => {
        if (item !== select) item.classList.remove("open");
      });

      select.classList.toggle("open");
    });

    options.forEach((option) => {
      option.addEventListener("click", () => {
        const value = option.dataset.value || "";
        const text = option.textContent || "";

        hiddenInput.value = value;
        label.textContent = text;

        options.forEach((item) => item.classList.remove("active"));
        option.classList.add("active");

        select.classList.remove("open");

        if (typeof applyFavoritesFilters === "function") {
          applyFavoritesFilters();
        }
      });
    });
  });

  document.addEventListener("click", () => {
    document.querySelectorAll(".custom-select.open").forEach((item) => {
      item.classList.remove("open");
    });
  });
}

let allFavorites = [];

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

function renderFavorites(list) {
  favoritesList.innerHTML = "";

  if (!list.length) {
    favoritesList.innerHTML = "<p style='color:white'>Ничего не найдено</p>";
    return;
  }

  list.forEach((item) => {
    const product = item.products;
    const variant = product?.product_variants?.[0];

    const imageSrc = variant?.image && variant.image.trim()
      ? variant.image
      : "images/home/product-1.png";

    const card = document.createElement("div");
    card.className = "fav-card";

    card.innerHTML = `
      <img class="fav-img" src="${imageSrc}" alt="${product?.name || "Товар"}">
      <div class="fav-title">${product?.name || "Товар"}</div>
      <div class="fav-price">${formatPrice(variant?.price || 0)}</div>
      <div style="color:#aaa; margin-bottom:12px;">${categoryLabel(product?.category)}</div>

      <div class="fav-actions">
        <a class="fav-open" href="product.html?id=${product?.id}">
          Открыть
        </a>

        <button class="fav-remove" type="button" data-id="${item.id}">
          ❤️
        </button>
      </div>
    `;

    card.querySelector(".fav-remove")?.addEventListener("click", async () => {
      const { error } = await supabaseClient
        .from("favorites")
        .delete()
        .eq("id", item.id);

      if (error) {
  console.error(error);
  showToast("Не удалось удалить из закладок", "error");
  return;
}

      allFavorites = allFavorites.filter((fav) => fav.id !== item.id);
      applyFavoritesFilters();
    });

    favoritesList.appendChild(card);
  });
}

function applyFavoritesFilters() {
  let filtered = [...allFavorites];

  const searchValue = favoritesSearch?.value.trim().toLowerCase() || "";
  const categoryValue = favoritesCategory?.value || "all";
  const sortValue = favoritesSort?.value || "default";

  if (searchValue) {
    filtered = filtered.filter((item) =>
      (item.products?.name || "").toLowerCase().includes(searchValue)
    );
  }

  if (categoryValue !== "all") {
    filtered = filtered.filter((item) => item.products?.category === categoryValue);
  }

  if (sortValue === "price-asc") {
    filtered.sort((a, b) => {
      const priceA = Number(a.products?.product_variants?.[0]?.price || 0);
      const priceB = Number(b.products?.product_variants?.[0]?.price || 0);
      return priceA - priceB;
    });
  } else if (sortValue === "price-desc") {
    filtered.sort((a, b) => {
      const priceA = Number(a.products?.product_variants?.[0]?.price || 0);
      const priceB = Number(b.products?.product_variants?.[0]?.price || 0);
      return priceB - priceA;
    });
  } else if (sortValue === "name-asc") {
    filtered.sort((a, b) =>
      (a.products?.name || "").localeCompare(b.products?.name || "", "ru")
    );
  }

  renderFavorites(filtered);
}

async function loadFavorites() {
  const { data: userData } = await supabaseClient.auth.getUser();
  const user = userData?.user;

  if (!user) {
    favoritesList.innerHTML = "<p style='color:white'>Войди в аккаунт</p>";
    return;
  }

  const { data, error } = await supabaseClient
    .from("favorites")
    .select(`
      id,
      product_id,
      products (
        id,
        name,
        category,
        product_variants (*)
      )
    `)
    .eq("user_id", user.id);

  if (error) {
    console.error(error);
    favoritesList.innerHTML = "<p style='color:white'>Ошибка загрузки</p>";
    return;
  }

  allFavorites = data || [];
  applyFavoritesFilters();
}

[favoritesSearch, favoritesCategory, favoritesSort].forEach((el) => {
  el?.addEventListener("input", applyFavoritesFilters);
  el?.addEventListener("change", applyFavoritesFilters);
});

loadFavorites();
initCustomSelects();