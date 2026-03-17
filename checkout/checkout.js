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

const CART_STORAGE_KEY = "axiom_cart";

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
  return Number(item.price || item.variantPrice || item.unit_price || 0);
}

function getItemName(item) {
  return item.name || item.productName || item.product_name || "Product";
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
  const name = String(getItemName(item) || "").toLowerCase();

  if (
    id.includes("bacwater") ||
    slug.includes("bac-water") ||
    name.includes("bac water")
  ) {
    return 9.6;
  }

  return 0.188;
}

function getLocalCartItems() {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to read local cart:", error);
    return [];
  }
}

function saveLocalCartItems(items) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error("Failed to save local cart:", error);
  }
}

function normalizeCartItemsForSession(items) {
  if (!Array.isArray(items)) return [];

  return items.map((item) => {
    const quantity = getItemQuantity(item);

    return {
      id: item.id || "",
      slug: item.slug || "",
      name: getItemName(item),
      product_name: getItemName(item),
      variantLabel: getItemVariant(item),
      variant_label: getItemVariant(item),
      variant: getItemVariant(item),
      price: getItemPrice(item),
      unit_price: getItemPrice(item),
      compareAtPrice:
        item.compareAtPrice !== undefined && item.compareAtPrice !== null
          ? Number(item.compareAtPrice) || null
          : item.compare_at_price !== undefined && item.compare_at_price !== null
            ? Number(item.compare_at_price) || null
            : null,
      compare_at_price:
        item.compare_at_price !== undefined && item.compare_at_price !== null
          ? Number(item.compare_at_price) || null
          : item.compareAtPrice !== undefined && item.compareAtPrice !== null
            ? Number(item.compareAtPrice) || null
            : null,
      quantity: quantity,
      qty: quantity,
      line_total: getItemPrice(item) * quantity,
      image: item.image || "",
      weightOz: Number(item.weightOz || item.weight_oz || 0),
      weight_oz: Number(item.weight_oz || item.weightOz || 0),
      inStock: item.inStock !== false && item.in_stock !== false,
      in_stock: item.inStock !== false && item.in_stock !== false
    };
  });
}

function calculateCartSubtotal(items) {
  return items.reduce((sum, item) => {
    return sum + (getItemPrice(item) * getItemQuantity(item));
  }, 0);
}

function hasSupabaseCheckoutSession() {
  return Boolean(
    window.axiomSupabase &&
    window.AXIOM_CHECKOUT_SESSION &&
    typeof window.AXIOM_CHECKOUT_SESSION.ensureSession === "function" &&
    typeof window.AXIOM_CHECKOUT_SESSION.patchSession === "function"
  );
}

function hasLocalCheckoutSession() {
  return Boolean(
    window.AXIOM_CHECKOUT_SESSION &&
    typeof window.AXIOM_CHECKOUT_SESSION.getSession === "function" &&
    typeof window.AXIOM_CHECKOUT_SESSION.saveSession === "function"
  );
}

function normalizeSessionShape(session) {
  if (!session || typeof session !== "object") return null;

  const shippingSelection =
    session.shipping_selection && typeof session.shipping_selection === "object"
      ? session.shipping_selection
      : {};

  const shippingAddress =
    session.shipping_address && typeof session.shipping_address === "object"
      ? session.shipping_address
      : {};

  const billingAddress =
    session.billing_address && typeof session.billing_address === "object"
      ? session.billing_address
      : {};

  const cartItems = Array.isArray(session.cart_items) ? session.cart_items : [];
  const subtotal = Number(
    session.subtotal !== undefined && session.subtotal !== null
      ? session.subtotal
      : calculateCartSubtotal(cartItems)
  );

  const shippingAmount = Number(
    session.shipping_amount !== undefined && session.shipping_amount !== null
      ? session.shipping_amount
      : shippingSelection.amount !== undefined && shippingSelection.amount !== null
        ? shippingSelection.amount
        : 0
  );

  const taxAmount = Number(
    session.tax_amount !== undefined && session.tax_amount !== null
      ? session.tax_amount
      : session.tax !== undefined && session.tax !== null
        ? session.tax
        : 0
  );

  const totalAmount = Number(
    session.total_amount !== undefined && session.total_amount !== null
      ? session.total_amount
      : session.total !== undefined && session.total !== null
        ? session.total
        : subtotal + shippingAmount + taxAmount
  );

  return {
    ...session,
    cart_items: cartItems,
    subtotal: subtotal,
    shipping_amount: shippingAmount,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    shipping_selection: shippingSelection,
    shipping_address: shippingAddress,
    billing_address: billingAddress,
    customer_email: session.customer_email || session.contact?.email || "",
    customer_phone: session.customer_phone || session.contact?.phone || "",
    customer_first_name: session.customer_first_name || shippingAddress.first_name || "",
    customer_last_name: session.customer_last_name || shippingAddress.last_name || "",
    payment_method: session.payment_method || ""
  };
}

