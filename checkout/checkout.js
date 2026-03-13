(function () {
  const CART_KEYS = ["axiom-cart", "cart", "axiomCart"];

  const state = {
    cart: [],
    shipping: 0,
    shippingLabel: "Not selected",
    discountCode: "",
    discountAmount: 0,
    tax: 0
  };

  const els = {
    checkoutForm: document.getElementById("checkoutForm"),
    checkoutItems: document.getElementById("checkoutItems"),
    subtotal: document.getElementById("subtotal"),
    shipping: document.getElementById("shipping"),
    tax: document.getElementById("tax"),
    total: document.getElementById("total"),
    shippingRates: document.getElementById("shippingRates"),
    getRates: document.getElementById("getRates"),
    paymentMount: document.getElementById("payment-methods"),
    discountInput: document.getElementById("discountCode"),
    applyDiscount: document.getElementById("applyDiscount"),
    message: document.getElementById("checkoutMessage")
  };

  function money(value) {
    return `$${Number(value || 0).toFixed(2)}`;
  }

  function getStoredCart() {
    for (const key of CART_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch (error) {
        console.warn(`Could not parse cart key: ${key}`, error);
      }
    }
    return [];
  }

  function saveCart(cart) {
    CART_KEYS.forEach((key) => {
      localStorage.setItem(key, JSON.stringify(cart));
    });
  }

  function normalizeCartItem(item, index) {
    const quantity = Number(item.quantity || item.qty || 1);
    const price =
      Number(item.price) ||
      Number(item.variantPrice) ||
      Number(item.linePrice) ||
      0;

    const compareAtPrice =
      Number(item.compareAtPrice) ||
      Number(item.compare_at_price) ||
      0;

    const name =
      item.name ||
      item.productName ||
      item.title ||
      "Product";

    const variantLabel =
      item.variantLabel ||
      item.variant ||
      item.optionLabel ||
      "";

    const image =
      item.image ||
      item.imageUrl ||
      item.thumbnail ||
      "../images/placeholder-product.PNG";

    const slug =
      item.slug ||
      item.productSlug ||
      "";

    const id =
      item.id ||
      item.variantId ||
      `${slug || "item"}-${index}`;

    return {
      id,
      slug,
      name,
      variantLabel,
      image,
      price,
      compareAtPrice,
      quantity: quantity > 0 ? quantity : 1
    };
  }

  function normalizeCart(cart) {
    return cart.map(normalizeCartItem);
  }

  function getSubtotal() {
    return state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  function getEstimatedWeight() {
    return state.cart.reduce((sum, item) => {
      const fallbackWeight = 1.2;
      const possibleWeight = Number(item.weightOz || item.weight || fallbackWeight);
      return sum + possibleWeight * item.quantity;
    }, 0);
  }

  function getShippingEstimate() {
    const subtotal = getSubtotal();
    const totalWeight = getEstimatedWeight();

    if (!state.cart.length) {
      return [
        { id: "none", label: "No items in cart", eta: "", price: 0 }
      ];
    }

    if (subtotal >= 250) {
      return [
        {
          id: "free",
          label: "Free Shipping",
          eta: "2–5 business days",
          price: 0
        },
        {
          id: "priority",
          label: "Priority Mail",
          eta: "1–3 business days",
          price: Math.max(8.95, totalWeight * 1.45)
        }
      ];
    }

    return [
      {
        id: "ground",
        label: "USPS Ground Advantage",
        eta: "2–5 business days",
        price: Math.max(4.95, 4.95 + totalWeight * 0.85)
      },
      {
        id: "priority",
        label: "Priority Mail",
        eta: "1–3 business days",
        price: Math.max(8.95, 8.95 + totalWeight * 1.15)
      }
    ];
  }

  function updateTax() {
    const taxableBase = Math.max(0, getSubtotal() - state.discountAmount);
    state.tax = +(taxableBase * 0).toFixed(2);
  }

  function renderShippingRates() {
    if (!els.shippingRates) return;

    const rates = getShippingEstimate();

    els.shippingRates.innerHTML = `
      <button type="button" class="checkout-rate-button" id="getRates">
        Get Shipping Rates
      </button>
      <p class="checkout-shipping-help">
        Enter your shipping address, then choose a shipping method.
      </p>
      <div class="checkout-rate-list" id="checkoutRateList"></div>
    `;

    const getRatesBtn = document.getElementById("getRates");
    const rateList = document.getElementById("checkoutRateList");

    getRatesBtn?.addEventListener("click", () => {
      rateList.innerHTML = rates
        .map(
          (rate, index) => `
            <button
              type="button"
              class="checkout-rate-option ${index === 0 ? "active" : ""}"
              data-rate-id="${rate.id}"
              data-rate-price="${rate.price}"
              data-rate-label="${rate.label}"
            >
              <span class="checkout-rate-label">
                <strong>${rate.label}</strong>
                <span>${rate.eta}</span>
              </span>
              <span class="checkout-rate-price">${money(rate.price)}</span>
            </button>
          `
        )
        .join("");

      const defaultRate = rates[0];
      state.shipping = Number(defaultRate.price || 0);
      state.shippingLabel = defaultRate.label;
      updateTotals();

      rateList.querySelectorAll(".checkout-rate-option").forEach((btn) => {
        btn.addEventListener("click", () => {
          rateList.querySelectorAll(".checkout-rate-option").forEach((item) => {
            item.classList.remove("active");
          });

          btn.classList.add("active");
          state.shipping = Number(btn.dataset.ratePrice || 0);
          state.shippingLabel = btn.dataset.rateLabel || "Shipping";
          updateTotals();
        });
      });
    });
  }

  function renderCart() {
    if (!els.checkoutItems) return;

    if (!state.cart.length) {
      els.checkoutItems.innerHTML = `
        <div class="checkout-empty">
          Your cart is currently empty.
        </div>
      `;
      updateTotals();
      return;
    }

    els.checkoutItems.innerHTML = state.cart
      .map(
        (item) => `
          <article class="checkout-item" data-cart-id="${item.id}">
            <div class="checkout-item-image">
              <img src="${item.image}" alt="${item.name}">
            </div>

            <div class="checkout-item-content">
              <div class="checkout-item-top">
                <div>
                  <h3 class="checkout-item-name">${item.name}</h3>
                  <p class="checkout-item-meta">
                    ${item.variantLabel ? `Variant: ${item.variantLabel}<br>` : ""}
                    Qty: ${item.quantity}
                  </p>
                </div>
                <button
                  type="button"
                  class="checkout-remove-btn"
                  data-remove-id="${item.id}"
                  aria-label="Remove ${item.name}"
                >
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>

              <div class="checkout-qty-row">
                <div class="checkout-qty-controls">
                  <button
                    type="button"
                    class="checkout-qty-btn"
                    data-qty-action="decrease"
                    data-qty-id="${item.id}"
                  >−</button>
                  <span class="checkout-qty-value">${item.quantity}</span>
                  <button
                    type="button"
                    class="checkout-qty-btn"
                    data-qty-action="increase"
                    data-qty-id="${item.id}"
                  >+</button>
                </div>

                <strong class="checkout-item-line-price">
                  ${money(item.price * item.quantity)}
                </strong>
              </div>
            </div>
          </article>
        `
      )
      .join("");

    bindCartControls();
    updateTotals();
  }

  function bindCartControls() {
    document.querySelectorAll("[data-remove-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.removeId;
        state.cart = state.cart.filter((item) => item.id !== id);
        saveCart(state.cart);
        renderCart();
      });
    });

    document.querySelectorAll("[data-qty-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.qtyId;
        const action = btn.dataset.qtyAction;

        state.cart = state.cart
          .map((item) => {
            if (item.id !== id) return item;

            const nextQty =
              action === "increase"
                ? item.quantity + 1
                : item.quantity - 1;

            return {
              ...item,
              quantity: nextQty
            };
          })
          .filter((item) => item.quantity > 0);

        saveCart(state.cart);
        renderCart();
      });
    });
  }

  function updateTotals() {
    const subtotal = getSubtotal();
    updateTax();

    const total =
      subtotal -
      state.discountAmount +
      state.shipping +
      state.tax;

    if (els.subtotal) els.subtotal.textContent = money(subtotal);
    if (els.shipping) els.shipping.textContent = money(state.shipping);
    if (els.tax) els.tax.textContent = money(state.tax);
    if (els.total) els.total.textContent = money(total);
  }

  function applyDiscountCode() {
    if (!els.discountInput) return;

    const code = els.discountInput.value.trim().toUpperCase();
    state.discountCode = code;
    state.discountAmount = 0;

    if (!code) {
      showMessage("Enter a discount code first.", "error");
      updateTotals();
      return;
    }

    const subtotal = getSubtotal();

    if (code === "SAVE10") {
      state.discountAmount = +(subtotal * 0.1).toFixed(2);
      showMessage("SAVE10 applied successfully.", "success");
    } else if (code === "WELCOME5") {
      state.discountAmount = 5;
      showMessage("WELCOME5 applied successfully.", "success");
    } else {
      showMessage("That discount code is not valid.", "error");
    }

    updateTotals();
  }

  function showMessage(message, type) {
    if (!els.message) return;

    els.message.className =
      type === "success"
        ? "checkout-message checkout-success"
        : "checkout-message checkout-error";

    els.message.textContent = message;
  }

  function bindDiscount() {
    if (els.applyDiscount) {
      els.applyDiscount.addEventListener("click", applyDiscountCode);
    }
  }

  function loadPaymentSection() {
    if (!els.paymentMount) return;

    fetch("checkout-payment.html")
      .then((res) => {
        if (!res.ok) throw new Error("Payment section not found");
        return res.text();
      })
      .then((html) => {
        els.paymentMount.innerHTML = html;
      })
      .catch(() => {
        els.paymentMount.innerHTML = `
          <section class="checkout-section">
            <h2 class="checkout-section-title">Payment Method</h2>

            <div class="checkout-payment-box">
              <label class="checkout-payment-method">
                <input type="radio" name="paymentMethod" checked>
                <span>Card</span>
              </label>

              <label class="checkout-payment-method">
                <input type="radio" name="paymentMethod">
                <span>Crypto</span>
              </label>

              <label class="checkout-payment-method">
                <input type="radio" name="paymentMethod">
                <span>Cash App</span>
              </label>

              <label class="checkout-payment-method">
                <input type="radio" name="paymentMethod">
                <span>Zelle</span>
              </label>
            </div>

            <div class="checkout-payment-note">
              Payment instructions can be shown after order submission on your success page.
            </div>
          </section>
        `;
      });
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!state.cart.length) {
      showMessage("Your cart is empty.", "error");
      return;
    }

    showMessage("Order submitted. Redirecting…", "success");

    setTimeout(() => {
      window.location.href = "checkout-success.html";
    }, 900);
  }

  function init() {
    state.cart = normalizeCart(getStoredCart());

    loadPaymentSection();
    renderShippingRates();
    renderCart();
    bindDiscount();

    if (els.checkoutForm) {
      els.checkoutForm.addEventListener("submit", handleSubmit);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
