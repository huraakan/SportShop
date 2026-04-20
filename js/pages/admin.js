const burger = document.getElementById("burger");
const nav = document.getElementById("nav");

if (burger && nav) {
  burger.addEventListener("click", () => {
    nav.classList.toggle("open");
  });
}

const productForm = document.getElementById("product-form");
const variantForm = document.getElementById("variant-form");

const productFormTitle = document.getElementById("product-form-title");
const variantFormTitle = document.getElementById("variant-form-title");

const productCancelBtn = document.getElementById("product-cancel-btn");
const variantCancelBtn = document.getElementById("variant-cancel-btn");

const productMessage = document.getElementById("product-message");
const variantMessage = document.getElementById("variant-message");

const productsList = document.getElementById("products-list");

const productIdInput = document.getElementById("product-id");
const productNameInput = document.getElementById("product-name");
const productCategoryInput = document.getElementById("product-category");
const productDescriptionInput = document.getElementById("product-description");
const productCompositionInput = document.getElementById("product-composition");
const productUsageInput = document.getElementById("product-usage");
const productSafetyInput = document.getElementById("product-safety");

const variantIdInput = document.getElementById("variant-id");
const variantProductInput = document.getElementById("variant-product");
const variantFlavorInput = document.getElementById("variant-flavor");
const variantWeightInput = document.getElementById("variant-weight");
const variantPriceInput = document.getElementById("variant-price");
const variantOldPriceInput = document.getElementById("variant-old-price");
const variantStockInput = document.getElementById("variant-stock");
const variantSkuInput = document.getElementById("variant-sku");
const variantImageInput = document.getElementById("variant-image");

function showMessage(element, text, type = "") {
  element.textContent = text;
  element.className = `admin-message ${type}`;
}

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

async function protectAdminPage() {
  const { data, error } = await supabaseClient.auth.getUser();
  const user = data?.user;

  if (error || !user) {
    window.location.href = "login.html";
    return false;
  }

  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    window.location.href = "index.html";
    return false;
  }

  return true;
}

function resetProductForm() {
  productForm.reset();
  productIdInput.value = "";
  productFormTitle.textContent = "Основной товар";
  productCancelBtn.classList.add("hidden");
  showMessage(productMessage, "");
}

function resetVariantForm() {
  variantForm.reset();
  variantIdInput.value = "";
  variantFormTitle.textContent = "Вариант товара";
  variantCancelBtn.classList.add("hidden");
  showMessage(variantMessage, "");
}

async function loadProductOptions() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("id, name")
    .order("id", { ascending: false });

  if (error) {
    console.error("Ошибка загрузки списка товаров:", error);
    return;
  }

  variantProductInput.innerHTML = `<option value="">Сначала выбери товар</option>`;

  (data || []).forEach((product) => {
    const option = document.createElement("option");
    option.value = product.id;
    option.textContent = product.name;
    variantProductInput.appendChild(option);
  });
}

