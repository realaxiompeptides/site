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

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
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

function normalizePaymentMethodValue(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (!normalized) return "";

  if (normalized === "cash_app" || normalized === "cash app") return "cashapp";
  if (normalized === "apple_pay" || normalized === "apple pay") return "applepay";
  if (normalized === "venmo") return "venmo";
  if (normalized === "zelle") return "zelle";
  if (normalized === "crypto") return "crypto";

  return normalized;
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
  if (window.AXIOM_SHIPPING_WEIGHTS && typeof window.AXIOM_SHIPPING_WEIGHTS.getPerItemWeightOz === "function") {
    return Number(window.AXIOM_SHIPPING_WEIGHTS.getPerItemWeightOz(item) || 0);
  }

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
    name.includes("bac water") ||
    name.includes("bacteriostatic water")
  ) {
    return 6;
  }

  return 3;
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
    const weightOz = getItemWeightOz(item);

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
      weightOz: weightOz,
      weight_oz: weightOz,
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

function normalizeDiscountCode(value) {
  return String(value || "").trim().toUpperCase();
}

function getAppliedDiscountState() {
  if (
    window.AXIOM_DISCOUNT_CODES_UI &&
    typeof window.AXIOM_DISCOUNT_CODES_UI.getAppliedDiscount === "function"
  ) {
    const result = window.AXIOM_DISCOUNT_CODES_UI.getAppliedDiscount();
    return {
      code: normalizeDiscountCode(result?.code || ""),
      discountAmount: toNumber(result?.discountAmount, 0),
      discountType: String(result?.discountType || ""),
      discountValue: toNumber(result?.discountValue, 0),
      description: String(result?.description || ""),
      isApplied: result?.isApplied === true
    };
  }

  const sessionCode = normalizeDiscountCode(axiomCurrentCheckoutSession?.discount_code || "");
  const sessionAmount = toNumber(axiomCurrentCheckoutSession?.discount_amount, 0);

  return {
    code: sessionCode,
    discountAmount: sessionAmount,
    discountType: "",
    discountValue: 0,
    description: "",
    isApplied: Boolean(sessionCode && sessionAmount > 0)
  };
}

function getEffectiveDiscountAmount(subtotal) {
  const discountState = getAppliedDiscountState();
  return Math.min(toNumber(discountState.discountAmount, 0), Math.max(toNumber(subtotal, 0), 0));
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

  const discountAmount = Number(
    session.discount_amount !== undefined && session.discount_amount !== null
      ? session.discount_amount
      : 0
  );

  const totalAmount = Number(
    session.total_amount !== undefined && session.total_amount !== null
      ? session.total_amount
      : session.total !== undefined && session.total !== null
        ? session.total
        : subtotal - discountAmount + shippingAmount + taxAmount
  );

  return {
    ...session,
    cart_items: cartItems,
    subtotal: subtotal,
    shipping_amount: shippingAmount,
    tax_amount: taxAmount,
    discount_amount: discountAmount,
    discount_code: normalizeDiscountCode(session.discount_code || ""),
    total_amount: totalAmount,
    shipping_selection: shippingSelection,
    shipping_address: shippingAddress,
    billing_address: billingAddress,
    customer_email: session.customer_email || session.contact?.email || "",
    customer_phone: session.customer_phone || session.contact?.phone || "",
    customer_first_name: session.customer_first_name || shippingAddress.first_name || "",
    customer_last_name: session.customer_last_name || shippingAddress.last_name || "",
    payment_method: normalizePaymentMethodValue(session.payment_method || "")
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

function setValidationMessage(id, message) {
  const el = document.getElementById(id);
  if (!el) return;

  if (message) {
    el.textContent = message;
    el.classList.add("active");
  } else {
    el.textContent = "";
    el.classList.remove("active");
  }
}

function setShippingStatus(message, type) {
  const statusEl = document.getElementById("shippingAddressStatus");
  if (!statusEl) return;

  statusEl.textContent = message || "";
  statusEl.classList.remove("error", "success");

  if (type === "error") {
    statusEl.classList.add("error");
  }

  if (type === "success") {
    statusEl.classList.add("success");
  }
}

function validateEmailValue(value) {
  const email = String(value || "").trim();
  if (!email) return "Email address is required.";

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return "Please enter a valid email address.";
  }

  return "";
}

function validatePhoneValue(value) {
  const phone = String(value || "").trim();
  if (!phone) return "";

  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) {
    return "Please enter a valid phone number or leave it blank.";
  }

  return "";
}

