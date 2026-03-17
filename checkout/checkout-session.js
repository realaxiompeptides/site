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
    return Number(item.price || item.variantPrice || item.unit_price || 0);
  }

  function normalizeCartItem(item) {
    const quantity = getItemQuantity(item);
    const price = getItemPrice(item);
    const variant = item.variantLabel || item.variant_label || item.variant || "";

    return {
      id: item.id || "",
      slug: item.slug || "",
      name: item.name || item.product_name || "Product",
      product_name: item.name || item.product_name || "Product",
      variantLabel: variant,
      variant_label: variant,
      variant: variant,
      price: price,
      unit_price: price,
      compareAtPrice:
        item.compareAtPrice !== undefined && item.compareAtPrice !== null
          ? Number(item.compareAtPrice) || null
          : item.oldPrice !== undefined && item.oldPrice !== null
            ? Number(item.oldPrice) || null
            : item.compare_at_price !== undefined && item.compare_at_price !== null
              ? Number(item.compare_at_price) || null
              : null,
      compare_at_price:
        item.compare_at_price !== undefined && item.compare_at_price !== null
          ? Number(item.compare_at_price) || null
          : item.compareAtPrice !== undefined && item.compareAtPrice !== null
            ? Number(item.compareAtPrice) || null
            : item.oldPrice !== undefined && item.oldPrice !== null
              ? Number(item.oldPrice) || null
              : null,
      quantity: quantity,
      qty: quantity,
      line_total: price * quantity,
      image: item.image || "",
      weightOz:
        item.weightOz !== undefined && item.weightOz !== null
          ? Number(item.weightOz) || 0
          : item.weight_oz !== undefined && item.weight_oz !== null
            ? Number(item.weight_oz) || 0
            : (String(item.id || "").toLowerCase().includes("bacwater") ? 9.6 : 0.188),
      weight_oz:
        item.weight_oz !== undefined && item.weight_oz !== null
          ? Number(item.weight_oz) || 0
          : item.weightOz !== undefined && item.weightOz !== null
            ? Number(item.weightOz) || 0
            : (String(item.id || "").toLowerCase().includes("bacwater") ? 9.6 : 0.188),
      inStock: item.inStock !== false && item.in_stock !== false,
      in_stock: item.inStock !== false && item.in_stock !== false
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
      payment_status: "unpaid",
      fulfillment_status: "unfulfilled",

      created_at: now,
      updated_at: now,
      last_activity_at: now,

      cart_items: [],
      subtotal: 0,
      shipping_amount: 0,
      tax_amount: 0,
      discount_amount: 0,
      total_amount: 0,

      shipping_selection: {
        method_name: "",
        method_code: "",
        label: "",
        code: "",
        amount: 0,
        carrier: "",
        service_level: ""
      },

      customer_email: "",
      customer_phone: "",
      customer_first_name: "",
      customer_last_name: "",

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
        phone: "",
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
        phone: "",
        country: "US"
      },

      payment_method: "",
      shipping_method_code: "",
      shipping_method_name: "",
      shipping_carrier: "",
      shipping_service_level: "",
      notes: ""
    };
  }

  function normalizeSessionShape(session) {
    const base = getEmptySession();
    const normalized = {
      ...base,
      ...(session || {})
    };

    normalized.contact = {
      ...base.contact,
      ...(session?.contact || {})
    };

    normalized.shipping_selection = {
      ...base.shipping_selection,
      ...(session?.shipping_selection || {})
    };

    normalized.shipping_address = {
      ...base.shipping_address,
      ...(session?.shipping_address || {})
    };

    normalized.billing_address = {
      ...base.billing_address,
      ...(session?.billing_address || {})
    };

    normalized.cart_items = Array.isArray(session?.cart_items)
      ? session.cart_items.map(normalizeCartItem)
      : [];

    if (!normalized.customer_email && normalized.contact?.email) {
      normalized.customer_email = normalized.contact.email;
    }

    if (!normalized.customer_phone && normalized.contact?.phone) {
      normalized.customer_phone = normalized.contact.phone;
    }

    if (!normalized.customer_first_name && normalized.shipping_address?.first_name) {
      normalized.customer_first_name = normalized.shipping_address.first_name;
    }

    if (!normalized.customer_last_name && normalized.shipping_address?.last_name) {
      normalized.customer_last_name = normalized.shipping_address.last_name;
    }

    normalized.subtotal = Number(normalized.subtotal || calculateSubtotal(normalized.cart_items));
    normalized.shipping_amount = Number(
      normalized.shipping_amount || normalized.shipping_selection?.amount || 0
    );
    normalized.tax_amount = Number(normalized.tax_amount || normalized.tax || 0);
    normalized.discount_amount = Number(normalized.discount_amount || 0);
    normalized.total_amount = Number(
      normalized.total_amount ||
      (normalized.subtotal + normalized.shipping_amount + normalized.tax_amount - normalized.discount_amount)
    );

    normalized.tax = normalized.tax_amount;
    normalized.total = normalized.total_amount;

    return normalized;
  }

  function getSession() {
    const session = readJson(CHECKOUT_SESSION_KEY, null);
    if (!session || typeof session !== "object") {
      return getEmptySession();
    }
    return normalizeSessionShape(session);
  }

  function saveSession(session) {
    const normalized = normalizeSessionShape(session);
    const now = new Date().toISOString();

    normalized.updated_at = now;
    normalized.last_activity_at = now;

    writeJson(CHECKOUT_SESSION_KEY, normalized);
    return normalized;
  }

  function ensureSession() {
    let session = readJson(CHECKOUT_SESSION_KEY, null);

    if (!session || typeof session !== "object" || !session.session_id) {
      session = getEmptySession();
      saveSession(session);
    } else {
      session = saveSession(session);
    }

    return session.session_id;
  }

  function syncCartIntoSession() {
    const session = getSession();
    const normalizedCart = getCart().map(normalizeCartItem);

    session.cart_items = normalizedCart;
    session.subtotal = calculateSubtotal(normalizedCart);

    const shippingAmount = Number(session.shipping_amount || session.shipping_selection?.amount || 0);
    const taxAmount = Number(session.tax_amount || session.tax || 0);
    const discountAmount = Number(session.discount_amount || 0);

    session.shipping_amount = shippingAmount;
    session.tax_amount = taxAmount;
    session.tax = taxAmount;
    session.total_amount = session.subtotal + shippingAmount + taxAmount - discountAmount;
    session.total = session.total_amount;

    return saveSession(session);
  }

  function patchSession(fields = {}) {
    const session = getSession();

    Object.keys(fields).forEach((key) => {
      const value = fields[key];

      if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        key !== "shipping_selection" &&
        key !== "shipping_address" &&
        key !== "billing_address" &&
        key !== "contact"
      ) {
        session[key] = {
          ...(session[key] || {}),
          ...value
        };
      } else if (
        key === "shipping_selection" ||
        key === "shipping_address" ||
        key === "billing_address" ||
        key === "contact"
      ) {
        session[key] = {
          ...(session[key] || {}),
          ...(value || {})
        };
      } else {
        session[key] = value;
      }
    });

    if (Array.isArray(session.cart_items)) {
      session.cart_items = session.cart_items.map(normalizeCartItem);
    } else {
      session.cart_items = [];
    }

    if (session.customer_email) {
      session.contact.email = session.customer_email;
    } else if (session.contact?.email) {
      session.customer_email = session.contact.email;
    }

    if (session.customer_phone) {
      session.contact.phone = session.customer_phone;
    } else if (session.contact?.phone) {
      session.customer_phone = session.contact.phone;
    }

    if (session.customer_first_name) {
      session.shipping_address.first_name = session.customer_first_name;
    } else if (session.shipping_address?.first_name) {
      session.customer_first_name = session.shipping_address.first_name;
    }

    if (session.customer_last_name) {
      session.shipping_address.last_name = session.customer_last_name;
    } else if (session.shipping_address?.last_name) {
      session.customer_last_name = session.shipping_address.last_name;
    }

    if (session.shipping_selection?.method_code && !session.shipping_method_code) {
      session.shipping_method_code = session.shipping_selection.method_code;
    }
    if (session.shipping_selection?.method_name && !session.shipping_method_name) {
      session.shipping_method_name = session.shipping_selection.method_name;
    }
    if (session.shipping_selection?.carrier && !session.shipping_carrier) {
      session.shipping_carrier = session.shipping_selection.carrier;
    }
    if (session.shipping_selection?.service_level && !session.shipping_service_level) {
      session.shipping_service_level = session.shipping_selection.service_level;
    }

    session.subtotal = Number(
      session.subtotal !== undefined && session.subtotal !== null
        ? session.subtotal
        : calculateSubtotal(session.cart_items)
    );

    session.shipping_amount = Number(
      session.shipping_amount !== undefined && session.shipping_amount !== null
        ? session.shipping_amount
        : session.shipping_selection?.amount || 0
    );

    session.tax_amount = Number(
      session.tax_amount !== undefined && session.tax_amount !== null
        ? session.tax_amount
        : session.tax || 0
    );

    session.tax = session.tax_amount;
    session.discount_amount = Number(session.discount_amount || 0);
    session.total_amount = Number(
      session.total_amount !== undefined && session.total_amount !== null
        ? session.total_amount
        : session.subtotal + session.shipping_amount + session.tax_amount - session.discount_amount
    );
    session.total = session.total_amount;

    saveSession(session);
    return Promise.resolve(session);
  }

  function updateContact(fields) {
    const session = syncCartIntoSession();
    session.contact = {
      ...session.contact,
      ...fields
    };

    session.customer_email = session.contact.email || session.customer_email || "";
    session.customer_phone = session.contact.phone || session.customer_phone || "";

    return saveSession(session);
  }

  function updateShippingAddress(fields) {
    const session = syncCartIntoSession();
    session.shipping_address = {
      ...session.shipping_address,
      ...fields
    };

    session.customer_first_name = session.shipping_address.first_name || session.customer_first_name || "";
    session.customer_last_name = session.shipping_address.last_name || session.customer_last_name || "";

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
      ...session.shipping_selection,
      method_name: selection?.method_name || selection?.label || "",
      method_code: selection?.method_code || selection?.code || "",
      label: selection?.label || selection?.method_name || "",
      code: selection?.code || selection?.method_code || "",
      amount: Number(selection?.amount || 0),
      carrier: selection?.carrier || "",
      service_level: selection?.service_level || selection?.method_name || selection?.label || ""
    };

    session.shipping_amount = Number(session.shipping_selection.amount || 0);
    session.shipping_method_code = session.shipping_selection.method_code || "";
    session.shipping_method_name = session.shipping_selection.method_name || "";
    session.shipping_carrier = session.shipping_selection.carrier || "";
    session.shipping_service_level = session.shipping_selection.service_level || "";

    session.total_amount =
      Number(session.subtotal || 0) +
      Number(session.shipping_amount || 0) +
      Number(session.tax_amount || session.tax || 0) -
      Number(session.discount_amount || 0);

    session.total = session.total_amount;

    return saveSession(session);
  }

  function updateTax(taxAmount) {
    const session = syncCartIntoSession();
    session.tax_amount = Number(taxAmount || 0);
    session.tax = session.tax_amount;
    session.total_amount =
      Number(session.subtotal || 0) +
      Number(session.shipping_amount || session.shipping_selection?.amount || 0) +
      Number(session.tax_amount || 0) -
      Number(session.discount_amount || 0);

    session.total = session.total_amount;

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
    const phone = document.getElementById("phone")?.value.trim() || "";
    const email = document.getElementById("checkoutEmail")?.value.trim() || "";

    updateContact({ email, phone });

    updateShippingAddress({
      first_name: shippingFirstName,
      last_name: shippingLastName,
      address1: shippingAddress1,
      address2: shippingAddress2,
      city: shippingCity,
      state: shippingState,
      zip: shippingZip,
      phone: phone,
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
        phone: phone,
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
        phone: document.getElementById("billingPhone")?.value.trim() || "",
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
        const methodCode = selectedShipping.dataset.code || methodName.toLowerCase().replace(/\s+/g, "_");

        updateShippingSelection({
          method_name: methodName,
          method_code: methodCode,
          label: methodName,
          code: methodCode,
          amount: Number(selectedShipping.value || 0),
          carrier: methodName.includes("USPS") ? "USPS" : "",
          service_level: methodName
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
    ensureSession,
    patchSession,
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
