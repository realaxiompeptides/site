(function () {
  const CHECKOUT_SESSION_KEY = "axiom_checkout_session";
  const CART_STORAGE_KEY = "axiom_cart";

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch (error) {
      console.error(`Failed to read ${key}`, error);
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to write ${key}`, error);
    }
  }

  function getCart() {
    const cart = readJson(CART_STORAGE_KEY, []);
    return Array.isArray(cart) ? cart : [];
  }

  function getItemQuantity(item) {
    return Number(item.quantity || item.qty || 0);
  }

  function getItemPrice(item) {
    return Number(item.price || item.variantPrice || 0);
  }

  function normalizeCartItem(item) {
    const quantity = getItemQuantity(item);

    return {
      id: item.id || "",
      slug: item.slug || "",
      name: item.name || "Product",
      variantLabel: item.variantLabel || item.variant || "",
      price: getItemPrice(item),
      compareAtPrice:
        item.compareAtPrice !== undefined && item.compareAtPrice !== null
          ? Number(item.compareAtPrice) || null
          : item.oldPrice !== undefined && item.oldPrice !== null
            ? Number(item.oldPrice) || null
            : null,
      quantity,
      image: item.image || "",
      weightOz:
        item.weightOz !== undefined && item.weightOz !== null
          ? Number(item.weightOz) || 0
          : (String(item.id || "").toLowerCase().includes("bacwater") ? 9.6 : 0.188)
    };
  }

  function calculateSubtotal(items) {
    return items.reduce((sum, item) => {
      return sum + (Number(item.price || 0) * Number(item.quantity || 0));
    }, 0);
  }

  function generateSessionId() {
    const random = Math.random().toString(36).slice(2, 10).toUpperCase();
    const stamp = Date.now().toString(36).toUpperCase();
    return `CHK-${stamp}-${random}`;
  }

  function getEmptySession() {
    const now = new Date().toISOString();

    return {
      session_id: generateSessionId(),
      session_status: "active",
      created_at: now,
      updated_at: now,
      last_activity_at: now,

      cart_items: [],
      subtotal: 0,
      shipping_selection: {
        method_name: "",
        method_code: "",
        amount: 0
      },
      tax: 0,
      total: 0,

      contact: {
        email: "",
        phone: ""
      },

      shipping_address: {
        first_name: "",
        last_name: "",
        address1: "",
        address2: "",
        city: "",
        state: "",
        zip: "",
        country: "US"
      },

      billing_address: {
        same_as_shipping: true,
        first_name: "",
        last_name: "",
        address1: "",
        address2: "",
        city: "",
        state: "",
        zip: "",
        country: "US"
      },

      payment_method: "",
      notes: ""
    };
  }

  function getSession() {
    const session = readJson(CHECKOUT_SESSION_KEY, null);
    if (!session || typeof session !== "object") {
      return getEmptySession();
    }
    return session;
  }

  function saveSession(session) {
    const now = new Date().toISOString();
    session.updated_at = now;
    session.last_activity_at = now;
    writeJson(CHECKOUT_SESSION_KEY, session);
    return session;
  }

  function syncCartIntoSession() {
    const session = getSession();
    const normalizedCart = getCart().map(normalizeCartItem);

    session.cart_items = normalizedCart;
    session.subtotal = calculateSubtotal(normalizedCart);

    const shippingAmount = Number(session.shipping_selection?.amount || 0);
    const tax = Number(session.tax || 0);

    session.total = session.subtotal + shippingAmount + tax;

    return saveSession(session);
  }

  function updateContact(fields) {
    const session = syncCartIntoSession();
    session.contact = {
      ...session.contact,
      ...fields
    };
    return saveSession(session);
  }

  function updateShippingAddress(fields) {
    const session = syncCartIntoSession();
    session.shipping_address = {
      ...session.shipping_address,
      ...fields
    };
    return saveSession(session);
  }

  function updateBillingAddress(fields) {
    const session = syncCartIntoSession();
    session.billing_address = {
      ...session.billing_address,
      ...fields
    };
    return saveSession(session);
  }

  function updatePaymentMethod(paymentMethod) {
    const session = syncCartIntoSession();
    session.payment_method = paymentMethod || "";
    return saveSession(session);
  }

  function updateShippingSelection(selection) {
    const session = syncCartIntoSession();

    session.shipping_selection = {
      method_name: selection?.method_name || "",
      method_code: selection?.method_code || "",
      amount: Number(selection?.amount || 0)
    };

    session.total =
      Number(session.subtotal || 0) +
      Number(session.shipping_selection.amount || 0) +
      Number(session.tax || 0);

    return saveSession(session);
  }

  function updateTax(taxAmount) {
    const session = syncCartIntoSession();
    session.tax = Number(taxAmount || 0);
    session.total =
      Number(session.subtotal || 0) +
      Number(session.shipping_selection?.amount || 0) +
      Number(session.tax || 0);

    return saveSession(session);
  }

  function updateSessionStatus(status) {
    const session = syncCartIntoSession();
    session.session_status = status;
    return saveSession(session);
  }

  function updateFromCheckoutForm() {
    const shippingFirstName = document.getElementById("firstName")?.value.trim() || "";
    const shippingLastName = document.getElementById("lastName")?.value.trim() || "";
    const shippingAddress1 = document.getElementById("address1")?.value.trim() || "";
    const shippingAddress2 = document.getElementById("address2")?.value.trim() || "";
    const shippingCity = document.getElementById("city")?.value.trim() || "";
    const shippingState = document.getElementById("state")?.value.trim() || "";
    const shippingZip = document.getElementById("zip")?.value.trim() || "";
    const shippingCountry = document.getElementById("country")?.value.trim() || "US";

    const email = document.getElementById("checkoutEmail")?.value.trim() || "";
    const phone = document.getElementById("phone")?.value.trim() || "";

    updateContact({ email, phone });

    updateShippingAddress({
      first_name: shippingFirstName,
      last_name: shippingLastName,
      address1: shippingAddress1,
      address2: shippingAddress2,
      city: shippingCity,
      state: shippingState,
      zip: shippingZip,
      country: shippingCountry
    });

    const billingSameCheckbox = document.getElementById("billingSameAsShipping");
    const billingSameAsShipping = billingSameCheckbox ? billingSameCheckbox.checked : true;

    if (billingSameAsShipping) {
      updateBillingAddress({
        same_as_shipping: true,
        first_name: shippingFirstName,
        last_name: shippingLastName,
        address1: shippingAddress1,
        address2: shippingAddress2,
        city: shippingCity,
        state: shippingState,
        zip: shippingZip,
        country: shippingCountry
      });
    } else {
      updateBillingAddress({
        same_as_shipping: false,
        first_name: document.getElementById("billingFirstName")?.value.trim() || "",
        last_name: document.getElementById("billingLastName")?.value.trim() || "",
        address1: document.getElementById("billingAddress1")?.value.trim() || "",
        address2: document.getElementById("billingAddress2")?.value.trim() || "",
        city: document.getElementById("billingCity")?.value.trim() || "",
        state: document.getElementById("billingState")?.value.trim() || "",
        zip: document.getElementById("billingZip")?.value.trim() || "",
        country: document.getElementById("billingCountry")?.value.trim() || "US"
      });
    }

    const selectedPayment = document.querySelector('input[name="paymentMethod"]:checked')?.value || "";
    updatePaymentMethod(selectedPayment);
  }

  function bindCheckoutTracking() {
    syncCartIntoSession();

    const form = document.getElementById("checkoutForm");
    if (!form) return;

    form.addEventListener("input", function () {
      updateFromCheckoutForm();
    });

    form.addEventListener("change", function () {
      updateFromCheckoutForm();

      const selectedShipping = document.querySelector('input[name="shippingMethod"]:checked');
      if (selectedShipping) {
        const shippingLabel = selectedShipping.closest(".shipping-option");
        const methodName = shippingLabel?.querySelector("span")?.textContent?.trim() || "";
        const methodCode = methodName.toLowerCase().replace(/\s+/g, "_");

        updateShippingSelection({
          method_name: methodName,
          method_code: methodCode,
          amount: Number(selectedShipping.value || 0)
        });
      }

      const selectedPayment = document.querySelector('input[name="paymentMethod"]:checked');
      if (selectedPayment) {
        updatePaymentMethod(selectedPayment.value);
      }
    });

    window.addEventListener("axiom-cart-updated", function () {
      syncCartIntoSession();
    });

    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") {
        saveSession(getSession());
      }
    });
  }

  window.AXIOM_CHECKOUT_SESSION = {
    getSession,
    saveSession,
    syncCartIntoSession,
    updateContact,
    updateShippingAddress,
    updateBillingAddress,
    updatePaymentMethod,
    updateShippingSelection,
    updateTax,
    updateSessionStatus,
    updateFromCheckoutForm,
    bindCheckoutTracking
  };
})();