function getCheckoutShippingAddress() {
  const countryEl = document.getElementById("country");

  return {
    first_name: document.getElementById("firstName")?.value.trim() || "",
    last_name: document.getElementById("lastName")?.value.trim() || "",
    address1: document.getElementById("address1")?.value.trim() || "",
    address2: document.getElementById("address2")?.value.trim() || "",
    city: document.getElementById("city")?.value.trim() || "",
    state: document.getElementById("state")?.value.trim() || "",
    zip: document.getElementById("zip")?.value.trim() || "",
    phone: document.getElementById("phone")?.value.trim() || "",
    country: countryEl?.value?.trim() || "US"
  };
}

function getCheckoutBillingAddress() {
  return getCheckoutShippingAddress();
}

function validateAddressFields(showMessages = false) {
  const address = getCheckoutShippingAddress();
  const missing = [];

  if (!address.first_name) missing.push("first name");
  if (!address.last_name) missing.push("last name");
  if (!address.address1) missing.push("street address");
  if (!address.city) missing.push("city");
  if (!address.state) missing.push("state / province / region");
  if (!address.zip) missing.push("ZIP / postal code");
  if (!address.country) missing.push("country");

  let message = "";
  if (missing.length) {
    message = `Please enter your ${missing.join(", ")}.`;
  }

  if (showMessages) {
    setValidationMessage("checkoutAddressError", message);
  }

  return {
    isValid: !message,
    message: message,
    address: address
  };
}

function isAddressReadyForRates() {
  return validateAddressFields(false).isValid;
}

function getSelectedPaymentMethod() {
  const checked = document.querySelector('input[name="paymentMethod"]:checked');
  return checked ? normalizePaymentMethodValue(checked.value) : null;
}

function applySelectedPaymentMethodToUI(paymentMethod) {
  const normalized = normalizePaymentMethodValue(paymentMethod);
  if (!normalized) return;

  const radios = document.querySelectorAll('input[name="paymentMethod"]');
  if (!radios.length) return;

  radios.forEach((radio) => {
    radio.checked = normalizePaymentMethodValue(radio.value) === normalized;

    const option = radio.closest(".checkout-payment-option");
    if (option) {
      option.classList.toggle("active", radio.checked);
    }
  });
}

function bindPaymentMethodInputs() {
  const radios = document.querySelectorAll('input[name="paymentMethod"]');
  if (!radios.length) return;

  const savedPaymentMethod = normalizePaymentMethodValue(axiomCurrentCheckoutSession?.payment_method || "");
  if (savedPaymentMethod) {
    applySelectedPaymentMethodToUI(savedPaymentMethod);
  }

  radios.forEach((radio) => {
    if (radio.dataset.bound === "true") return;
    radio.dataset.bound = "true";

    radio.addEventListener("change", async function () {
      applySelectedPaymentMethodToUI(this.value);
      await syncCheckoutSessionFromForm();
      renderCheckoutSummary();
    });
  });
}

function getSelectedShippingSelectionObject() {
  const selectedInput = getSelectedShippingInput();
  const selectedOption = selectedInput?.closest(".shipping-option");
  const methodName =
    selectedInput?.dataset.methodName ||
    selectedOption?.querySelector(".shipping-option-name")?.textContent?.trim() ||
    selectedOption?.querySelector("span")?.textContent?.trim() ||
    "";

  const etaText =
    selectedInput?.dataset.eta ||
    selectedOption?.querySelector(".shipping-option-eta")?.textContent?.trim() ||
    "";

  const selectedCode =
    selectedInput?.dataset.code ||
    methodName.toLowerCase().replace(/\s+/g, "_");

  const countryCode = document.getElementById("country")?.value?.trim() || "US";

  return {
    method_name: methodName,
    method_code: selectedCode,
    label: methodName,
    code: selectedCode,
    carrier: methodName.includes("USPS") ? "USPS" : (countryCode === "US" ? "USPS" : "International"),
    service_level: etaText || methodName,
    amount: getSelectedShippingValue(),
    eta: etaText
  };
}