function createVariantCard(variant) {
  const imageSrc = variant.image && variant.image.trim()
    ? variant.image
    : "images/home/product-1.png";

  const wrapper = document.createElement("div");
  wrapper.className = "admin-variant-item";

  wrapper.innerHTML = `
    <div class="admin-variant-image">
      <img src="${imageSrc}" alt="${variant.flavor || 'variant'}">
    </div>

    <div class="admin-variant-info">
      <h4>${variant.flavor || "Без вкуса"} / ${variant.weight || "Без веса"}</h4>
      <div class="admin-variant-meta">
        <div><strong>SKU:</strong> ${variant.sku || "—"}</div>
        <div><strong>Остаток:</strong> ${variant.stock ?? 0}</div>
      </div>
      <div class="admin-variant-price">${formatPrice(variant.price)}</div>
    </div>

    <div class="admin-variant-actions">
      <button class="admin-small-btn edit" type="button">Редактировать</button>
      <button class="admin-small-btn delete" type="button">Удалить</button>
    </div>
  `;

  const [editBtn, deleteBtn] = wrapper.querySelectorAll("button");

  editBtn.addEventListener("click", () => {
    variantIdInput.value = variant.id;
    variantProductInput.value = variant.product_id;
    variantFlavorInput.value = variant.flavor || "";
    variantWeightInput.value = variant.weight || "";
    variantPriceInput.value = variant.price ?? "";
    variantOldPriceInput.value = variant.old_price ?? "";
    variantStockInput.value = variant.stock ?? 0;
    variantSkuInput.value = variant.sku || "";
    variantImageInput.value = variant.image || "";

    variantFormTitle.textContent = "Редактировать вариант";
    variantCancelBtn.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  deleteBtn.addEventListener("click", async () => {
    const ok = confirm(`Удалить вариант "${variant.flavor || ""} ${variant.weight || ""}"?`);
    if (!ok) return;

    const { error } = await supabaseClient
      .from("product_variants")
      .delete()
      .eq("id", variant.id);

    if (error) {
      console.error("Ошибка удаления варианта:", error);
      showMessage(variantMessage, error.message || "Не удалось удалить вариант.", "error");
      return;
    }

    showMessage(variantMessage, "Вариант удалён.", "success");
    await loadProductsWithVariants();
  });

  return wrapper;
}

function createProductCard(product, variants) {
  const article = document.createElement("article");
  article.className = "admin-product-group";

  article.innerHTML = `
    <div class="admin-product-top">
      <div>
        <h3>${product.name}</h3>
        <div class="admin-product-description" style="margin-top:8px;">
          <strong>Категория:</strong> ${categoryLabel(product.category)}
        </div>
      </div>

      <div class="admin-product-buttons">
        <button class="admin-small-btn edit" type="button">Редактировать товар</button>
        <button class="admin-small-btn delete" type="button">Удалить товар</button>
      </div>
    </div>

    <div class="admin-variants"></div>
  `;

  const variantsContainer = article.querySelector(".admin-variants");
  const [editBtn, deleteBtn] = article.querySelectorAll(".admin-product-buttons button");

  editBtn.addEventListener("click", () => {
    productIdInput.value = product.id;
    productNameInput.value = product.name || "";
    productCategoryInput.value = product.category || "";
    productDescriptionInput.value = product.description || "";
    productCompositionInput.value = product.composition || "";
    productUsageInput.value = product.usage || "";
    productSafetyInput.value = product.safety || "";

    productFormTitle.textContent = "Редактировать товар";
    productCancelBtn.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  deleteBtn.addEventListener("click", async () => {
    const ok = confirm(`Удалить товар "${product.name}" и все его варианты?`);
    if (!ok) return;

    const { error } = await supabaseClient
      .from("products")
      .delete()
      .eq("id", product.id);

    if (error) {
      console.error("Ошибка удаления товара:", error);
      showMessage(productMessage, error.message || "Не удалось удалить товар.", "error");
      return;
    }

    showMessage(productMessage, "Товар удалён.", "success");
    await loadProductsWithVariants();
    await loadProductOptions();
  });

  if (!variants.length) {
    const empty = document.createElement("div");
    empty.className = "admin-product-description";
    empty.textContent = "У этого товара пока нет вариантов.";
    variantsContainer.appendChild(empty);
  } else {
    variants.forEach((variant) => {
      variantsContainer.appendChild(createVariantCard(variant));
    });
  }

  return article;
}

async function loadProductsWithVariants() {
  productsList.innerHTML = `<p style="color:#aaa;">Загрузка товаров...</p>`;

  const { data: products, error: productsError } = await supabaseClient
    .from("products")
    .select("*")
    .order("id", { ascending: false });

  if (productsError) {
    console.error("Ошибка загрузки товаров:", productsError);
    productsList.innerHTML = `<p style="color:#ff8f8f;">Ошибка загрузки товаров</p>`;
    return;
  }

  const { data: variants, error: variantsError } = await supabaseClient
    .from("product_variants")
    .select("*")
    .order("id", { ascending: false });

  if (variantsError) {
    console.error("Ошибка загрузки вариантов:", variantsError);
    productsList.innerHTML = `<p style="color:#ff8f8f;">Ошибка загрузки вариантов</p>`;
    return;
  }

  productsList.innerHTML = "";

  if (!products?.length) {
    productsList.innerHTML = `<p style="color:#aaa;">Пока товаров нет.</p>`;
    return;
  }

  products.forEach((product) => {
    const productVariants = (variants || []).filter(
      (variant) => Number(variant.product_id) === Number(product.id)
    );

    productsList.appendChild(createProductCard(product, productVariants));
  });
}

productForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    name: productNameInput.value.trim(),
    category: productCategoryInput.value,
    description: productDescriptionInput.value.trim() || null,
    composition: productCompositionInput.value.trim() || null,
    usage: productUsageInput.value.trim() || null,
    safety: productSafetyInput.value.trim() || null
  };

  if (!payload.name || !payload.category) {
    showMessage(productMessage, "Заполни название и категорию.", "error");
    return;
  }

  if (productIdInput.value) {
    const { error } = await supabaseClient
      .from("products")
      .update(payload)
      .eq("id", productIdInput.value);

    if (error) {
      console.error("Ошибка обновления товара:", error);
      showMessage(productMessage, error.message || "Не удалось обновить товар.", "error");
      return;
    }

    showMessage(productMessage, "Товар обновлён.", "success");
  } else {
    const { error } = await supabaseClient
      .from("products")
      .insert([payload]);

    if (error) {
      console.error("Ошибка добавления товара:", error);
      showMessage(productMessage, error.message || "Не удалось добавить товар.", "error");
      return;
    }

    showMessage(productMessage, "Товар добавлен.", "success");
  }

  resetProductForm();
  await loadProductsWithVariants();
  await loadProductOptions();
});

variantForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    product_id: Number(variantProductInput.value),
    flavor: variantFlavorInput.value.trim() || null,
    weight: variantWeightInput.value.trim() || null,
    price: Number(variantPriceInput.value || 0),
    old_price: variantOldPriceInput.value ? Number(variantOldPriceInput.value) : null,
    stock: Number(variantStockInput.value || 0),
    sku: variantSkuInput.value.trim() || null,
    image: variantImageInput.value.trim() || null
  };

  if (!payload.product_id || payload.price < 0) {
    showMessage(variantMessage, "Выбери товар и укажи корректную цену.", "error");
    return;
  }

  if (variantIdInput.value) {
    const { error } = await supabaseClient
      .from("product_variants")
      .update(payload)
      .eq("id", variantIdInput.value);

    if (error) {
      console.error("Ошибка обновления варианта:", error);
      showMessage(variantMessage, error.message || "Не удалось обновить вариант.", "error");
      return;
    }

    showMessage(variantMessage, "Вариант обновлён.", "success");
  } else {
    const { error } = await supabaseClient
      .from("product_variants")
      .insert([payload]);

    if (error) {
      console.error("Ошибка добавления варианта:", error);
      showMessage(variantMessage, error.message || "Не удалось добавить вариант.", "error");
      return;
    }

    showMessage(variantMessage, "Вариант добавлен.", "success");
  }

  resetVariantForm();
  await loadProductsWithVariants();
});

productCancelBtn?.addEventListener("click", resetProductForm);
variantCancelBtn?.addEventListener("click", resetVariantForm);

(async () => {
  const allowed = await protectAdminPage();
  if (!allowed) return;

  await loadProductOptions();
  await loadProductsWithVariants();
})();