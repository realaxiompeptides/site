window.AXIOM_ORDER_SUBMIT = {
  async createOrderFromSession(extraPayload = {}) {
    const supabase =
      window.axiomSupabase || window.AXIOM_SUPABASE || window.supabaseClient || null;

    if (!supabase || !window.AXIOM_CHECKOUT_SESSION) {
      return { ok: false, error: "Missing dependencies" };
    }

    const nowIso =
      window.AXIOM_HELPERS && typeof window.AXIOM_HELPERS.nowIso === "function"
        ? window.AXIOM_HELPERS.nowIso()
        : new Date().toISOString();

    function toNumber(value, fallback = 0) {
      const num = Number(value);
      return Number.isFinite(num) ? num : fallback;
    }

    function normalizeCartItems(items) {
      if (!Array.isArray(items)) return [];

      return items.map((item) => {
        const quantity = Number(item.quantity || item.qty || 1);
        const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;

        const unitPrice = Number(
          item.unit_price !== undefined && item.unit_price !== null
            ? item.unit_price
            : item.price || 0
        );
        const safeUnitPrice = Number.isFinite(unitPrice) ? unitPrice : 0;

        const rawLineTotal =
          item.line_total !== undefined && item.line_total !== null
            ? Number(item.line_total || 0)
            : safeUnitPrice * safeQuantity;

        return {
          id: item.id || "",
          slug: item.slug || "",
          product_name: item.product_name || item.name || "Product",
          variant_label: item.variant_label || item.variantLabel || item.variant || "",
          quantity: safeQuantity,
          unit_price: safeUnitPrice,
          line_total: Number.isFinite(rawLineTotal) ? rawLineTotal : safeUnitPrice * safeQuantity,
          image: item.image || "",
          weight_oz:
            item.weight_oz !== undefined && item.weight_oz !== null
              ? Number(item.weight_oz || 0)
              : item.weightOz !== undefined && item.weightOz !== null
                ? Number(item.weightOz || 0)
                : 0
        };
      });
    }

    function safeJsonObject(value) {
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    }

    async function getNextOrderNumber() {
      const { data, error } = await supabase
        .from("orders")
        .select("order_number")
        .order("order_number", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Failed to get next order number:", error);
        return null;
      }

      const highest =
        Array.isArray(data) && data.length
          ? Number(data[0].order_number || 1000)
          : 1000;

      return highest + 1;
    }

    try {
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

      const cartItems = normalizeCartItems(sessionRow.cart_items);
      if (!cartItems.length) {
        return { ok: false, error: "Cart is empty" };
      }

      const subtotal = toNumber(sessionRow.subtotal);
      const shippingAmount = toNumber(sessionRow.shipping_amount);
      const taxAmount = toNumber(sessionRow.tax_amount);
      const discountAmount = toNumber(sessionRow.discount_amount);
      const totalAmount = toNumber(sessionRow.total_amount);

      const { data: existingOrder, error: existingOrderError } = await supabase
        .from("orders")
        .select("*")
        .eq("checkout_session_id", sessionRow.id)
        .maybeSingle();

      if (existingOrderError) {
        console.error("Existing order lookup failed:", existingOrderError);
        return { ok: false, error: "Failed to check existing order" };
      }

      if (existingOrder) {
        const { error: existingCheckoutUpdateError } = await supabase
          .from("checkout_sessions")
          .update({
            order_number: existingOrder.order_number,
            session_status: extraPayload.session_status || "converted",
            payment_status:
              extraPayload.payment_status || existingOrder.payment_status || "pending",
            fulfillment_status:
              extraPayload.fulfillment_status ||
              existingOrder.fulfillment_status ||
              "unfulfilled",
            confirmed_at: nowIso,
            updated_at: nowIso,
            last_activity_at: nowIso
          })
          .eq("id", sessionRow.id);

        if (existingCheckoutUpdateError) {
          console.error(
            "Existing order checkout session update failed:",
            existingCheckoutUpdateError
          );
        }

        return {
          ok: true,
          orderId: existingOrder.id,
          orderNumber: existingOrder.order_number,
          totalAmount: Number(existingOrder.total_amount || 0),
          subtotal: Number(existingOrder.subtotal || 0),
          shippingAmount: Number(existingOrder.shipping_amount || 0),
          taxAmount: Number(existingOrder.tax_amount || 0),
          paymentMethod: existingOrder.payment_method || null
        };
      }

      const nextOrderNumber = await getNextOrderNumber();
      if (!nextOrderNumber) {
        return { ok: false, error: "Failed to generate order number" };
      }

      const orderPayload = {
        checkout_session_id: sessionRow.id,
        order_number: nextOrderNumber,
        order_status: extraPayload.order_status || "pending_payment",
        payment_status: extraPayload.payment_status || "pending",
        fulfillment_status: extraPayload.fulfillment_status || "unfulfilled",
        customer_email: sessionRow.customer_email || null,
        customer_phone: sessionRow.customer_phone || null,
        customer_first_name: sessionRow.customer_first_name || null,
        customer_last_name: sessionRow.customer_last_name || null,
        cart_items: cartItems,
        subtotal: subtotal,
        shipping_amount: shippingAmount,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        shipping_selection: safeJsonObject(sessionRow.shipping_selection),
        shipping_address: safeJsonObject(sessionRow.shipping_address),
        billing_address: safeJsonObject(sessionRow.billing_address),
        payment_method: sessionRow.payment_method || null,
        payment_reference: sessionRow.payment_reference || null,
        tracking_number: sessionRow.tracking_number || null,
        tracking_url: sessionRow.tracking_url || null,
        notes: sessionRow.notes || null,
        customer_auth_user_id: sessionRow.customer_auth_user_id || null,
        discount_code: sessionRow.discount_code || null,
        shipping_carrier: sessionRow.shipping_carrier || null,
        shipping_service: sessionRow.shipping_service_level || null,
        shipped_at: sessionRow.shipped_at || null,
        shipping_label_status: sessionRow.shipping_label_status || "not_purchased",
        label_url: sessionRow.label_url || null,
        payment_collected_at: sessionRow.payment_collected_at || null,
        confirmed_at: sessionRow.confirmed_at || null,
        completed_at: sessionRow.completed_at || null,
        cancelled_at: sessionRow.cancelled_at || null,
        payment_notes: sessionRow.payment_notes || null,
        payment_confirmed_by: sessionRow.payment_confirmed_by || null,
        gateway_name: sessionRow.gateway_name || null,
        gateway_transaction_id: sessionRow.gateway_transaction_id || null,
        gateway_status: sessionRow.gateway_status || null,
        gateway_status_code: sessionRow.gateway_status_code || null,
        gateway_redirect_url: sessionRow.gateway_redirect_url || null,
        gateway_response_raw: sessionRow.gateway_response_raw || null,
        created_at: nowIso,
        updated_at: nowIso
      };

      const { data: orderInsert, error: orderError } = await supabase
        .from("orders")
        .insert(orderPayload)
        .select("*")
        .single();

      if (orderError || !orderInsert) {
        console.error("Order insert failed:", orderError);
        return {
          ok: false,
          error: orderError?.message || "Failed to create order"
        };
      }

      const orderItemsPayload = cartItems.map((item) => ({
        order_id: orderInsert.id,
        order_number: orderInsert.order_number,
        product_id: item.id || null,
        slug: item.slug || null,
        product_name: item.product_name || "Product",
        variant_label: item.variant_label || null,
        quantity: Number(item.quantity || 1),
        unit_price: Number(item.unit_price || 0),
        line_total:
          item.line_total !== undefined && item.line_total !== null
            ? Number(item.line_total || 0)
            : Number(item.unit_price || 0) * Number(item.quantity || 1),
        image: item.image || null,
        weight_oz: Number(item.weight_oz || 0),
        created_at: nowIso
      }));

      if (orderItemsPayload.length) {
        const { error: orderItemsError } = await supabase
          .from("order_items")
          .insert(orderItemsPayload);

        if (orderItemsError) {
          console.error("Order items insert failed:", orderItemsError);
        }
      }

      const checkoutSessionUpdate = {
        order_number: orderInsert.order_number,
        session_status: extraPayload.session_status || "converted",
        payment_status: extraPayload.payment_status || "pending",
        fulfillment_status: extraPayload.fulfillment_status || "unfulfilled",
        confirmed_at: nowIso,
        updated_at: nowIso,
        last_activity_at: nowIso
      };

      const { error: checkoutUpdateError } = await supabase
        .from("checkout_sessions")
        .update(checkoutSessionUpdate)
        .eq("id", sessionRow.id);

      if (checkoutUpdateError) {
        console.error("Checkout session update failed:", checkoutUpdateError);
      }

      const { error: eventError } = await supabase
        .from("order_events")
        .insert({
          checkout_session_id: sessionRow.id,
          order_id: orderInsert.id,
          event_type: "created",
          event_label: "Order created",
          event_data: {
            order_number: orderInsert.order_number,
            session_id: sessionRow.session_id,
            payment_method: orderInsert.payment_method,
            total_amount: orderInsert.total_amount,
            payment_status: orderInsert.payment_status,
            fulfillment_status: orderInsert.fulfillment_status
          },
          created_at: nowIso
        });

      if (eventError) {
        console.error("Order event insert failed:", eventError);
      }

      return {
        ok: true,
        orderId: orderInsert.id,
        orderNumber: orderInsert.order_number,
        totalAmount: Number(orderInsert.total_amount || 0),
        subtotal: Number(orderInsert.subtotal || 0),
        shippingAmount: Number(orderInsert.shipping_amount || 0),
        taxAmount: Number(orderInsert.tax_amount || 0),
        paymentMethod: orderInsert.payment_method || null
      };
    } catch (error) {
      console.error("createOrderFromSession crashed:", error);
      return {
        ok: false,
        error: error?.message || "Unexpected order submit failure"
      };
    }
  }
};