function getCurrentSessionItems() {
  const sessionItems =
    axiomCurrentCheckoutSession && Array.isArray(axiomCurrentCheckoutSession.cart_items)
      ? axiomCurrentCheckoutSession.cart_items
      : [];

  if (sessionItems.length) {
    return sessionItems;
  }

  return getLocalCartItems();
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
  if (hasSupabaseCheckoutSession()) {
    try {
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

      axiomCurrentCheckoutSession = normalizeSessionShape(data || null);
      return axiomCurrentCheckoutSession;
    } catch (error) {
      console.error("Failed to fetch checkout session:", error);
      return null;
    }
  }

  if (hasLocalCheckoutSession()) {
    try {
      axiomCurrentCheckoutSession = normalizeSessionShape(
        window.AXIOM_CHECKOUT_SESSION.getSession()
      );
      return axiomCurrentCheckoutSession;
    } catch (error) {
      console.error("Failed to fetch local checkout session:", error);
      return null;
    }
  }

  console.error("Checkout session dependencies are missing.");
  return null;
}

async function syncLocalCartIntoSession(forceUseLocal = false) {
  const localItems = getLocalCartItems();
  const sessionItems =
    axiomCurrentCheckoutSession && Array.isArray(axiomCurrentCheckoutSession.cart_items)
      ? axiomCurrentCheckoutSession.cart_items
      : [];

  const itemsToUse = forceUseLocal
    ? localItems
    : sessionItems.length
      ? sessionItems
      : localItems;

  const normalizedItems = normalizeCartItemsForSession(itemsToUse);
  const subtotal = calculateCartSubtotal(normalizedItems);

  const existingShippingAmount = Number(axiomCurrentCheckoutSession?.shipping_amount || 0);
  const existingTaxAmount = Number(axiomCurrentCheckoutSession?.tax_amount || 0);
  const totalAmount = subtotal + existingShippingAmount + existingTaxAmount;

  if (window.AXIOM_CART_CHECKOUT_SYNC && typeof window.AXIOM_CART_CHECKOUT_SYNC.syncToSession === "function") {
    await window.AXIOM_CART_CHECKOUT_SYNC.syncToSession({
      cart_items: normalizedItems,
      subtotal: subtotal,
      shipping_amount: existingShippingAmount,
      tax_amount: existingTaxAmount,
      total_amount: totalAmount,
      session_status: "active"
    });

    await fetchCurrentCheckoutSession();
    return;
  }

  if (hasSupabaseCheckoutSession()) {
    await window.AXIOM_CHECKOUT_SESSION.patchSession({
      cart_items: normalizedItems,
      subtotal: subtotal,
      shipping_amount: existingShippingAmount,
      tax_amount: existingTaxAmount,
      total_amount: totalAmount,
      session_status: "active",
      last_activity_at: new Date().toISOString()
    });

    await fetchCurrentCheckoutSession();
    return;
  }

  if (hasLocalCheckoutSession()) {
    const session = window.AXIOM_CHECKOUT_SESSION.getSession();

    session.cart_items = normalizedItems;
    session.subtotal = subtotal;
    session.shipping_amount = existingShippingAmount;
    session.tax_amount = existingTaxAmount;
    session.total_amount = totalAmount;

    if (!session.shipping_selection || typeof session.shipping_selection !== "object") {
      session.shipping_selection = {};
    }

    session.shipping_selection.amount = existingShippingAmount;
    session.session_status = "active";

    window.AXIOM_CHECKOUT_SESSION.saveSession(session);
    axiomCurrentCheckoutSession = normalizeSessionShape(session);
  }
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

  const selectedCode =
    selectedInput?.dataset.code ||
    labelText.toLowerCase().replace(/\s+/g, "_");

  return {
    method_name: labelText,
    method_code: selectedCode,
    label: labelText,
    code: selectedCode,
    carrier: labelText.includes("USPS") ? "USPS" : "",
    service_level: labelText,
    amount: getSelectedShippingValue()
  };
}

