window.AXIOM_ORDER_ACTIONS = (function () {
  function nowIso() {
    return new Date().toISOString();
  }

  async function updateOrder(orderId, payload) {
    if (!window.axiomSupabase || !orderId) {
      console.error("Missing Supabase client or order id.");
      return { ok: false };
    }

    const { data, error } = await window.axiomSupabase
      .from("orders")
      .update({
        ...payload,
        updated_at: nowIso()
      })
      .eq("id", orderId)
      .select("*")
      .single();

    if (error) {
      console.error("Failed to update order:", error);
      alert("Failed to update order.");
      return { ok: false, error };
    }

    return { ok: true, data };
  }

  async function updateCheckoutSessionByLinkedOrder(order, payload) {
    if (!window.axiomSupabase || !order?.checkout_session_id) {
      return { ok: false };
    }

    const { data, error } = await window.axiomSupabase
      .from("checkout_sessions")
      .update({
        ...payload,
        updated_at: nowIso(),
        last_activity_at: nowIso()
      })
      .eq("id", order.checkout_session_id)
      .select("*")
      .single();

    if (error) {
      console.error("Failed to update checkout session:", error);
      return { ok: false, error };
    }

    return { ok: true, data };
  }

  async function logOrderEvent(order, eventType, eventLabel, eventData) {
    if (!window.axiomSupabase || !order?.id) return;

    const payload = {
      order_id: order.id,
      checkout_session_id: order.checkout_session_id || null,
      event_type: eventType,
      event_label: eventLabel,
      event_data: eventData || {},
      created_at: nowIso()
    };

    const { error } = await window.axiomSupabase
      .from("order_events")
      .insert(payload);

    if (error) {
      console.error("Failed to log order event:", error);
    }
  }

  async function fulfillOrder(order, paymentMethod) {
    if (!order?.id) {
      alert("Missing order.");
      return { ok: false };
    }

    const orderUpdate = await updateOrder(order.id, {
      payment_method: paymentMethod,
      payment_status: "paid",
      fulfillment_status: "fulfilled",
      order_status: "processing",
      payment_collected_at: nowIso(),
      completed_at: nowIso()
    });

    if (!orderUpdate.ok) return orderUpdate;

    await updateCheckoutSessionByLinkedOrder(order, {
      payment_method: paymentMethod,
      payment_status: "paid",
      fulfillment_status: "fulfilled",
      session_status: "converted",
      payment_collected_at: nowIso(),
      completed_at: nowIso()
    });

    await logOrderEvent(order, "fulfilled", "Order fulfilled", {
      payment_method: paymentMethod,
      payment_status: "paid",
      fulfillment_status: "fulfilled",
      order_status: "processing"
    });

    if (
      window.AXIOM_DASHBOARD_APP &&
      typeof window.AXIOM_DASHBOARD_APP.refreshAllDashboardData === "function"
    ) {
      await window.AXIOM_DASHBOARD_APP.refreshAllDashboardData();
    }

    return { ok: true };
  }

  async function markShipped(order, trackingNumber = "", trackingUrl = "") {
    if (!order?.id) {
      alert("Missing order.");
      return { ok: false };
    }

    const orderUpdate = await updateOrder(order.id, {
      fulfillment_status: "shipped",
      order_status: "completed",
      tracking_number: trackingNumber || null,
      tracking_url: trackingUrl || null,
      shipped_at: nowIso()
    });

    if (!orderUpdate.ok) return orderUpdate;

    await updateCheckoutSessionByLinkedOrder(order, {
      fulfillment_status: "shipped",
      tracking_number: trackingNumber || null,
      tracking_url: trackingUrl || null,
      shipped_at: nowIso()
    });

    await logOrderEvent(order, "shipped", "Order shipped", {
      tracking_number: trackingNumber || null,
      tracking_url: trackingUrl || null
    });

    if (
      window.AXIOM_DASHBOARD_APP &&
      typeof window.AXIOM_DASHBOARD_APP.refreshAllDashboardData === "function"
    ) {
      await window.AXIOM_DASHBOARD_APP.refreshAllDashboardData();
    }

    return { ok: true };
  }

  return {
    fulfillOrder,
    markShipped
  };
})();
