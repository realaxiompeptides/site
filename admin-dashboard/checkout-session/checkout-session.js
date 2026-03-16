window.AXIOM_CHECKOUT_SESSION = {
  async ensureSession() {
    if (!window.axiomSupabase || !window.AXIOM_HELPERS) return null;

    const supabase = window.axiomSupabase;
    const helpers = window.AXIOM_HELPERS;

    const existingSessionId = helpers.getCheckoutSessionId();

    if (existingSessionId) {
      const { data: existing, error } = await supabase
        .from("checkout_sessions")
        .select("session_id")
        .eq("session_id", existingSessionId)
        .maybeSingle();

      if (!error && existing) {
        return existing.session_id;
      }
    }

    const sessionId = helpers.uuid();

    const { error: insertError } = await supabase.from("checkout_sessions").insert({
      session_id: sessionId,
      session_status: "active",
      customer_email: null,
      customer_phone: null,
      cart_items: [],
      subtotal: 0,
      shipping_selection: null,
      shipping_amount: 0,
      tax_amount: 0,
      total_amount: 0,
      shipping_address: null,
      billing_address: null,
      payment_method: null,
      notes: null,
      created_at: helpers.nowIso(),
      updated_at: helpers.nowIso(),
      last_activity_at: helpers.nowIso()
    });

    if (insertError) {
      console.error("Failed to create checkout session:", insertError);
      return null;
    }

    helpers.setCheckoutSessionId(sessionId);
    return sessionId;
  },

  async patchSession(payload) {
    if (!window.axiomSupabase || !window.AXIOM_HELPERS) return;

    const supabase = window.axiomSupabase;
    const helpers = window.AXIOM_HELPERS;
    const sessionId = await window.AXIOM_CHECKOUT_SESSION.ensureSession();

    if (!sessionId) return;

    const updatePayload = Object.assign({}, payload, {
      updated_at: helpers.nowIso(),
      last_activity_at: helpers.nowIso()
    });

    const { error } = await supabase
      .from("checkout_sessions")
      .update(updatePayload)
      .eq("session_id", sessionId);

    if (error) {
      console.error("Failed to update checkout session:", error);
    }
  },

  async markAbandoned() {
    await window.AXIOM_CHECKOUT_SESSION.patchSession({
      session_status: "abandoned"
    });
  },

  async markPendingPayment() {
    await window.AXIOM_CHECKOUT_SESSION.patchSession({
      session_status: "pending_payment"
    });
  },

  async markConverted() {
    await window.AXIOM_CHECKOUT_SESSION.patchSession({
      session_status: "converted"
    });
  }
};
