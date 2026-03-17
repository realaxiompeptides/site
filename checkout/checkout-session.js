((function () {
  const CART_STORAGE_KEY = "axiom_cart";
  const SESSION_QUERY_PARAM = "axiom_session";

  let cachedSession = null;
  let activeSessionId = null;
  let ensureSessionPromise = null;

  function getSupabase() {
    if (!window.axiomSupabase) {
      throw new Error(
        "Supabase client missing. Load dashboard-config.js and supabase-client.js before checkout-session.js."
      );
    }
    return window.axiomSupabase;
  }

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
      return sum + (Number(item.price || item.unit_price || 0) * Number(item.quantity || item.qty || 0));
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
      notes: "",
      currency: "USD",
      order_number: null
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
    if (!normalized.contact.email && normalized.customer_email) {
      normalized.contact.email = normalized.customer_email;
    }
    if (!normalized.contact.phone && normalized.customer_phone) {
      normalized.contact.phone = normalized.customer_phone;
    }

    if (!normalized.customer_first_name && normalized.shipping_address?.first_name) {
      normalized.customer_first_name = normalized.shipping_address.first_name;
    }
    if (!normalized.customer_last_name && normalized.shipping_address?.last_name) {
      normalized.customer_last_name = normalized.shipping_address.last_name;
    }

    if (normalized.customer_first_name && !normalized.shipping_address.first_name) {
      normalized.shipping_address.first_name = normalized.customer_first_name;
    }
    if (normalized.customer_last_name && !normalized.shipping_address.last_name) {
      normalized.shipping_address.last_name = normalized.customer_last_name;
    }

    if (normalized.shipping_selection?.method_code && !normalized.shipping_method_code) {
      normalized.shipping_method_code = normalized.shipping_selection.method_code;
    }
    if (normalized.shipping_selection?.method_name && !normalized.shipping_method_name) {
      normalized.shipping_method_name = normalized.shipping_selection.method_name;
    }
    if (normalized.shipping_selection?.carrier && !normalized.shipping_carrier) {
      normalized.shipping_carrier = normalized.shipping_selection.carrier;
    }
    if (normalized.shipping_selection?.service_level && !normalized.shipping_service_level) {
      normalized.shipping_service_level = normalized.shipping_selection.service_level;
    }

    normalized.subtotal = Number(
      normalized.subtotal !== undefined && normalized.subtotal !== null
        ? normalized.subtotal
        : calculateSubtotal(normalized.cart_items)
    );

    normalized.shipping_amount = Number(
      normalized.shipping_amount !== undefined && normalized.shipping_amount !== null
        ? normalized.shipping_amount
        : normalized.shipping_selection?.amount || 0
    );

    normalized.tax_amount = Number(
      normalized.tax_amount !== undefined && normalized.tax_amount !== null
        ? normalized.tax_amount
        : normalized.tax || 0
    );

    normalized.discount_amount = Number(normalized.discount_amount || 0);

    normalized.total_amount = Number(
      normalized.total_amount !== undefined && normalized.total_amount !== null
        ? normalized.total_amount
        : normalized.subtotal + normalized.shipping_amount + normalized.tax_amount - normalized.discount_amount
    );

    normalized.tax = normalized.tax_amount;
    normalized.total = normalized.total_amount;

    return normalized;
  }

  function buildPersistedRow(session) {
    const normalized = normalizeSessionShape(session);
    const now = new Date().toISOString();

    return {
      session_id: normalized.session_id,
      session_status: normalized.session_status || "active",
      payment_status: normalized.payment_status || "unpaid",
      fulfillment_status: normalized.fulfillment_status || "unfulfilled",

      customer_email: normalized.customer_email || "",
      customer_phone: normalized.customer_phone || "",
      customer_first_name: normalized.customer_first_name || "",
      customer_last_name: normalized.customer_last_name || "",

      cart_items: normalized.cart_items,
      subtotal: Number(normalized.subtotal || 0),
      shipping_selection: normalized.shipping_selection || {},
      shipping_amount: Number(normalized.shipping_amount || 0),
      tax_amount: Number(normalized.tax_amount || 0),
      discount_amount: Number(normalized.discount_amount || 0),
      total_amount: Number(normalized.total_amount || 0),

      shipping_address: normalized.shipping_address || {},
      billing_address: normalized.billing_address || {},

      payment_method: normalized.payment_method || "",
      notes: normalized.notes || "",

      shipping_method_code: normalized.shipping_method_code || "",
      shipping_method_name: normalized.shipping_method_name || "",
      shipping_carrier: normalized.shipping_carrier || "",
      shipping_service_level: normalized.shipping_service_level || "",

      currency: normalized.currency || "USD",

      last_activity_at: now,
      updated_at: now
    };
  }

  function normalizeDbRow(row) {
    const merged = {
      ...row,
      contact: {
        email: row?.customer_email || "",
        phone: row?.customer_phone || ""
      }
    };

    return normalizeSessionShape(merged);
  }

  function setActiveSessionId(sessionId) {
    activeSessionId = sessionId || null;

    try {
      const url = new URL(window.location.href);
      if (activeSessionId) {
        url.searchParams.set(SESSION_QUERY_PARAM, activeSessionId);
      } else {
        url.searchParams.delete(SESSION_QUERY_PARAM);
      }
      window.history.replaceState({}, "", url.toString());
    } catch (error) {
      console.warn("Failed to update session query param", error);
    }
  }

  function getSessionIdFromUrl() {
    try {
      const url = new URL(window.location.href);
      return url.searchParams.get(SESSION_QUERY_PARAM) || "";
    } catch (error) {
      return "";
    }
  }

  async function fetchSessionBySessionId(sessionId) {
    if (!sessionId) return null;

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("checkout_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? normalizeDbRow(data) : null;
  }

  async function insertSession(session) {
    const supabase = getSupabase();
    const row = buildPersistedRow(session);

    const { data, error } = await supabase
      .from("checkout_sessions")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    const normalized = normalizeDbRow(data);
    cachedSession = normalized;
    setActiveSessionId(normalized.session_id);
    return normalized;
  }

  async function upsertSession(session) {
    const supabase = getSupabase();
    const row = buildPersistedRow(session);

    const { data, error } = await supabase
      .from("checkout_sessions")
      .upsert(row, { onConflict: "session_id" })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    const normalized = normalizeDbRow(data);
    cachedSession = normalized;
    setActiveSessionId(normalized.session_id);
    return normalized;
  }

  async function getSession(forceRefresh = false) {
    if (!forceRefresh && cachedSession && activeSessionId && cachedSession.session_id === activeSessionId) {
      return normalizeSessionShape(cachedSession);
    }

    const sessionId = activeSessionId || getSessionIdFromUrl();

    if (!sessionId) {
      const empty = getEmptySession();
      cachedSession = empty;
      activeSessionId = empty.session_id;
      return normalizeSessionShape(empty);
    }

    const found = await fetchSessionBySessionId(sessionId);

    if (found) {
      cachedSession = found;
      activeSessionId = found.session_id;
      return normalizeSessionShape(found);
    }

    const empty = getEmptySession();
    empty.session_id = sessionId;
    cachedSession = empty;
    activeSessionId = empty.session_id;
    return normalizeSessionShape(empty);
  }

  async function saveSession(session) {
    const normalized = normalizeSessionShape(session);
    const saved = await upsertSession(normalized);
    return normalizeSessionShape(saved);
  }

  async function ensureSession() {
    if (ensureSessionPromise) {
      return ensureSessionPromise;
    }

    ensureSessionPromise = (async function () {
      const existingId = activeSessionId || getSessionIdFromUrl();

      if (existingId) {
        const existing = await fetchSessionBySessionId(existingId);
        if (existing) {
          cachedSession = existing;
          setActiveSessionId(existing.session_id);
          return existing.session_id;
        }

        const newFromExistingId = getEmptySession();
        newFromExistingId.session_id = existingId;
        const insertedExistingId = await insertSession(newFromExistingId);
        return insertedExistingId.session_id;
      }

      const fresh = getEmptySession();
      const inserted = await insertSession(fresh);
      return inserted.session_id;
    })();

    try {
      return await ensureSessionPromise;
    } finally {
      ensureSessionPromise = null;
    }
  }

  async function syncCartIntoSession() {
    await ensureSession();

    const session = await getSession();
    const normalizedCart = getCart().map(normalizeCartItem);

    session.cart_items = normalizedCart;
    session.subtotal = calculateSubtotal(normalizedCart);

    const shippingAmount = Number(session.shipping_amount || session.shipping_selection?.amount || 0);
    const taxAmount = Number(session.tax_amount || session.tax || 0);
    const discountAmount = Number(session.discount_amount || 0);

    session.shipping_amount = shippingAmount;
    session.tax_amount = taxAmount;
    session.tax = taxAmount;
    session.discount_amount = discountAmount;
    session.total_amount = session.subtotal + shippingAmount + taxAmount - discountAmount;
    session.total = session.total_amount;

    return await saveSession(session);
  }

  async function patchSession(fields = {}) {
    await ensureSession();

    const session = await getSession();

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

    if (session.shipping_selection?.method_code) {
      session.shipping_method_code = session.shipping_selection.method_code;
    }
    if (session.shipping_selection?.method_name) {
      session.shipping_method_name = session.shipping_selection.method_name;
    }
    if (session.shipping_selection?.carrier) {
      session.shipping_carrier = session.shipping_selection.carrier;
    }
    if (session.shipping_selection?.service_level) {
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
    session.total_amount =
      Number(session.subtotal || 0) +
      Number(session.shipping_amount || 0) +
      Number(session.tax_amount || 0) -
      Number(session.discount_amount || 0);
    session.total = session.total_amount;

    return await saveSession(session);
  }

  async function updateContact(fields) {
    const session = await getSession();

    session.contact = {
      ...session.contact,
      ...(fields || {})
    };

    session.customer_email = session.contact.email || session.customer_email || "";
    session.customer_phone = session.contact.phone || session.customer_phone || "";

    return await saveSession(session);
  }

  async function updateShippingAddress(fields) {
    const session = await getSession();

    session.shipping_address = {
      ...session.shipping_address,
      ...(fields || {})
    };

    session.customer_first_name = session.shipping_address.first_name || session.customer_first_name || "";
    session.customer_last_name = session.shipping_address.last_name || session.customer_last_name || "";

    return await saveSession(session);
  }

  async function updateBillingAddress(fields) {
    const session = await getSession();

    session.billing_address = {
      ...session.billing_address,
      ...(fields || {})
    };

    return await saveSession(session);
  }

  async function updatePaymentMethod(paymentMethod) {
    const session = await getSession();
    session.payment_method = paymentMethod || "";
    return await saveSession(session);
  }

  async function updateShippingSelection(selection) {
    const session = await getSession();

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

    return await saveSession(session);
  }

  async function updateTax(taxAmount) {
    const session = await getSession();

    session.tax_amount = Number(taxAmount || 0);
    session.tax = session.tax_amount;
    session.total_amount =
      Number(session.subtotal || 0) +
      Number(session.shipping_amount || session.shipping_selection?.amount || 0) +
      Number(session.tax_amount || 0) -
      Number(session.discount_amount || 0);

    session.total = session.total_amount;

    return await saveSession(session);
  }

  async function updateSessionStatus(status) {
    const session = await getSession();
    session.session_status = status || "active";

    if (status === "abandoned") {
      session.abandoned_at = new Date().toISOString();
    }
    if (status === "converted") {
      session.completed_at = new Date().toISOString();
    }

    return await saveSession(session);
  }

  async function updateFromCheckoutForm() {
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

    await patchSession({
      customer_email: email,
      customer_phone: phone,
      customer_first_name: shippingFirstName,
      customer_last_name: shippingLastName,
      contact: {
        email: email,
        phone: phone
      },
      shipping_address: {
        first_name: shippingFirstName,
        last_name: shippingLastName,
        address1: shippingAddress1,
        address2: shippingAddress2,
        city: shippingCity,
        state: shippingState,
        zip: shippingZip,
        phone: phone,
        country: shippingCountry
      }
    });

    const billingSameCheckbox = document.getElementById("billingSameAsShipping");
    const billingSameAsShipping = billingSameCheckbox ? billingSameCheckbox.checked : true;

    if (billingSameAsShipping) {
      await patchSession({
        billing_address: {
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
        }
      });
    } else {
      await patchSession({
        billing_address: {
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
        }
      });
    }

    const selectedPayment = document.querySelector('input[name="paymentMethod"]:checked')?.value || "";
    await updatePaymentMethod(selectedPayment);

    const selectedShipping = document.querySelector('input[name="shippingMethod"]:checked');
    if (selectedShipping) {
      const shippingLabel = selectedShipping.closest(".shipping-option");
      const methodName = shippingLabel?.querySelector("span")?.textContent?.trim() || "";
      const methodCode = selectedShipping.dataset.code || methodName.toLowerCase().replace(/\s+/g, "_");

      await updateShippingSelection({
        method_name: methodName,
        method_code: methodCode,
        label: methodName,
        code: methodCode,
        amount: Number(selectedShipping.value || 0),
        carrier: methodName.toUpperCase().includes("USPS") ? "USPS" : "",
        service_level: methodName
      });
    }

    return await getSession(true);
  }

  function debounceAsync(fn, delay) {
    let timer = null;
    let pendingResolve = null;
    let pendingReject = null;

    return function debounced() {
      if (timer) {
        clearTimeout(timer);
      }

      return new Promise((resolve, reject) => {
        pendingResolve = resolve;
        pendingReject = reject;

        timer = setTimeout(async () => {
          timer = null;
          try {
            const result = await fn();
            if (pendingResolve) pendingResolve(result);
          } catch (error) {
            if (pendingReject) pendingReject(error);
          } finally {
            pendingResolve = null;
            pendingReject = null;
          }
        }, delay);
      });
    };
  }

  function bindCheckoutTracking() {
    ensureSession()
      .then(() => syncCartIntoSession())
      .catch((error) => {
        console.error("Failed to initialize checkout session", error);
      });

    const form = document.getElementById("checkoutForm");
    if (!form) return;

    const debouncedFormSync = debounceAsync(async function () {
      await syncCartIntoSession();
      return await updateFromCheckoutForm();
    }, 250);

    form.addEventListener("input", function () {
      debouncedFormSync().catch((error) => {
        console.error("Checkout form sync failed", error);
      });
    });

    form.addEventListener("change", function () {
      debouncedFormSync().catch((error) => {
        console.error("Checkout form sync failed", error);
      });
    });

    window.addEventListener("axiom-cart-updated", function () {
      syncCartIntoSession().catch((error) => {
        console.error("Cart-to-session sync failed", error);
      });
    });

    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") {
        getSession()
          .then((session) => saveSession(session))
          .catch((error) => {
            console.error("Failed to persist session before hide", error);
          });
      }
    });

    window.addEventListener("beforeunload", function () {
      const session = cachedSession ? normalizeSessionShape(cachedSession) : null;
      if (!session) return;

      try {
        const now = new Date().toISOString();
        const payload = {
          session_id: session.session_id,
          session_status: session.session_status || "active",
          payment_status: session.payment_status || "unpaid",
          fulfillment_status: session.fulfillment_status || "unfulfilled",
          customer_email: session.customer_email || "",
          customer_phone: session.customer_phone || "",
          customer_first_name: session.customer_first_name || "",
          customer_last_name: session.customer_last_name || "",
          cart_items: Array.isArray(session.cart_items) ? session.cart_items : [],
          subtotal: Number(session.subtotal || 0),
          shipping_selection: session.shipping_selection || {},
          shipping_amount: Number(session.shipping_amount || 0),
          tax_amount: Number(session.tax_amount || 0),
          discount_amount: Number(session.discount_amount || 0),
          total_amount: Number(session.total_amount || 0),
          shipping_address: session.shipping_address || {},
          billing_address: session.billing_address || {},
          payment_method: session.payment_method || "",
          notes: session.notes || "",
          shipping_method_code: session.shipping_method_code || "",
          shipping_method_name: session.shipping_method_name || "",
          shipping_carrier: session.shipping_carrier || "",
          shipping_service_level: session.shipping_service_level || "",
          currency: session.currency || "USD",
          updated_at: now,
          last_activity_at: now
        };

        const supabaseUrl =
          window.AXIOM_SUPABASE_URL ||
          window.SUPABASE_URL ||
          window.dashboardConfig?.supabaseUrl ||
          "";

        const supabaseAnonKey =
          window.AXIOM_SUPABASE_ANON_KEY ||
          window.SUPABASE_ANON_KEY ||
          window.dashboardConfig?.supabaseAnonKey ||
          "";

        if (!supabaseUrl || !supabaseAnonKey) return;

        const endpoint = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/checkout_sessions?on_conflict=session_id`;

        navigator.sendBeacon(
          endpoint,
          new Blob([JSON.stringify(payload)], {
            type: "application/json"
          })
        );
      } catch (error) {
        console.warn("beforeunload persistence skipped", error);
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
