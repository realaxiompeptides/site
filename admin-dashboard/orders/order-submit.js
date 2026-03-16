window.AXIOM_ORDER_SUBMIT = {
  async createOrderFromSession(extraPayload = {}) {
    if (!window.axiomSupabase || !window.AXIOM_HELPERS || !window.AXIOM_CHECKOUT_SESSION) {
      return { ok: false, error: "Missing dependencies" };
    }

    const supabase = window.axiomSupabase;
    const helpers = window.AXIOM_HELPERS;

    const sessionId = await window.AXIOM_CHECKOUT_SESSION.ensureSession();
    if (!sessionId) {
      return { ok: false, error: "No checkout session" };
    }

    const { data: sessionRow, error: sessionError } = await supabase
      .from("checkout_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (sessionError || !sessionRow) {
      console.error("Session load failed:", sessionError);
      return { ok: false, error: "Failed to load session" };
    }

    const { data: latestOrder } = await supabase
      .from("orders")
      .select("order_number")
      .order("order_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrderNumber = Number(latestOrder?.order_number || 1000) + 1;

    const orderPayload = {
      order_number: nextOrderNumber,
      session_id: sessionRow.session_id,
      order_status: extraPayload.order_status || "pending_payment",
      payment_status: extraPayload.payment_status || "pending",
      fulfillment_status: extraPayload.fulfillment_status || "unfulfilled",
      customer_email: sessionRow.customer_email,
      customer_phone: sessionRow.customer_phone,
      shipping_address: sessionRow.shipping_address,
      billing_address: sessionRow.billing_address,
      payment_method: sessionRow.payment_method,
      shipping_selection: sessionRow.shipping_selection,
      shipping_amount: Number(sessionRow.shipping_amount || 0),
      tax_amount: Number(sessionRow.tax_amount || 0),
      subtotal: Number(sessionRow.subtotal || 0),
      total_amount: Number(sessionRow.total_amount || 0),
      notes: sessionRow.notes || null,
      created_at: helpers.nowIso(),
      updated_at: helpers.nowIso()
    };

    const { data: orderInsert, error: orderError } = await supabase
      .from("orders")
      .insert(orderPayload)
      .select("id, order_number")
      .single();

    if (orderError || !orderInsert) {
      console.error("Order insert failed:", orderError);
      return { ok: false, error: "Failed to create order" };
    }

    const items = Array.isArray(sessionRow.cart_items) ? sessionRow.cart_items : [];

    if (items.length) {
      const itemRows = items.map(function (item) {
        return {
          order_id: orderInsert.id,
          order_number: orderInsert.order_number,
          product_id: item.id || "",
          slug: item.slug || "",
          product_name: item.name || "Product",
          variant_label: item.variant_label || "",
          quantity: Number(item.quantity || 1),
          unit_price: Number(item.price || 0),
          line_total: Number(item.price || 0) * Number(item.quantity || 1),
          image: item.image || "",
          weight_oz: Number(item.weight_oz || 0),
          created_at: helpers.nowIso()
        };
      });

      const { error: itemsError } = await supabase.from("order_items").insert(itemRows);

      if (itemsError) {
        console.error("Order items insert failed:", itemsError);
      }
    }

    const { error: eventError } = await supabase.from("order_events").insert({
      order_id: orderInsert.id,
      order_number: orderInsert.order_number,
      event_type: "created",
      event_label: "Order created",
      created_at: helpers.nowIso()
    });

    if (eventError) {
      console.error("Order event insert failed:", eventError);
    }

    await window.AXIOM_CHECKOUT_SESSION.markPendingPayment();

    return {
      ok: true,
      orderId: orderInsert.id,
      orderNumber: orderInsert.order_number
    };
  }
};
