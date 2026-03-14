function loadSection(id, file) {
  const mount = document.getElementById(id);
  if (!mount) return Promise.resolve();

  return fetch(file, { cache: "no-store" })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Failed to load ${file}`);
      }
      return res.text();
    })
    .then((html) => {
      mount.innerHTML = html;
    })
    .catch((err) => {
      console.error(`Failed to load ${file}`, err);
    });
}

document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([
    loadSection("payment-methods", "checkout-payment.html"),
    loadSection("termsSection", "checkout-terms.html")
  ]);

  renderCheckoutSummary();
  setupRateButton();

  window.addEventListener("axiom-cart-updated", renderCheckoutSummary);
  window.addEventListener("storage", renderCheckoutSummary);
});

const CART_STORAGE_KEY = "axiom_cart";

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
  return Number(item.quantity || item.qty || 1);
}

function getItemPrice(item) {
  return Number(item.price || item.variantPrice || 0);
}

function getItemName(item) {
  return item.name || item.productName || "Product";
}

function getItemVariant(item) {
  return item.variantLabel || item.variant || item.option || "";
}

function normalizeImagePath(path) {
  if (!path || typeof path !== "string") {
    return "../images/products/placeholder.PNG";
  }

  const cleanPath = path.trim();

  if (
    cleanPath.startsWith("../") ||
    cleanPath.startsWith("./") ||
    cleanPath.startsWith("/") ||
    cleanPath.startsWith("http://") ||
    cleanPath.startsWith("https://")
  ) {
    return cleanPath;
  }

  return `../${cleanPath}`;
}

function getItemImage(item) {
  return normalizeImagePath(item.image || item.productImage || "");
}

function getItemWeightOz(item) {
  if (item.weightOz !== undefined && item.weightOz !== null && !Number.isNaN(Number(item.weightOz))) {
    return Number(item.weightOz);
  }

  const id = String(item.id || "").toLowerCase();
  const slug = String(item.slug || "").toLowerCase();
  const name = String(item.name || "").toLowerCase();

  if (
    id.includes("bacwater") ||
    slug.includes("bac-water") ||
    name.includes("bac water")
  ) {
    return 9.6;
  }

  return 0.188;
}

function getSelectedShippingValue() {
  const selected = document.querySelector('input[name="shippingMethod"]:checked');
  return selected ? Number(selected.value || 0) : 0;
}

function calculateEstimatedRates(items) {
  const totalWeightOz = items.reduce((sum, item) => {
    return sum + (getItemWeightOz(item) * getItemQuantity(item));
  }, 0);

  let ground = 5.95;
  let priority = 9.95;

  if (totalWeightOz <= 4) {
    ground = 4.95;
    priority = 8.95;
  } else if (totalWeightOz <= 8) {
    ground = 5.95;
    priority = 9.95;
  } else if (totalWeightOz <= 16) {
    ground = 7.95;
    priority = 11.95;
  } else if (totalWeightOz <= 32) {
    ground = 9.95;
    priority = 14.95;
  } else if (totalWeightOz <= 64) {
    ground = 13.95;
    priority = 19.95;
  } else {
    ground = 17.95;
    priority = 24.95;
  }

  return { ground, priority, totalWeightOz };
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
  if (cartCountEl) cartCountEl.textContent = String(totalCount);

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
          <img
            src="${getItemImage(item)}"
            alt="${getItemName(item)}"
            onerror="this.onerror=null;this.src='../images/products/placeholder.PNG';"
          />
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

  const selectedShipping = getSelectedShippingValue();
  const tax = 0;
  const total = subtotal + selectedShipping + tax;

  subtotalEl.textContent = formatMoney(subtotal);
  shippingEl.textContent = selectedShipping > 0 ? formatMoney(selectedShipping) : "$0.00";
  taxEl.textContent = formatMoney(tax);
  totalEl.textContent = formatMoney(total);
}

function setupRateButton() {
  const getRatesBtn = document.getElementById("getRates");
  const ratesWrap = document.getElementById("shippingRates");

  if (!getRatesBtn || !ratesWrap) return;

  getRatesBtn.addEventListener("click", () => {
    const items = getCartItems();

    if (!items.length) {
      ratesWrap.innerHTML = `
        <div class="shipping-empty-message">
          Your cart is empty.
        </div>
      `;
      renderCheckoutSummary();
      return;
    }

    const address1 = document.getElementById("address1")?.value.trim();
    const city = document.getElementById("city")?.value.trim();
    const state = document.getElementById("state")?.value.trim();
    const zip = document.getElementById("zip")?.value.trim();

    if (!address1 || !city || !state || !zip) {
      ratesWrap.innerHTML = `
        <div class="shipping-empty-message">
          Please complete your shipping address first.
        </div>
      `;
      renderCheckoutSummary();
      return;
    }

    const rates = calculateEstimatedRates(items);

    ratesWrap.innerHTML = `
      <label class="shipping-option active">
        <input type="radio" name="shippingMethod" value="${rates.ground.toFixed(2)}" checked />
        <span>USPS Ground Advantage</span>
        <strong>${formatMoney(rates.ground)}</strong>
      </label>

      <label class="shipping-option">
        <input type="radio" name="shippingMethod" value="${rates.priority.toFixed(2)}" />
        <span>USPS Priority Mail</span>
        <strong>${formatMoney(rates.priority)}</strong>
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
    return;
  }

  const selectedShipping = document.querySelector('input[name="shippingMethod"]:checked');
  if (!selectedShipping) {
    e.preventDefault();
    alert("Please choose a shipping method.");
  }
});
