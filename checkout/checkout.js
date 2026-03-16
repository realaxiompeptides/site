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

let axiomCurrentCheckoutSession = null;

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
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
  return item.variant_label || item.variantLabel || item.variant || item.option || "";
}

function getItemImage(item) {
  return normalizeImagePath(item.image || item.productImage || "");
}

function getItemWeightOz(item) {
  if (item.weight_oz !== undefined && item.weight_oz !== null && !Number.isNaN(Number(item.weight_oz))) {
    return Number(item.weight_oz);
  }

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

function getCurrentSessionItems() {
  if (!axiomCurrentCheckoutSession) return [];
  return Array.isArray(axiomCurrentCheckoutSession.cart_items)
    ? axiomCurrentCheckoutSession.cart_items
    : [];
}

function getSelectedShippingInput() {
  return document.querySelector('input[name="shippingMethod"]:checked');
}

function getSelectedShippingValue() {
  const selected = getSelectedShippingInput();
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

async function fetchCurrentCheckoutSession() {
  if (!window.axiomSupabase || !window.AXIOM_HELPERS || !window.AXIOM_CHECKOUT_SESSION) {
    console.error("Supabase checkout dependencies are missing.");
    return null;
  }

  const sessionId = await window.AXIOM_CHECKOUT_SESSION.ensureSession();
  if (!sessionId) return null;

  const { data, error } = await window.axiomSupabase
    .from("checkout_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch checkout session:", error);
    return null;
  }

  axiomCurrentCheckoutSession = data || null;
  return axiomCurrentCheckoutSession;
}

function hydrateCheckoutFormFromSession(session) {
  if (!session) return;

  const shippingAddress =
    session.shipping_address && typeof session.shipping_address === "object"
      ? session.shipping_address
      : {};

  const billingAddress =
    session.billing_address && typeof session.billing_address === "object"
      ? session.billing_address
      : {};

  const emailEl = document.getElementById("checkoutEmail");
  const firstNameEl = document.getElementById("firstName");
  const lastNameEl = document.getElementById("lastName");
  const address1El = document.getElementById("address1");
  const address2El = document.getElementById("address2");
  const cityEl = document.getElementById("city");
  const stateEl = document.getElementById("state");
  const zipEl = document.getElementById("zip");
  const phoneEl = document.getElementById("phone");
  const countryEl = document.getElementById("country");

  if (emailEl && !emailEl.value) emailEl.value = session.customer_email || "";
  if (firstNameEl && !firstNameEl.value) {
    firstNameEl.value = shippingAddress.first_name || session.customer_first_name || "";
  }
  if (lastNameEl && !lastNameEl.value) {
    lastNameEl.value = shippingAddress.last_name || session.customer_last_name || "";
  }
  if (address1El && !address1El.value) address1El.value = shippingAddress.address1 || "";
  if (address2El && !address2El.value) address2El.value = shippingAddress.address2 || "";
  if (cityEl && !cityEl.value) cityEl.value = shippingAddress.city || "";
  if (stateEl && !stateEl.value) stateEl.value = shippingAddress.state || "";
  if (zipEl && !zipEl.value) zipEl.value = shippingAddress.zip || "";
  if (phoneEl && !phoneEl.value) {
    phoneEl.value = session.customer_phone || shippingAddress.phone || billingAddress.phone || "";
  }
  if (countryEl && !countryEl.value) {
    countryEl.value = shippingAddress.country || billingAddress.country || "US";
  }
}

function getCheckoutShippingAddress() {
  return {
    first_name: document.getElementById("firstName")?.value.trim() || "",
    last_name: document.getElementById("lastName")?.value.trim() || "",
    address1: document.getElementById("address1")?.value.trim() || "",
    address2: document.getElementById("address2")?.value.trim() || "",
    city: document.getElementById("city")?.value.trim() || "",
    state: document.getElementById("state")?.value.trim() || "",
    zip: document.getElementById("zip")?.value.trim() || "",
    phone: document.getElementById("phone")?.value.trim() || "",
    country: document.getElementById("country")?.value.trim() || "US"
  };
}

function getCheckoutBillingAddress() {
  return getCheckoutShippingAddress();
}

function getSelectedPaymentMethod() {
  const checked = document.querySelector('input[name="paymentMethod"]:checked');
  return checked ? checked.value : null;
}

function getSelectedShippingSelectionObject() {
  const selectedInput = getSelectedShippingInput();
  const selectedOption = selectedInput?.closest(".shipping-option");
  const labelText = selectedOption?.querySelector("span")?.textContent?.trim() || "";

  return {
    method_name: labelText,
    method_code: labelText.toLowerCase().replace(/\s+/g, "_"),
    carrier: labelText.includes("USPS") ? "USPS" : "",
    service_level: labelText,
    amount: getSelectedShippingValue()
  };
}

async function syncCheckoutSessionFromForm() {
  if (!window.AXIOM_CHECKOUT_SESSION) return;

  const items = getCurrentSessionItems();
  const subtotal = items.reduce((sum, item) => {
    return sum + (getItemPrice(item) * getItemQuantity(item));
  }, 0);

  const shippingAmount = getSelectedShippingValue();
  const taxAmount = 0;
  const totalAmount = subtotal + shippingAmount + taxAmount;
  const shippingAddress = getCheckoutShippingAddress();
  const billingAddress = getCheckoutBillingAddress();
  const paymentMethod = getSelectedPaymentMethod();
  const shippingSelection = getSelectedShippingSelectionObject();

  await window.AXIOM_CHECKOUT_SESSION.patchSession({
    session_status: "active",
    customer_email: document.getElementById("checkoutEmail")?.value.trim() || null,
    customer_phone: document.getElementById("phone")?.value.trim() || null,
    customer_first_name: shippingAddress.first_name || null,
    customer_last_name: shippingAddress.last_name || null,
    shipping_address: shippingAddress,
    billing_address: billingAddress,
    payment_method: paymentMethod,
    shipping_selection: shippingSelection,
    shipping_amount: shippingAmount,
    tax_amount: taxAmount,
    subtotal,
    total_amount: totalAmount,
    shipping_method_code: shippingSelection.method_code || null,
    shipping_method_name: shippingSelection.method_name || null,
    shipping_carrier: shippingSelection.carrier || null,
    shipping_service_level: shippingSelection.service_level || null
  });

  await fetchCurrentCheckoutSession();
}

function renderShippingRatesFromSession() {
  const ratesWrap = document.getElementById("shippingRates");
  if (!ratesWrap) return;

  const items = getCurrentSessionItems();

  if (!items.length) {
    ratesWrap.innerHTML = "";
    return;
  }

  const savedSelection =
    axiomCurrentCheckoutSession &&
    axiomCurrentCheckoutSession.shipping_selection &&
    typeof axiomCurrentCheckoutSession.shipping_selection === "object"
      ? axiomCurrentCheckoutSession.shipping_selection
      : null;

  const rates = calculateEstimatedRates(items);

  const savedCode = savedSelection?.method_code || "";
  const groundChecked = savedCode ? savedCode === "usps_ground_advantage" : true;
  const priorityChecked = savedCode === "usps_priority_mail";

  ratesWrap.innerHTML = `
    <label class="shipping-option ${groundChecked ? "active" : ""}">
      <input
        type="radio"
        name="shippingMethod"
        value="${rates.ground.toFixed(2)}"
        data-code="usps_ground_advantage"
        ${groundChecked ? "checked" : ""}
      />
      <span>USPS Ground Advantage</span>
      <strong>${formatMoney(rates.ground)}</strong>
    </label>

    <label class="shipping-option ${priorityChecked ? "active" : ""}">
      <input
        type="radio"
        name="shippingMethod"
        value="${rates.priority.toFixed(2)}"
        data-code="usps_priority_mail"
        ${priorityChecked ? "checked" : ""}
      />
      <span>USPS Priority Mail</span>
      <strong>${formatMoney(rates.priority)}</strong>
    </label>
  `;

  const radios = ratesWrap.querySelectorAll('input[name="shippingMethod"]');
  radios.forEach((radio) => {
    radio.addEventListener("change", async () => {
      ratesWrap.querySelectorAll(".shipping-option").forEach((option) => {
        option.classList.remove("active");
      });

      radio.closest(".shipping-option")?.classList.add("active");
      await syncCheckoutSessionFromForm();
      renderCheckoutSummary();
    });
  });
}

function renderCheckoutSummary() {
  const items = getCurrentSessionItems();

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

  const shippingAmount =
    Number(axiomCurrentCheckoutSession?.shipping_amount || getSelectedShippingValue() || 0);

  const taxAmount = Number(axiomCurrentCheckoutSession?.tax_amount || 0);
  const total = subtotal + shippingAmount + taxAmount;

  subtotalEl.textContent = formatMoney(subtotal);
  shippingEl.textContent = shippingAmount > 0 ? formatMoney(shippingAmount) : "$0.00";
  taxEl.textContent = formatMoney(taxAmount);
  totalEl.textContent = formatMoney(total);
}

function setupRateButton() {
  const getRatesBtn = document.getElementById("getRates");
  const ratesWrap = document.getElementById("shippingRates");

  if (!getRatesBtn || !ratesWrap) return;

  getRatesBtn.addEventListener("click", () => {
    const items = getCurrentSessionItems();

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

    renderShippingRatesFromSession();
    renderCheckoutSummary();
  });
}

function bindLiveCheckoutTracking() {
  const form = document.getElementById("checkoutForm");
  if (!form) return;

  const inputs = form.querySelectorAll("input, select, textarea");

  inputs.forEach((input) => {
    input.addEventListener("input", async function () {
      await syncCheckoutSessionFromForm();
    });

    input.addEventListener("change", async function () {
      await syncCheckoutSessionFromForm();
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([
    loadSection("payment-methods", "checkout-payment.html"),
    loadSection("termsSection", "checkout-terms.html")
  ]);

  await fetchCurrentCheckoutSession();
  hydrateCheckoutFormFromSession(axiomCurrentCheckoutSession);
  renderCheckoutSummary();
  setupRateButton();
  bindLiveCheckoutTracking();

  if (axiomCurrentCheckoutSession?.shipping_selection?.method_name) {
    renderShippingRatesFromSession();
    renderCheckoutSummary();
  }

  window.addEventListener("axiom-cart-updated", async function () {
    await fetchCurrentCheckoutSession();
    renderCheckoutSummary();
  });
});

document.addEventListener("submit", async function (e) {
  if (e.target.id !== "checkoutForm") return;

  const termsCheckbox = document.getElementById("termsCheckbox");

  if (!termsCheckbox || !termsCheckbox.checked) {
    e.preventDefault();
    alert("You must agree to the Terms & Conditions before placing your order.");
    return;
  }

  const items = getCurrentSessionItems();
  if (!items.length) {
    e.preventDefault();
    alert("Your cart is empty.");
    return;
  }

  const selectedShipping = document.querySelector('input[name="shippingMethod"]:checked');
  if (!selectedShipping) {
    e.preventDefault();
    alert("Please choose a shipping method.");
    return;
  }

  await syncCheckoutSessionFromForm();

  if (window.AXIOM_CHECKOUT_SESSION) {
    await window.AXIOM_CHECKOUT_SESSION.patchSession({
      session_status: "pending_payment",
      payment_status: "unpaid"
    });
  }
});
