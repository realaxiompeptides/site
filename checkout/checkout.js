function loadSection(id, file) {
  const mount = document.getElementById(id);
  if (!mount) return;

  fetch(file)
    .then((res) => res.text())
    .then((html) => {
      mount.innerHTML = html;
    })
    .catch((err) => {
      console.error(`Failed to load ${file}`, err);
    });
}

document.addEventListener("DOMContentLoaded", () => {
  loadSection("payment-methods", "checkout-payment.html");
  loadSection("termsSection", "checkout-terms.html");

  renderCheckoutSummary();
  setupRateButton();
});

const CART_STORAGE_KEY = "axiomCart";

function getCartItems() {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to read cart:", error);
    return [];
  }
}

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function getItemQuantity(item) {
  return Number(item.quantity || 1);
}

function getItemPrice(item) {
  return Number(item.price || item.variantPrice || 0);
}

function getItemImage(item) {
  return item.image || item.productImage || "../images/placeholder.PNG";
}

function getItemName(item) {
  return item.name || item.productName || "Product";
}

function getItemVariant(item) {
  return item.variantLabel || item.variant || item.option || "";
}

function renderCheckoutSummary() {
  const items = getCartItems();

  const itemsWrap = document.getElementById("checkoutItems");
  const subtotalEl = document.getElementById("subtotal");
  const shippingEl = document.getElementById("shipping");
  const taxEl = document.getElementById("tax");
  const totalEl = document.getElementById("total");
  const cartCountEl = document.getElementById("checkoutCartCount");

  if (!itemsWrap || !subtotalEl || !shippingEl || !taxEl || !totalEl) return;

  const totalCount = items.reduce((sum, item) => sum + getItemQuantity(item), 0);
  if (cartCountEl) cartCountEl.textContent = totalCount;

  if (!items.length) {
    itemsWrap.innerHTML = `
      <div class="checkout-empty-summary">
        Your cart is currently empty.
      </div>
    `;
    subtotalEl.textContent = "$0.00";
    shippingEl.textContent = "$0.00";
    taxEl.textContent = "$0.00";
    totalEl.textContent = "$0.00";
    return;
  }

  let subtotal = 0;

  itemsWrap.innerHTML = items.map((item) => {
    const quantity = getItemQuantity(item);
    const price = getItemPrice(item);
    const lineTotal = price * quantity;
    subtotal += lineTotal;

    const variant = getItemVariant(item);

    return `
      <div class="checkout-summary-item">
        <div class="checkout-summary-item-image">
          <img src="${getItemImage(item)}" alt="${getItemName(item)}" />
        </div>

        <div class="checkout-summary-item-info">
          <h3>${getItemName(item)}</h3>
          ${variant ? `<p class="checkout-summary-item-variant">${variant}</p>` : ""}
          <p class="checkout-summary-item-qty">Qty: ${quantity}</p>
        </div>

        <div class="checkout-summary-item-price">
          ${formatMoney(lineTotal)}
        </div>
      </div>
    `;
  }).join("");

  const selectedShipping = Number(
    document.querySelector('input[name="shippingMethod"]:checked')?.value || 0
  );

  const tax = 0;
  const total = subtotal + selectedShipping + tax;

  subtotalEl.textContent = formatMoney(subtotal);
  shippingEl.textContent = formatMoney(selectedShipping);
  taxEl.textContent = formatMoney(tax);
  totalEl.textContent = formatMoney(total);
}

function setupRateButton() {
  const getRatesBtn = document.getElementById("getRates");
  const ratesWrap = document.getElementById("shippingRates");

  if (!getRatesBtn || !ratesWrap) return;

  getRatesBtn.addEventListener("click", () => {
    ratesWrap.innerHTML = `
      <label class="shipping-option active">
        <input type="radio" name="shippingMethod" value="7.95" checked />
        <span>USPS Ground Advantage</span>
        <strong>$7.95</strong>
      </label>

      <label class="shipping-option">
        <input type="radio" name="shippingMethod" value="11.95" />
        <span>USPS Priority Mail</span>
        <strong>$11.95</strong>
      </label>
    `;

    const radios = ratesWrap.querySelectorAll('input[name="shippingMethod"]');
    radios.forEach((radio) => {
      radio.addEventListener("change", () => {
        ratesWrap.querySelectorAll(".shipping-option").forEach((option) => {
          option.classList.remove("active");
        });

        radio.closest(".shipping-option")?.classList.add("active");
        renderCheckoutSummary();
      });
    });

    renderCheckoutSummary();
  });
}

document.addEventListener("submit", function (e) {
  if (e.target.id !== "checkoutForm") return;

  const termsCheckbox = document.getElementById("termsCheckbox");

  if (!termsCheckbox || !termsCheckbox.checked) {
    e.preventDefault();
    alert("You must agree to the Terms & Conditions before placing your order.");
    return;
  }

  const items = getCartItems();
  if (!items.length) {
    e.preventDefault();
    alert("Your cart is empty.");
  }
});
