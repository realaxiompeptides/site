(function () {
  let cachedSession = null;
  let activeSessionId = null;
  let ensureSessionPromise = null;

  function getSupabase() {
    if (!window.axiomSupabase) {
      throw new Error("Supabase client is missing.");
    }
    return window.axiomSupabase;
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
      shipping_selection: {},
      customer_email: "",
      customer_phone: "",
      customer_first_name: "",
      customer_last_name: "",
      shipping_address: {},
      billing_address: {},
      payment_method: "",
      shipping_method_code: "",
      shipping_method_name: "",
      shipping_carrier: "",
      shipping_service_level: "",
      notes: "",
      currency: "USD"
    };
  }

  function normalizeSession(session) {
    const base = getEmptySession();
    const normalized = {
      ...base,
      ...(session || {})
    };

    normalized.cart_items = Array.isArray(normalized.cart_items)
      ? normalized.cart_items
      : [];

    normalized.shipping_selection =
      normalized.shipping_selection && typeof normalized.shipping_selection === "object"
        ? normalized.shipping_selection
        : {};

    normalized.shipping_address =
      normalized.shipping_address && typeof normalized.shipping_address === "object"
        ? normalized.shipping_address
        : {};

    normalized.billing_address =
      normalized.billing_address && typeof normalized.billing_address === "object"
        ? normalized.billing_address
        : {};

    normalized.subtotal = Number(normalized.subtotal || 0);
    normalized.shipping_amount = Number(normalized.shipping_amount || 0);
    normalized.tax_amount = Number(normalized.tax_amount || 0);
    normalized.discount_amount = Number(normalized.discount_amount || 0);
    normalized.total_amount = Number(
      normalized.total_amount ||
      (
        normalized.subtotal +
        normalized.shipping_amount +
        normalized.tax_amount -
        normalized.discount_amount
      )
    );

    return normalized;
  }

  async function fetchSessionById(sessionId) {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("checkout_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? normalizeSession(data) : null;
  }

  async function upsertSession(session) {
    const supabase = getSupabase();
    const normalized = normalizeSession(session);
    const now = new Date().toISOString();

    const payload = {
      ...normalized,
      updated_at: now,
      last_activity_at: now
    };

    const { data, error } = await supabase
      .from("checkout_sessions")
      .upsert(payload, { onConflict: "session_id" })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    cachedSession = normalizeSession(data);
    activeSessionId = cachedSession.session_id;

    return cachedSession;
  }

  async function ensureSession() {
    if (ensureSessionPromise) {
      return ensureSessionPromise;
    }

    ensureSessionPromise = (async function () {
      if (activeSessionId) {
        const existing = await fetchSessionById(activeSessionId);
        if (existing) {
          cachedSession = existing;
          return existing.session_id;
        }
      }

      const fresh = getEmptySession();
      const saved = await upsertSession(fresh);
      return saved.session_id;
    })();

    try {
      return await ensureSessionPromise;
    } finally {
      ensureSessionPromise = null;
    }
  }

  async function getSession(forceRefresh = false) {
    if (!forceRefresh && cachedSession) {
      return normalizeSession(cachedSession);
    }

    const sessionId = activeSessionId || await ensureSession();
    const found = await fetchSessionById(sessionId);

    if (found) {
      cachedSession = found;
      activeSessionId = found.session_id;
      return normalizeSession(found);
    }

    const fresh = getEmptySession();
    fresh.session_id = sessionId;
    return await upsertSession(fresh);
  }

  async function saveSession(session) {
    return await upsertSession(session);
  }

  async function patchSession(fields = {}) {
    const current = await getSession();
    const merged = normalizeSession({
      ...current,
      ...(fields || {}),
      shipping_selection: {
        ...(current.shipping_selection || {}),
        ...((fields && fields.shipping_selection) || {})
      },
      shipping_address: {
        ...(current.shipping_address || {}),
        ...((fields && fields.shipping_address) || {})
      },
      billing_address: {
        ...(current.billing_address || {}),
        ...((fields && fields.billing_address) || {})
      }
    });

    merged.total_amount =
      Number(merged.subtotal || 0) +
      Number(merged.shipping_amount || 0) +
      Number(merged.tax_amount || 0) -
      Number(merged.discount_amount || 0);

    return await saveSession(merged);
  }

  async function syncCartIntoSession() {
    const current = await getSession();
    const cartItems = Array.isArray(current.cart_items) ? current.cart_items : [];

    const subtotal = cartItems.reduce((sum, item) => {
      return sum + (
        Number(item.unit_price || item.price || 0) *
        Number(item.quantity || item.qty || 1)
      );
    }, 0);

    return await patchSession({
      cart_items: cartItems,
      subtotal: subtotal
    });
  }

  async function updateContact(fields) {
    return await patchSession({
      customer_email: fields?.email || "",
      customer_phone: fields?.phone || ""
    });
  }

  async function updateShippingAddress(fields) {
    return await patchSession({
      customer_first_name: fields?.first_name || "",
      customer_last_name: fields?.last_name || "",
      shipping_address: fields || {}
    });
  }

  async function updateBillingAddress(fields) {
    return await patchSession({
      billing_address: fields || {}
    });
  }

  async function updatePaymentMethod(paymentMethod) {
    return await patchSession({
      payment_method: paymentMethod || ""
    });
  }

  async function updateShippingSelection(selection) {
    return await patchSession({
      shipping_selection: selection || {},
      shipping_amount: Number(selection?.amount || 0),
      shipping_method_code: selection?.method_code || selection?.code || "",
      shipping_method_name: selection?.method_name || selection?.label || "",
      shipping_carrier: selection?.carrier || "",
      shipping_service_level: selection?.service_level || selection?.label || ""
    });
  }

  async function updateTax(taxAmount) {
    return await patchSession({
      tax_amount: Number(taxAmount || 0)
    });
  }

  async function updateSessionStatus(status) {
    return await patchSession({
      session_status: status || "active"
    });
  }

  async function updateFromCheckoutForm() {
    const email = document.getElementById("checkoutEmail")?.value.trim() || "";
    const phone = document.getElementById("phone")?.value.trim() || "";

    const shippingAddress = {
      first_name: document.getElementById("firstName")?.value.trim() || "",
      last_name: document.getElementById("lastName")?.value.trim() || "",
      address1: document.getElementById("address1")?.value.trim() || "",
      address2: document.getElementById("address2")?.value.trim() || "",
      city: document.getElementById("city")?.value.trim() || "",
      state: document.getElementById("state")?.value.trim() || "",
      zip: document.getElementById("zip")?.value.trim() || "",
      phone: phone,
      country: document.getElementById("country")?.value.trim() || "US"
    };

    await patchSession({
      customer_email: email,
      customer_phone: phone,
      customer_first_name: shippingAddress.first_name,
      customer_last_name: shippingAddress.last_name,
      shipping_address: shippingAddress,
      billing_address: shippingAddress
    });
  }

  function bindCheckoutTracking() {
    document.addEventListener("DOMContentLoaded", async function () {
      try {
        await ensureSession();
        await updateFromCheckoutForm();
      } catch (error) {
        console.error("Checkout session init failed:", error);
      }
    });
  }

  console.log("AXIOM_CHECKOUT_SESSION about to be assigned");

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

  console.log("AXIOM_CHECKOUT_SESSION assigned", !!window.AXIOM_CHECKOUT_SESSION);
})();
