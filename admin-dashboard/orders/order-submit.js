window.AXIOM_ORDER_SUBMIT = {
  async createOrderFromSession(extraPayload = {}) {
    if (!window.axiomSupabase || !window.AXIOM_CHECKOUT_SESSION) {
      return { ok: false, error: "Missing dependencies" };
    }

    const supabase = window.axiomSupabase;

    const nowIso =
      window.AXIOM_HELPERS && typeof window.AXIOM_HELPERS.nowIso === "function"
        ? window.AXIOM_HELPERS.nowIso()
        : new Date().toISOString();

    function safeArray(value) {
      return Array.isArray(value) ? value : [];
    }

    function toNumber(value, fallback = 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    }

    function getItemQty(item) {
      return toNumber(item.quantity ?? item.qty ?? 1, 1);
    }

    function getItemUnitPrice(item) {
      return toNumber(item.unit_price ?? item.price ?? 0, 0);
    }

    function getItemLineTotal(item) {
      if (item.line_total !== undefined && item.line_total !== null) {
        return toNumber(item.line_total, 0);
      }
      return getItemQty(item) * getItemUnitPrice(item);
    }

    function normalizeCartItem(item) {
      return {
        id: item.id || "",
        product_id: item.product_id || item.id || "",
        slug: item.slug || "",
        product_name: item.product_name || item.name || "Product",
        variant_label: item.variant_label || item.variantLabel || item.variant || "",
        quantity: getItemQty(item),
        unit_price: getItemUnitPrice(item),
        line_total: getItemLineTotal(item),
        image: item.image || "",
        weight_oz: toNumber(item.weight_oz ?? item.weightOz ?? 0, 0)
      };
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

      const highest = safeArray(data)[0]?.order_number;
      const next = highest ? Number(highest) + 1 : 100001;
      return next;
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

      let cartItems = safeArray(sessionRow.cart_items);

      if (!cartItems.length) {
        try {
          const localCart = JSON.parse(localStorage.getItem("axiom_cart") || "[]");
          if (Array.isArray(localCart) && localCart.length) {
            cartItems = localCart.map(normalizeCartItem);

            const fallbackSubtotal = cartItems.reduce((sum, item) => {
              return sum + getItemLineTotal(item);
            }, 0);

            const fallbackShippingAmount = toNumber(sessionRow.shipping_amount, 0);
            const fallbackTaxAmount = toNumber(sessionRow.tax_amount, 0);
            const fallbackDiscountAmount = toNumber(sessionRow.discount_amount, 0);
            const fallbackTotalAmount =
              fallbackSubtotal + fallbackShippingAmount + fallbackTaxAmount - fallbackDiscountAmount;

            const { error: fallbackPatchError } = await supabase
              .from("checkout_sessions")
              .update({
                cart_items: cartItems,
                subtotal: fallbackSubtotal,
                total_amount: fallbackTotalAmount,
                updated_at: nowIso,
                last_activity_at: nowIso
              })
              .eq("id", sessionRow.id);

            if (fallbackPatchError) {
              console.error("Fallback cart patch failed:", fallbackPatchError);
            } else {
              sessionRow.cart_items = cartItems;
              sessionRow.subtotal = fallbackSubtotal;
              sessionRow.total_amount = fallbackTotalAmount;
            }
          }
        } catch (localCartError) {
          console.error("Local cart fallback failed:", localCartError);
        }
      }

      cartItems = safeArray(sessionRow.cart_items).map(normalizeCartItem);

      if (!cartItems.length) {
        return { ok: false, error: "Cart is empty" };
      }

      const subtotal =
        toNumber(sessionRow.subtotal, 0) ||
        cartItems.reduce((sum, item) => sum + getItemLineTotal(item), 0);

      const shippingAmount = toNumber(sessionRow.shipping_amount, 0);
      const taxAmount = toNumber(sessionRow.tax_amount, 0);
      const discountAmount = toNumber(sessionRow.discount_amount, 0);

      const totalAmount =
        toNumber(sessionRow.total_amount, 0) ||
        subtotal + shippingAmount + taxAmount - discountAmount;

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
        await supabase
          .from("checkout_sessions")
          .update({
            order_number: existingOrder.order_number,
            session_status: extraPayload.session_status || "pending_payment",
            payment_status: extraPayload.payment_status || "pending",
            fulfillment_status: extraPayload.fulfillment_status || "unfulfilled",
            updated_at: nowIso,
            last_activity_at: nowIso
          })
          .eq("id", sessionRow.id);

        return {
          ok: true,
          orderId: existingOrder.id,
          orderNumber: existingOrder.order_number
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
        shipping_selection: sessionRow.shipping_selection || {},
        shipping_address: sessionRow.shipping_address || {},
        billing_address: sessionRow.billing_address || {},
        payment_method: sessionRow.payment_method || null,
        payment_reference: sessionRow.payment_reference || null,
        tracking_number: sessionRow.tracking_number || null,
        tracking_url: sessionRow.tracking_url || null,
        notes: sessionRow.notes || null,
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
        return { ok: false, error: "Failed to create order" };
      }

      const orderItemsPayload = cartItems.map((item) => ({
        order_id: orderInsert.id,
        order_number: orderInsert.order_number,
        product_id: item.product_id || item.id || "",
        slug: item.slug || "",
        product_name: item.product_name || "Product",
        variant_label: item.variant_label || "",
        quantity: getItemQty(item),
        unit_price: getItemUnitPrice(item),
        line_total: getItemLineTotal(item),
        image: item.image || "",
        weight_oz: toNumber(item.weight_oz, 0),
        created_at: nowIso
      }));

      if (orderItemsPayload.length) {
        const { error: orderItemsError } = await supabase
          .from("order_items")
          .insert(orderItemsPayload);

        if (orderItemsError) {
          console.error("Order items insert failed:", orderItemsError);
          return { ok: false, error: "Failed to create order items" };
        }
      }

      const checkoutSessionUpdate = {
        order_number: orderInsert.order_number,
        session_status: extraPayload.session_status || "pending_payment",
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
            fulfillment_status: orderInsert.fulfillment_status,
            item_count: cartItems.reduce((sum, item) => sum + getItemQty(item), 0)
          },
          created_at: nowIso
        });

      if (eventError) {
        console.error("Order event insert failed:", eventError);
      }

      return {
        ok: true,
        orderId: orderInsert.id,
        orderNumber: orderInsert.order_number
      };
    } catch (error) {
      console.error("createOrderFromSession crashed:", error);
      return { ok: false, error: "Unexpected order submit failure" };
    }
  }
};
