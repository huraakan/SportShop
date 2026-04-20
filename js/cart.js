const cartList = document.getElementById("cart-list");
const cartTotal = document.getElementById("cart-total");
const cartItemsCount = document.getElementById("cart-items-count");
const cartCount = document.getElementById("cart-count");

const checkoutForm = document.getElementById("checkout-form");
const checkoutName = document.getElementById("checkout-name");
const checkoutPhone = document.getElementById("checkout-phone");
const checkoutCity = document.getElementById("checkout-city");
const checkoutAddress = document.getElementById("checkout-address");
const checkoutDelivery = document.getElementById("checkout-delivery");
const checkoutPayment = document.getElementById("checkout-payment");
const checkoutComment = document.getElementById("checkout-comment");

function formatPrice(value) {
  return new Intl.NumberFormat("ru-RU").format(Number(value || 0)) + " ₸";
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

function syncCartCounters(cart) {
  const totalItems = cart.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

  if (cartItemsCount) {
    cartItemsCount.textContent = totalItems;
  }

  if (cartCount) {
    cartCount.textContent = totalItems;
  }
}

function updateQty(variantId, change) {
  let cart = getCart();

  cart = cart
    .map((item) => {
      if (Number(item.variantId) === Number(variantId)) {
        return {
          ...item,
          qty: item.qty + change
        };
      }
      return item;
    })
    .filter((item) => item.qty > 0);

  saveCart(cart);
  loadCart();
}

function removeFromCart(variantId) {
  const cart = getCart().filter(
    (item) => Number(item.variantId) !== Number(variantId)
  );

  saveCart(cart);
  loadCart();
}

async function getCartDetailed() {
  const cart = getCart();

  if (!cart.length) {
    return {
      cart: [],
      variants: [],
      products: [],
      total: 0
    };
  }

  const variantIds = cart.map((item) => item.variantId);

  const { data: variants, error: variantsError } = await supabaseClient
    .from("product_variants")
    .select("*")
    .in("id", variantIds);

  if (variantsError) {
    throw variantsError;
  }

  const productIds = [
    ...new Set(
      (variants || [])
        .map((variant) => Number(variant.product_id))
        .filter((id) => id > 0)
    )
  ];

  const { data: products, error: productsError } = await supabaseClient
    .from("products")
    .select("*")
    .in("id", productIds);

  if (productsError) {
    throw productsError;
  }

  let total = 0;

  cart.forEach((cartItem) => {
    const variant = (variants || []).find(
      (v) => Number(v.id) === Number(cartItem.variantId)
    );

    if (!variant) return;

    total += (Number(variant.price) || 0) * (Number(cartItem.qty) || 0);
  });

  return {
    cart,
    variants: variants || [],
    products: products || [],
    total
  };
}

async function loadCart() {
  const cart = getCart();

  syncCartCounters(cart);

  if (!cart.length) {
    if (cartList) {
      cartList.innerHTML = `<p style="color:#aaa;">Корзина пуста.</p>`;
    }

    if (cartTotal) {
      cartTotal.textContent = formatPrice(0);
    }

    return;
  }

  try {
    const { variants, products, total } = await getCartDetailed();

    if (!cartList) return;

    cartList.innerHTML = "";

    cart.forEach((cartItem) => {
      const variant = (variants || []).find(
        (v) => Number(v.id) === Number(cartItem.variantId)
      );

      if (!variant) return;

      const product = (products || []).find(
        (p) => Number(p.id) === Number(variant.product_id)
      );

      const imageSrc = variant.image && variant.image.trim()
        ? variant.image
        : "images/home/product-1.png";

      const price = Number(variant.price) || 0;
      const qty = Number(cartItem.qty) || 0;

      const item = document.createElement("div");
      item.className = "cart-item";

      item.innerHTML = `
        <div class="cart-item-image">
          <img src="${imageSrc}" alt="${product?.name || "Товар"}">
        </div>

        <div class="cart-item-info">
          <h3>${product?.name || "Товар"}</h3>
          <p>${variant.flavor || "Без вкуса"}${variant.weight ? ` / ${variant.weight}` : ""}</p>
          <p>${formatPrice(price)}</p>
        </div>

        <div class="cart-item-actions">
          <button type="button" class="qty-btn minus">−</button>
          <span class="cart-qty">${qty}</span>
          <button type="button" class="qty-btn plus">+</button>
          <button type="button" class="remove-btn">Удалить</button>
        </div>
      `;

      item.querySelector(".minus")?.addEventListener("click", () => {
        updateQty(variant.id, -1);
      });

      item.querySelector(".plus")?.addEventListener("click", () => {
        updateQty(variant.id, 1);
      });

      item.querySelector(".remove-btn")?.addEventListener("click", () => {
        removeFromCart(variant.id);
      });

      cartList.appendChild(item);
    });

    if (cartTotal) {
      cartTotal.textContent = formatPrice(total);
    }
  } catch (error) {
    console.error("Ошибка загрузки корзины:", error);

    if (cartList) {
      cartList.innerHTML = `<p style="color:#ff8f8f;">Не удалось загрузить корзину.</p>`;
    }

    if (cartTotal) {
      cartTotal.textContent = formatPrice(0);
    }
  }
}

checkoutForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = checkoutName?.value.trim() || "";
  const phone = checkoutPhone?.value.trim() || "";
  const city = checkoutCity?.value.trim() || "";
  const address = checkoutAddress?.value.trim() || "";
  const delivery = checkoutDelivery?.value || "courier";
  const payment = checkoutPayment?.value || "cash";
  const comment = checkoutComment?.value.trim() || "";

  if (!name || !phone) {
    showToast("Заполни имя и телефон", "error");
    return;
  }

  try {
    const { cart, variants, products, total } = await getCartDetailed();

    if (!cart.length) {
     showToast("Корзина пуста", "error");
      return;
    }

    const { data: orderData, error: orderError } = await supabaseClient
      .from("orders")
      .insert([
        {
          customer_name: name,
          customer_phone: phone,
          customer_comment: comment || null,
          total_amount: total,
          status: "new",
          city: city || null,
          address: address || null,
          delivery_method: delivery,
          payment_method: payment
        }
      ])
      .select()
      .single();

    if (orderError) {
      throw orderError;
    }

    const orderItems = cart
      .map((cartItem) => {
        const variant = (variants || []).find(
          (v) => Number(v.id) === Number(cartItem.variantId)
        );

        if (!variant) return null;

        const product = (products || []).find(
          (p) => Number(p.id) === Number(variant.product_id)
        );

        return {
          order_id: orderData.id,
          product_id: variant.product_id || null,
          variant_id: variant.id,
          product_name: product?.name || "Товар",
          flavor: variant.flavor || null,
          weight: variant.weight || null,
          price: Number(variant.price) || 0,
          quantity: Number(cartItem.qty) || 1
        };
      })
      .filter(Boolean);

    const { error: itemsError } = await supabaseClient
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      throw itemsError;
    }

    localStorage.removeItem("cart");
    checkoutForm.reset();
    await loadCart();

   showToast("Заказ оформлен", "success");
  } catch (error) {
    console.error("Ошибка оформления заказа:", error);
showToast("Не удалось оформить заказ", "error");
  }
});

function initChoiceGroup(groupId, inputId) {
  const group = document.getElementById(groupId);
  const input = document.getElementById(inputId);

  if (!group || !input) return;

  const buttons = group.querySelectorAll(".checkout-choice");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      input.value = button.dataset.value;
    });
  });
}

initChoiceGroup("checkout-delivery-group", "checkout-delivery");
initChoiceGroup("checkout-payment-group", "checkout-payment");

loadCart();