function getShippingRateContext(itemsOverride) {
  const items = Array.isArray(itemsOverride) ? itemsOverride : getCurrentSessionItems();
  const countryCode = document.getElementById("country")?.value?.trim() || "US";
  const postalCode = document.getElementById("zip")?.value?.trim() || "";

  let weightOz = 0;
  let itemCount = 0;

  if (window.AXIOM_SHIPPING_WEIGHTS) {
    if (typeof window.AXIOM_SHIPPING_WEIGHTS.getTotalWeightOz === "function") {
      weightOz = Number(window.AXIOM_SHIPPING_WEIGHTS.getTotalWeightOz(items) || 0);
    }

    if (typeof window.AXIOM_SHIPPING_WEIGHTS.getTotalItemCount === "function") {
      itemCount = Number(window.AXIOM_SHIPPING_WEIGHTS.getTotalItemCount(items) || 0);
    }
  }

  if (!weightOz) {
    weightOz = items.reduce((sum, item) => {
      return sum + (getItemWeightOz(item) * getItemQuantity(item));
    }, 0);
  }

  if (!itemCount) {
    itemCount = items.reduce((sum, item) => {
      return sum + getItemQuantity(item);
    }, 0);
  }

  return {
    items: items,
    countryCode: countryCode,
    postalCode: postalCode,
    weightOz: Number(weightOz || 0),
    itemCount: Number(itemCount || 0)
  };
}

