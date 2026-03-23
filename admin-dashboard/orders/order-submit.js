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

    function toNumber(value) {
      return Number(value || 0);
    }

    function normalizeCartItems(items) {
      if (!Array.isArray(items)) return [];

      return items.map((item) => {
        const quantity = Number(item.quantity || item.qty || 1);
        const unitPrice = Number(
          item.unit_price !== undefined && item.unit_price !== null
            ? item.unit_price
            : item.price || 0
        );

        return {
          id: item.id || "",
          slug: item.slug || "",
          product_name: item.product_name || item.name || "Product",
          variant_label: item.variant_label || item.variantLabel || item.variant || "",
          quantity: quantity,
          unit_price: unitPrice,
          line_total:
            item.line_total !== undefined && item.line_total !== null
              ? Number(item.line_total || 0)
              : unitPrice * quantity,
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

    async function getAffiliateCommissionRate(affiliateId) {
      if (!affiliateId) return 0;

      try {
        const { data, error } = await supabase
          .from("affiliates")
          .select("commission_type, commission_value")
          .eq("id", affiliateId)
          .maybeSingle();

        if (error || !data) {
          if (error) {
            console.error("Failed to load affiliate commission rate:", error);
          }
          return 0;
        }

        if (String(data.commission_type || "").toLowerCase() !== "percent") {
          return 0;
        }

        return Number(data.commission_value || 0);
      } catch (error) {
        console.error("Affiliate commission lookup crashed:", error);
        return 0;
      }
    }

    function calculateAffiliateCommission(subtotal, discountAmount, commissionRate) {
      const commissionableAmount = Math.max(
        Number(subtotal || 0) - Number(discountAmount || 0),
        0
      );

      return Number(
        ((commissionableAmount * Number(commissionRate || 0)) / 100).toFixed(2)
      );
    }

    function getBrowserAffiliateAttribution() {
      try {
        if (
          window.AXIOM_AFFILIATE_TRACKING &&
          typeof window.AXIOM_AFFILIATE_TRACKING.getAttributionForCheckout === "function"
        ) {
          const attribution = window.AXIOM_AFFILIATE_TRACKING.getAttributionForCheckout();
          if (attribution && typeof attribution === "object") {
            return attribution;
          }
        }
      } catch (error) {
        console.error("Failed to read AXIOM_AFFILIATE_TRACKING attribution:", error);
      }

      try {
        if (window.AXIOM_AFFILIATE_ATTRIBUTION && typeof window.AXIOM_AFFILIATE_ATTRIBUTION === "object") {
          return {
            affiliate_id: window.AXIOM_AFFILIATE_ATTRIBUTION.affiliate_id || null,
            affiliate_code: window.AXIOM_AFFILIATE_ATTRIBUTION.affiliate_code || null,
            affiliate_click_id: window.AXIOM_AFFILIATE_ATTRIBUTION.affiliate_click_id || null,
            affiliate_referral_session_id:
              window.AXIOM_AFFILIATE_ATTRIBUTION.affiliate_referral_session_id || null,
            affiliate_landing_page: window.AXIOM_AFFILIATE_ATTRIBUTION.landing_page || null,
            affiliate_discount_amount:
              Number(window.AXIOM_AFFILIATE_ATTRIBUTION.affiliate_discount_amount || 0),
            affiliate_commission_amount:
              Number(window.AXIOM_AFFILIATE_ATTRIBUTION.affiliate_commission_amount || 0)
          };
        }
      } catch (error) {
        console.error("Failed to read AXIOM_AFFILIATE_ATTRIBUTION:", error);
      }

      try {
        const raw = localStorage.getItem("axiom_affiliate_attribution");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") {
            return {
              affiliate_id: parsed.affiliate_id || null,
              affiliate_code: parsed.affiliate_code || null,
              affiliate_click_id: parsed.affiliate_click_id || null,
              affiliate_referral_session_id: parsed.affiliate_referral_session_id || null,
              affiliate_landing_page: parsed.landing_page || null,
              affiliate_discount_amount: Number(parsed.affiliate_discount_amount || 0),
              affiliate_commission_amount: Number(parsed.affiliate_commission_amount || 0)
            };
          }
        }
      } catch (error) {
        console.error("Failed to read local affiliate attribution:", error);
      }

      return null;
    }

    async function hydrateSessionAffiliateAttribution(sessionRow) {
      if (!sessionRow) return sessionRow;

      const alreadyHasAffiliate =
        sessionRow.affiliate_id ||
        sessionRow.affiliate_code ||
        sessionRow.affiliate_click_id ||
        sessionRow.affiliate_referral_session_id;

      if (alreadyHasAffiliate) {
        return sessionRow;
      }

      const browserAttribution = getBrowserAffiliateAttribution();

      if (
        !browserAttribution ||
        (!browserAttribution.affiliate_id && !browserAttribution.affiliate_code)
      ) {
        return sessionRow;
      }

      const patchPayload = {
        affiliate_id: browserAttribution.affiliate_id || null,
        affiliate_code: browserAttribution.affiliate_code || null,
        affiliate_click_id: browserAttribution.affiliate_click_id || null,
        affiliate_referral_session_id:
          browserAttribution.affiliate_referral_session_id || null,
        affiliate_landing_page: browserAttribution.affiliate_landing_page || null,
        affiliate_discount_amount: Number(browserAttribution.affiliate_discount_amount || 0),
        affiliate_commission_amount: Number(browserAttribution.affiliate_commission_amount || 0),
        updated_at: nowIso,
        last_activity_at: nowIso
      };

      const { error: patchError } = await supabase
        .from("checkout_sessions")
        .update(patchPayload)
        .eq("id", sessionRow.id);

      if (patchError) {
        console.error("Failed to hydrate checkout session affiliate attribution:", patchError);
        return sessionRow;
      }

      return {
        ...sessionRow,
        ...patchPayload
      };
    }

    async function insertAffiliateConversionIfNeeded(args) {
      const sessionRow = args.sessionRow;
      const orderRow = args.orderRow;

      if (!sessionRow || !orderRow) return;

      const affiliateId = sessionRow.affiliate_id || null;
      const affiliateCode = sessionRow.affiliate_code || null;

      if (!affiliateId || !affiliateCode) {
        return;
      }

      try {
        const { data: existingConversion, error: existingConversionError } = await supabase
          .from("affiliate_conversions")
          .select("id")
          .eq("order_id", orderRow.id)
          .maybeSingle();

        if (existingConversionError) {
          console.error("Affiliate conversion lookup failed:", existingConversionError);
          return;
        }

        if (existingConversion?.id) {
          return;
        }

        const commissionRate = await getAffiliateCommissionRate(affiliateId);
        const commissionAmount = calculateAffiliateCommission(
          sessionRow.subtotal,
          sessionRow.discount_amount,
          commissionRate
        );

        const conversionPayload = {
          affiliate_id: affiliateId,
          referral_code: affiliateCode,
          affiliate_click_id: sessionRow.affiliate_click_id || null,
          affiliate_referral_session_id: sessionRow.affiliate_referral_session_id || null,
          checkout_session_id: sessionRow.id,
          order_id: orderRow.id,
          order_number: orderRow.order_number,
          customer_email: sessionRow.customer_email || null,
          subtotal: Number(sessionRow.subtotal || 0),
          total_amount: Number(sessionRow.total_amount || 0),
          discount_amount: Number(sessionRow.discount_amount || 0),
          commission_amount: commissionAmount,
          commission_status:
            String(orderRow.fulfillment_status || "").toLowerCase() === "fulfilled" ||
            String(orderRow.fulfillment_status || "").toLowerCase() === "shipped"
              ? "claimable"
              : "pending",
          claimable_at:
            String(orderRow.fulfillment_status || "").toLowerCase() === "fulfilled" ||
            String(orderRow.fulfillment_status || "").toLowerCase() === "shipped"
              ? nowIso
              : null,
          created_at: nowIso,
          updated_at: nowIso
        };

        const { error: affiliateConversionError } = await supabase
          .from("affiliate_conversions")
          .insert(conversionPayload);

        if (affiliateConversionError) {
          console.error("Affiliate conversion insert failed:", affiliateConversionError);
        }

        if (sessionRow.affiliate_referral_session_id) {
          const { error: referralSessionUpdateError } = await supabase
            .from("affiliate_referral_sessions")
            .update({
              is_converted: true,
              updated_at: nowIso
            })
            .eq("id", sessionRow.affiliate_referral_session_id);

          if (referralSessionUpdateError) {
            console.error(
              "Affiliate referral session converted update failed:",
              referralSessionUpdateError
            );
          }
        }
      } catch (error) {
        console.error("Affiliate conversion flow crashed:", error);
      }
    }

    try {
      const sessionId = await window.AXIOM_CHECKOUT_SESSION.ensureSession();
      if (!sessionId) {
        return { ok: false, error: "No checkout session" };
      }

      let { data: sessionRow, error: sessionError } = await supabase
        .from("checkout_sessions")
        .select("*")
        .eq("session_id", sessionId)
        .maybeSingle();

      if (sessionError || !sessionRow) {
        console.error("Session load failed:", sessionError);
        return { ok: false, error: "Failed to load session" };
      }

      sessionRow = await hydrateSessionAffiliateAttribution(sessionRow);

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
            payment_status: extraPayload.payment_status || existingOrder.payment_status || "pending",
            fulfillment_status: extraPayload.fulfillment_status || existingOrder.fulfillment_status || "unfulfilled",
            confirmed_at: nowIso,
            updated_at: nowIso,
            last_activity_at: nowIso
          })
          .eq("id", sessionRow.id);

        if (existingCheckoutUpdateError) {
          console.error("Existing order checkout session update failed:", existingCheckoutUpdateError);
        }

        await insertAffiliateConversionIfNeeded({
          sessionRow: sessionRow,
          orderRow: existingOrder
        });

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
        shipping_selection: sessionRow.shipping_selection || {},
        shipping_address: sessionRow.shipping_address || {},
        billing_address: sessionRow.billing_address || {},
        payment_method: sessionRow.payment_method || null,
        payment_reference: sessionRow.payment_reference || null,
        tracking_number: sessionRow.tracking_number || null,
        tracking_url: sessionRow.tracking_url || null,
        notes: sessionRow.notes || null,
        customer_auth_user_id: sessionRow.customer_auth_user_id || null,
        discount_code: sessionRow.discount_code || null,
        affiliate_id: sessionRow.affiliate_id || null,
        affiliate_code: sessionRow.affiliate_code || null,
        affiliate_click_id: sessionRow.affiliate_click_id || null,
        affiliate_referral_session_id: sessionRow.affiliate_referral_session_id || null,
        affiliate_discount_amount: Number(sessionRow.affiliate_discount_amount || 0),
        affiliate_commission_amount: Number(sessionRow.affiliate_commission_amount || 0),
        affiliate_landing_page: sessionRow.affiliate_landing_page || null,
        shipping_carrier: sessionRow.shipping_carrier || null,
        shipping_service: sessionRow.shipping_service_level || null,
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
            fulfillment_status: orderInsert.fulfillment_status,
            affiliate_id: orderInsert.affiliate_id || null,
            affiliate_code: orderInsert.affiliate_code || null
          },
          created_at: nowIso
        });

      if (eventError) {
        console.error("Order event insert failed:", eventError);
      }

      await insertAffiliateConversionIfNeeded({
        sessionRow: sessionRow,
        orderRow: orderInsert
      });

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