async function syncCheckoutSessionFromForm() {
  const items = normalizeCartItemsForSession(getCurrentSessionItems());
  const subtotal = calculateCartSubtotal(items);

  const shippingAmount = getSelectedShippingValue();
  const taxAmount = 0;
  const totalAmount = subtotal + shippingAmount + taxAmount;
  const shippingAddress = getCheckoutShippingAddress();
  const billingAddress = getCheckoutBillingAddress();
  const paymentMethod = getSelectedPaymentMethod();
  const shippingSelection = getSelectedShippingSelectionObject();

  if (hasSupabaseCheckoutSession()) {
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
      subtotal: subtotal,
      total_amount: totalAmount,
      cart_items: items,
      shipping_method_code: shippingSelection.method_code || null,
      shipping_method_name: shippingSelection.method_name || null,
      shipping_carrier: shippingSelection.carrier || null,
      shipping_service_level: shippingSelection.service_level || null,
      last_activity_at: new Date().toISOString()
    });
  } else if (hasLocalCheckoutSession()) {
    const session = window.AXIOM_CHECKOUT_SESSION.getSession();

    session.session_status = "active";
    session.customer_email = document.getElementById("checkoutEmail")?.value.trim() || null;
    session.customer_phone = document.getElementById("phone")?.value.trim() || null;
    session.customer_first_name = shippingAddress.first_name || null;
    session.customer_last_name = shippingAddress.last_name || null;
    session.contact = {
      email: document.getElementById("checkoutEmail")?.value.trim() || "",
      phone: document.getElementById("phone")?.value.trim() || ""
    };
    session.shipping_address = shippingAddress;
    session.billing_address = billingAddress;
    session.payment_method = paymentMethod;
    session.shipping_selection = shippingSelection;
    session.shipping_amount = shippingAmount;
    session.tax_amount = taxAmount;
    session.tax = taxAmount;
    session.subtotal = subtotal;
    session.total_amount = totalAmount;
    session.total = totalAmount;
    session.cart_items = items;
    session.shipping_method_code = shippingSelection.method_code || null;
    session.shipping_method_name = shippingSelection.method_name || null;
    session.shipping_carrier = shippingSelection.carrier || null;
    session.shipping_service_level = shippingSelection.service_level || null;

    window.AXIOM_CHECKOUT_SESSION.saveSession(session);
  }

  axiomCurrentCheckoutSession = normalizeSessionShape({
    ...(axiomCurrentCheckoutSession || {}),
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
    subtotal: subtotal,
    total_amount: totalAmount,
    cart_items: items,
    shipping_method_code: shippingSelection.method_code || null,
    shipping_method_name: shippingSelection.method_name || null,
    shipping_carrier: shippingSelection.carrier || null,
    shipping_service_level: shippingSelection.service_level || null,
    last_activity_at: new Date().toISOString()
  });

  saveLocalCartItems(items);
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

  const savedCode = savedSelection?.method_code || savedSelection?.code || "";
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
      renderCheckoutSummary();
    });

    input.addEventListener("change", async function () {
      await syncCheckoutSessionFromForm();
      renderCheckoutSummary();
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([
    loadSection("payment-methods", "checkout-payment.html"),
    loadSection("termsSection", "checkout-terms.html")
  ]);

  await fetchCurrentCheckoutSession();

  if (window.AXIOM_CART_CHECKOUT_SYNC && typeof window.AXIOM_CART_CHECKOUT_SYNC.syncToSession === "function") {
    await window.AXIOM_CART_CHECKOUT_SYNC.syncToSession({
      session_status: "active"
    });
    await fetchCurrentCheckoutSession();
  } else {
    await syncLocalCartIntoSession(true);
  }

  hydrateCheckoutFormFromSession(axiomCurrentCheckoutSession);
  renderCheckoutSummary();
  setupRateButton();
  bindLiveCheckoutTracking();

  if (axiomCurrentCheckoutSession?.shipping_selection?.method_name || axiomCurrentCheckoutSession?.shipping_selection?.label) {
    renderShippingRatesFromSession();
    renderCheckoutSummary();
  }

  window.addEventListener("axiom-cart-updated", async function () {
    if (window.AXIOM_CART_CHECKOUT_SYNC && typeof window.AXIOM_CART_CHECKOUT_SYNC.syncToSession === "function") {
      await window.AXIOM_CART_CHECKOUT_SYNC.syncToSession({
        session_status: "active"
      });
      await fetchCurrentCheckoutSession();
    } else {
      await syncLocalCartIntoSession(true);
    }

    renderCheckoutSummary();
  });

  window.addEventListener("storage", async function (event) {
    if (event.key === CART_STORAGE_KEY) {
      if (window.AXIOM_CART_CHECKOUT_SYNC && typeof window.AXIOM_CART_CHECKOUT_SYNC.syncToSession === "function") {
        await window.AXIOM_CART_CHECKOUT_SYNC.syncToSession({
          session_status: "active"
        });
        await fetchCurrentCheckoutSession();
      } else {
        await syncLocalCartIntoSession(true);
      }

      renderCheckoutSummary();
    }
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

  if (hasSupabaseCheckoutSession()) {
    await window.AXIOM_CHECKOUT_SESSION.patchSession({
      session_status: "pending_payment",
      payment_status: "unpaid",
      last_activity_at: new Date().toISOString()
    });
  } else if (hasLocalCheckoutSession()) {
    const session = window.AXIOM_CHECKOUT_SESSION.getSession();
    session.session_status = "pending_payment";
    session.payment_status = "unpaid";
    window.AXIOM_CHECKOUT_SESSION.saveSession(session);
  }
});