function calculateEstimatedRates(items) {
  const context = getShippingRateContext(items);

  if (window.AXIOM_SHIPPING_RATES && typeof window.AXIOM_SHIPPING_RATES.getRates === "function") {
    return window.AXIOM_SHIPPING_RATES.getRates({
      countryCode: context.countryCode,
      postalCode: context.postalCode,
      weightOz: context.weightOz,
      itemCount: context.itemCount
    });
  }

  const totalWeightOz = context.weightOz;
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

  return {
    countryCode: context.countryCode,
    postalCode: context.postalCode,
    itemCount: context.itemCount,
    weightOz: totalWeightOz,
    weightLbs: totalWeightOz / 16,
    isDomestic: context.countryCode === "US",
    methods: [
      { id: "usps_ground_advantage", label: "USPS Ground Advantage", amount: ground, eta: "2–5 business days" },
      { id: "usps_priority_mail", label: "USPS Priority Mail", amount: priority, eta: "1–3 business days" }
    ]
  };
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
  const existingDiscountAmount = Number(axiomCurrentCheckoutSession?.discount_amount || 0);
  const existingDiscountCode = normalizeDiscountCode(axiomCurrentCheckoutSession?.discount_code || "");
  const totalAmount = subtotal - existingDiscountAmount + existingShippingAmount + existingTaxAmount;

  if (window.AXIOM_CART_CHECKOUT_SYNC && typeof window.AXIOM_CART_CHECKOUT_SYNC.syncToSession === "function") {
    await window.AXIOM_CART_CHECKOUT_SYNC.syncToSession({
      cart_items: normalizedItems,
      subtotal: subtotal,
      shipping_amount: existingShippingAmount,
      tax_amount: existingTaxAmount,
      discount_amount: existingDiscountAmount,
      discount_code: existingDiscountCode || null,
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
      discount_amount: existingDiscountAmount,
      discount_code: existingDiscountCode || null,
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
    session.discount_amount = existingDiscountAmount;
    session.discount_code = existingDiscountCode || null;
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
  const couponInputEl = document.getElementById("couponCodeInput");

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
  if (countryEl) {
    const nextCountry = shippingAddress.country || billingAddress.country || "US";
    if (!countryEl.value || countryEl.value === "US") {
      countryEl.value = nextCountry;
    }
  }
  if (couponInputEl && !couponInputEl.value && session.discount_code) {
    couponInputEl.value = session.discount_code;
  }

  if (session.payment_method) {
    applySelectedPaymentMethodToUI(session.payment_method);
  }
}

async function syncCheckoutSessionFromForm() {
  const items = normalizeCartItemsForSession(getCurrentSessionItems());
  const subtotal = calculateCartSubtotal(items);

  const shippingAmount = getSelectedShippingValue();
  const taxAmount = 0;
  const discountState = getAppliedDiscountState();
  const discountAmount = Math.min(toNumber(discountState.discountAmount, 0), Math.max(subtotal, 0));
  const discountCode = discountState.isApplied ? normalizeDiscountCode(discountState.code || "") : "";
  const totalAmount = Math.max(0, subtotal - discountAmount + shippingAmount + taxAmount);
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
      discount_amount: discountAmount,
      discount_code: discountCode || null,
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
    session.discount_amount = discountAmount;
    session.discount_code = discountCode || null;
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
    discount_amount: discountAmount,
    discount_code: discountCode || null,
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

function renderShippingRatesFromSession(forceRecalculate = false) {
  const ratesWrap = document.getElementById("shippingRates");
  if (!ratesWrap) return;

  const items = getCurrentSessionItems();

  if (!items.length) {
    ratesWrap.innerHTML = "";
    setShippingStatus("", "");
    return;
  }

  const addressCheck = validateAddressFields(true);
  if (!addressCheck.isValid) {
    ratesWrap.innerHTML = "";
    setShippingStatus("Enter a complete valid shipping address to see shipping methods.", "error");
    return;
  }

  const calculatedRates = calculateEstimatedRates(items);
  const methods = Array.isArray(calculatedRates?.methods) ? calculatedRates.methods : [];

  if (!methods.length) {
    ratesWrap.innerHTML = `
      <div class="shipping-empty-message">
        No shipping methods are available for this address.
      </div>
    `;
    setShippingStatus("No shipping methods available.", "error");
    return;
  }

  const savedSelection =
    !forceRecalculate &&
    axiomCurrentCheckoutSession &&
    axiomCurrentCheckoutSession.shipping_selection &&
    typeof axiomCurrentCheckoutSession.shipping_selection === "object"
      ? axiomCurrentCheckoutSession.shipping_selection
      : null;

  const savedCode = savedSelection?.method_code || savedSelection?.code || "";
  const fallbackCode = methods[0]?.id || "";
  const selectedCode = savedCode && methods.some((method) => method.id === savedCode)
    ? savedCode
    : fallbackCode;

  const weightLine = calculatedRates.weightOz
    ? `Order weight: ${Number(calculatedRates.weightOz).toFixed(1)} oz`
    : "";

  const areaLine = calculatedRates.isDomestic
    ? "Domestic shipping methods available."
    : "International shipping methods available.";

  setShippingStatus(
    [areaLine, weightLine].filter(Boolean).join(" "),
    "success"
  );

  ratesWrap.innerHTML = methods.map((method) => {
    const isChecked = method.id === selectedCode;

    return `
      <label class="shipping-option ${isChecked ? "active" : ""}">
        <input
          type="radio"
          name="shippingMethod"
          value="${Number(method.amount || 0).toFixed(2)}"
          data-code="${String(method.id || "").trim()}"
          data-method-name="${String(method.label || "").trim()}"
          data-eta="${String(method.eta || "").trim()}"
          ${isChecked ? "checked" : ""}
        />
        <div class="shipping-option-copy">
          <span class="shipping-option-name">${String(method.label || "").trim()}</span>
          ${method.eta ? `<small class="shipping-option-eta">${String(method.eta).trim()}</small>` : ""}
        </div>
        <strong>${formatMoney(method.amount)}</strong>
      </label>
    `;
  }).join("");

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
  const discountRowEl = document.getElementById("discountAmountRow");
  const discountAmountEl = document.getElementById("discountAmount");
  const appliedCouponCodeEl = document.getElementById("appliedCouponCode");

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

    if (discountRowEl) discountRowEl.hidden = true;
    if (discountAmountEl) discountAmountEl.textContent = "-$0.00";
    if (appliedCouponCodeEl) appliedCouponCodeEl.textContent = "";

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
  const discountState = getAppliedDiscountState();
  const discountAmount = Math.min(toNumber(discountState.discountAmount, 0), Math.max(subtotal, 0));
  const total = Math.max(0, subtotal - discountAmount + shippingAmount + taxAmount);

  subtotalEl.textContent = formatMoney(subtotal);
  shippingEl.textContent = shippingAmount > 0 ? formatMoney(shippingAmount) : "$0.00";
  taxEl.textContent = formatMoney(taxAmount);
  totalEl.textContent = formatMoney(total);

  if (discountRowEl && discountAmountEl && appliedCouponCodeEl) {
    if (discountState.isApplied && discountAmount > 0) {
      discountRowEl.hidden = false;
      discountAmountEl.textContent = `-${formatMoney(discountAmount)}`;
      appliedCouponCodeEl.textContent = discountState.code ? `(${discountState.code})` : "";
    } else {
      discountRowEl.hidden = true;
      discountAmountEl.textContent = "-$0.00";
      appliedCouponCodeEl.textContent = "";
    }
  }

  const topTotalEl = document.getElementById("checkoutSummaryTopTotal");
  if (topTotalEl) {
    topTotalEl.textContent = formatMoney(total);
  }

  const topSummaryTotalEl = document.getElementById("topSummaryTotal");
  if (topSummaryTotalEl) {
    topSummaryTotalEl.textContent = formatMoney(total);
  }

  const summaryStaticTotalEl = document.getElementById("summaryStaticTotal");
  if (summaryStaticTotalEl) {
    summaryStaticTotalEl.textContent = formatMoney(total);
  }

  const topSubtotalEl = document.getElementById("topSubtotal");
  if (topSubtotalEl) {
    topSubtotalEl.textContent = formatMoney(subtotal);
  }

  const topShippingEl = document.getElementById("topShipping");
  if (topShippingEl) {
    topShippingEl.textContent = shippingAmount > 0 ? formatMoney(shippingAmount) : "$0.00";
  }

  const topTaxEl = document.getElementById("topTax");
  if (topTaxEl) {
    topTaxEl.textContent = formatMoney(taxAmount);
  }

  const topTotalMirrorEl = document.getElementById("topTotal");
  if (topTotalMirrorEl) {
    topTotalMirrorEl.textContent = formatMoney(total);
  }

  const topDiscountRowEl = document.getElementById("topDiscountAmountRow");
  const topDiscountAmountEl = document.getElementById("topDiscountAmount");
  const topAppliedCouponCodeEl = document.getElementById("topAppliedCouponCode");

  if (topDiscountRowEl && topDiscountAmountEl && topAppliedCouponCodeEl) {
    if (discountState.isApplied && discountAmount > 0) {
      topDiscountRowEl.hidden = false;
      topDiscountAmountEl.textContent = `-${formatMoney(discountAmount)}`;
      topAppliedCouponCodeEl.textContent = discountState.code ? `(${discountState.code})` : "";
    } else {
      topDiscountRowEl.hidden = true;
      topDiscountAmountEl.textContent = "-$0.00";
      topAppliedCouponCodeEl.textContent = "";
    }
  }

  const topCheckoutItemsWrap = document.getElementById("topCheckoutItems");
  if (topCheckoutItemsWrap) {
    topCheckoutItemsWrap.innerHTML = itemsWrap.innerHTML;
  }
}

function setupRateButton() {
  const getRatesBtn = document.getElementById("getRates");
  const ratesWrap = document.getElementById("shippingRates");

  if (!getRatesBtn || !ratesWrap) return;

  getRatesBtn.addEventListener("click", async () => {
    const items = getCurrentSessionItems();

    if (!items.length) {
      ratesWrap.innerHTML = `
        <div class="shipping-empty-message">
          Your cart is empty.
        </div>
      `;
      setShippingStatus("Your cart is empty.", "error");
      renderCheckoutSummary();
      return;
    }

    const emailValue = document.getElementById("checkoutEmail")?.value.trim() || "";
    const emailError = validateEmailValue(emailValue);
    setValidationMessage("checkoutEmailError", emailError);

    const phoneValue = document.getElementById("phone")?.value.trim() || "";
    const phoneError = validatePhoneValue(phoneValue);
    setValidationMessage("checkoutPhoneError", phoneError);

    const addressCheck = validateAddressFields(true);

    if (emailError || phoneError || !addressCheck.isValid) {
      ratesWrap.innerHTML = "";
      setShippingStatus("Please enter a valid email and complete shipping address first.", "error");
      renderCheckoutSummary();
      return;
    }

    await syncCheckoutSessionFromForm();
    renderShippingRatesFromSession(true);
    await syncCheckoutSessionFromForm();
    renderCheckoutSummary();
  });
}

function bindLiveCheckoutTracking() {
  const form = document.getElementById("checkoutForm");
  if (!form) return;

  const inputs = form.querySelectorAll("input, select, textarea");
  const fieldsThatAffectRates = ["checkoutEmail", "firstName", "lastName", "address1", "city", "state", "zip", "country"];

  inputs.forEach((input) => {
    input.addEventListener("input", async function () {
      if (input.id === "checkoutEmail") {
        setValidationMessage("checkoutEmailError", validateEmailValue(input.value));
      }

      if (input.id === "phone") {
        setValidationMessage("checkoutPhoneError", validatePhoneValue(input.value));
      }

      if (
        input.id === "firstName" ||
        input.id === "lastName" ||
        input.id === "address1" ||
        input.id === "city" ||
        input.id === "state" ||
        input.id === "zip" ||
        input.id === "country"
      ) {
        validateAddressFields(true);
      }

      await syncCheckoutSessionFromForm();

      if (fieldsThatAffectRates.includes(input.id) && isAddressReadyForRates()) {
        renderShippingRatesFromSession(true);
        await syncCheckoutSessionFromForm();
      }

      renderCheckoutSummary();
    });

    input.addEventListener("change", async function () {
      if (input.id === "checkoutEmail") {
        setValidationMessage("checkoutEmailError", validateEmailValue(input.value));
      }

      if (input.id === "phone") {
        setValidationMessage("checkoutPhoneError", validatePhoneValue(input.value));
      }

      if (
        input.id === "firstName" ||
        input.id === "lastName" ||
        input.id === "address1" ||
        input.id === "city" ||
        input.id === "state" ||
        input.id === "zip" ||
        input.id === "country"
      ) {
        validateAddressFields(true);
      }

      await syncCheckoutSessionFromForm();

      if (fieldsThatAffectRates.includes(input.id) && isAddressReadyForRates()) {
        renderShippingRatesFromSession(true);
        await syncCheckoutSessionFromForm();
      }

      renderCheckoutSummary();
    });
  });
}

function bindDiscountHooks() {
  window.AXIOM_CHECKOUT_DISCOUNT_HOOKS = {
    getSubtotal: function () {
      return calculateCartSubtotal(getCurrentSessionItems());
    }
  };

  window.addEventListener("axiom-discount-updated", async function () {
    await syncCheckoutSessionFromForm();
    renderCheckoutSummary();
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
  bindPaymentMethodInputs();

  bindDiscountHooks();

  if (window.AXIOM_DISCOUNT_CODES_UI && typeof window.AXIOM_DISCOUNT_CODES_UI.init === "function") {
    window.AXIOM_DISCOUNT_CODES_UI.init();
  }

  validateAddressFields(false);
  renderCheckoutSummary();
  setupRateButton();
  bindLiveCheckoutTracking();

  if (isAddressReadyForRates()) {
    renderShippingRatesFromSession(false);
    await syncCheckoutSessionFromForm();
    renderCheckoutSummary();
  }

  if (axiomCurrentCheckoutSession?.discount_code) {
    const couponInput = document.getElementById("couponCodeInput");
    const applyCouponBtn = document.getElementById("applyCouponBtn");

    if (couponInput) {
      couponInput.value = axiomCurrentCheckoutSession.discount_code;
    }

    if (applyCouponBtn) {
      setTimeout(function () {
        applyCouponBtn.click();
      }, 250);
    }
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

    hydrateCheckoutFormFromSession(axiomCurrentCheckoutSession);
    bindPaymentMethodInputs();

    if (isAddressReadyForRates()) {
      renderShippingRatesFromSession(true);
      await syncCheckoutSessionFromForm();
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

      hydrateCheckoutFormFromSession(axiomCurrentCheckoutSession);
      bindPaymentMethodInputs();

      if (isAddressReadyForRates()) {
        renderShippingRatesFromSession(true);
        await syncCheckoutSessionFromForm();
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

  const emailValue = document.getElementById("checkoutEmail")?.value.trim() || "";
  const phoneValue = document.getElementById("phone")?.value.trim() || "";

  const emailError = validateEmailValue(emailValue);
  const phoneError = validatePhoneValue(phoneValue);
  const addressCheck = validateAddressFields(true);

  setValidationMessage("checkoutEmailError", emailError);
  setValidationMessage("checkoutPhoneError", phoneError);

  if (emailError) {
    e.preventDefault();
    alert(emailError);
    return;
  }

  if (phoneError) {
    e.preventDefault();
    alert(phoneError);
    return;
  }

  if (!addressCheck.isValid) {
    e.preventDefault();
    alert("Please complete your shipping address.");
    return;
  }

  const selectedPaymentMethod = getSelectedPaymentMethod();
  if (!selectedPaymentMethod) {
    e.preventDefault();
    alert("Please choose a payment method.");
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
      payment_method: selectedPaymentMethod,
      last_activity_at: new Date().toISOString()
    });
  } else if (hasLocalCheckoutSession()) {
    const session = window.AXIOM_CHECKOUT_SESSION.getSession();
    session.session_status = "pending_payment";
    session.payment_status = "unpaid";
    session.payment_method = selectedPaymentMethod;
    window.AXIOM_CHECKOUT_SESSION.saveSession(session);
  }
});
