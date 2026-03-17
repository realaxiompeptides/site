document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("checkoutForm");
  if (!form) return;

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
        name: item.name || item.product_name || "Product",
        product_name: item.product_name || item.name || "Product",
        variantLabel: item.variantLabel || item.variant_label || item.variant || "",
        variant_label: item.variant_label || item.variantLabel || item.variant || "",
        quantity: quantity,
        qty: quantity,
        price: unitPrice,
        unit_price: unitPrice,
        line_total:
          item.line_total !== undefined && item.line_total !== null
            ? Number(item.line_total || 0)
            : unitPrice * quantity,
        image: item.image || "",
        weightOz:
          item.weightOz !== undefined && item.weightOz !== null
            ? Number(item.weightOz || 0)
            : item.weight_oz !== undefined && item.weight_oz !== null
              ? Number(item.weight_oz || 0)
              : 0,
        weight_oz:
          item.weight_oz !== undefined && item.weight_oz !== null
            ? Number(item.weight_oz || 0)
            : item.weightOz !== undefined && item.weightOz !== null
              ? Number(item.weightOz || 0)
              : 0
      };
    });
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton ? submitButton.textContent : "";

    function setSubmittingState(isSubmitting) {
      if (!submitButton) return;
      submitButton.disabled = isSubmitting;
      submitButton.textContent = isSubmitting ? "Submitting..." : originalButtonText;
    }

    try {
      const termsCheckbox = document.getElementById("termsCheckbox");
      if (!termsCheckbox || !termsCheckbox.checked) {
        alert("You must agree to the Terms & Conditions before placing your order.");
        return;
      }

      if (!window.AXIOM_CHECKOUT_SESSION) {
        console.error("AXIOM_CHECKOUT_SESSION is missing.");
        alert("Checkout session is not ready.");
        return;
      }

      if (!window.axiomSupabase) {
        console.error("Supabase client is missing.");
        alert("Supabase is not connected.");
        return;
      }

      if (!window.AXIOM_ORDER_SUBMIT || typeof window.AXIOM_ORDER_SUBMIT.createOrderFromSession !== "function") {
        console.error("AXIOM_ORDER_SUBMIT.createOrderFromSession is missing.");
        alert("Order submit service is not ready.");
        return;
      }

      const selectedShipping = document.querySelector('input[name="shippingMethod"]:checked');
      if (!selectedShipping) {
        alert("Please choose a shipping method.");
        return;
      }

      setSubmittingState(true);

      if (window.AXIOM_CHECKOUT_TRACKING && typeof window.AXIOM_CHECKOUT_TRACKING.syncAll === "function") {
        await window.AXIOM_CHECKOUT_TRACKING.syncAll();
      }

      const sessionId = await window.AXIOM_CHECKOUT_SESSION.ensureSession();
      if (!sessionId) {
        alert("Could not create or load your checkout session.");
        return;
      }

      const currentSession = await window.AXIOM_CHECKOUT_SESSION.getSession(true);
      const sessionCartItems = normalizeCartItems(currentSession?.cart_items || []);

      if (!sessionCartItems.length) {
        alert("Your cart is empty.");
        return;
      }

      const paymentMethod =
        document.querySelector('input[name="paymentMethod"]:checked')?.value || null;

      const shippingOption = selectedShipping.closest(".shipping-option");
      const shippingLabel = shippingOption?.querySelector("span")?.textContent?.trim() || "";
      const shippingAmount = Number(selectedShipping.value || 0);
      const shippingCode =
        selectedShipping.dataset.code ||
        shippingLabel.toLowerCase().replace(/\s+/g, "_");

      const checkoutEmail = document.getElementById("checkoutEmail")?.value.trim() || null;
      const firstName = document.getElementById("firstName")?.value.trim() || "";
      const lastName = document.getElementById("lastName")?.value.trim() || "";
      const phone = document.getElementById("phone")?.value.trim() || null;

      const shippingAddress = {
        first_name: firstName,
        last_name: lastName,
        address1: document.getElementById("address1")?.value.trim() || "",
        address2: document.getElementById("address2")?.value.trim() || "",
        city: document.getElementById("city")?.value.trim() || "",
        state: document.getElementById("state")?.value.trim() || "",
        zip: document.getElementById("zip")?.value.trim() || "",
        phone: phone || "",
        country: document.getElementById("country")?.value.trim() || "US"
      };

      const billingAddress = { ...shippingAddress };

      const subtotal = sessionCartItems.reduce(function (sum, item) {
        return sum + (Number(item.unit_price || item.price || 0) * Number(item.quantity || item.qty || 1));
      }, 0);

      const taxAmount = 0;
      const totalAmount = subtotal + shippingAmount + taxAmount;

      const patchPayload = {
        session_status: "pending_payment",
        payment_status: "unpaid",
        fulfillment_status: "unfulfilled",
        customer_email: checkoutEmail,
        customer_phone: phone,
        customer_first_name: firstName || null,
        customer_last_name: lastName || null,
        shipping_address: shippingAddress,
        billing_address: billingAddress,
        payment_method: paymentMethod,
        cart_items: sessionCartItems,
        shipping_selection: {
          label: shippingLabel,
          method_name: shippingLabel,
          amount: shippingAmount,
          code: shippingCode,
          method_code: shippingCode
        },
        shipping_method_code: shippingCode,
        shipping_method_name: shippingLabel || null,
        shipping_carrier: shippingLabel.includes("USPS") ? "USPS" : null,
        shipping_service_level: shippingLabel || null,
        subtotal: subtotal,
        shipping_amount: shippingAmount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        updated_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString()
      };

      await window.AXIOM_CHECKOUT_SESSION.patchSession(patchPayload);

      const { data: refreshedSessionRow, error: refreshedSessionError } = await window.axiomSupabase
        .from("checkout_sessions")
        .select("*")
        .eq("session_id", sessionId)
        .maybeSingle();

      if (refreshedSessionError) {
        console.error("Failed to reload checkout session after patch:", refreshedSessionError);
        alert("There was a problem preparing your order.");
        return;
      }

      const refreshedCartItems = Array.isArray(refreshedSessionRow?.cart_items)
        ? refreshedSessionRow.cart_items
        : [];

      if (!refreshedCartItems.length) {
        alert("Your cart is empty.");
        return;
      }

      const result = await window.AXIOM_ORDER_SUBMIT.createOrderFromSession({
        order_status: "pending_payment",
        payment_status: "pending",
        fulfillment_status: "unfulfilled",
        session_status: "converted"
      });

      if (!result || !result.ok) {
        console.error("Order creation failed:", result);
        alert("There was a problem creating the order.");
        return;
      }

      const redirectOrderNumber = result.orderNumber || result.order_number || "";
      if (!redirectOrderNumber) {
        alert("The order was created, but the order number was missing.");
        return;
      }

      try {
        await window.AXIOM_CHECKOUT_SESSION.patchSession({
          cart_items: [],
          subtotal: 0,
          shipping_amount: 0,
          tax_amount: 0,
          total_amount: 0
        });
      } catch (cartClearError) {
        console.error("Backend cart clear failed after order creation:", cartClearError);
      }

      try {
        localStorage.removeItem("axiom_cart");
      } catch (localCartClearError) {
        console.error("Local cart clear failed:", localCartClearError);
      }

      try {
        window.dispatchEvent(new Event("axiom-cart-updated"));
        document.dispatchEvent(new CustomEvent("axiom-cart-updated"));
      } catch (eventError) {
        console.error("Cart update event failed:", eventError);
      }

      window.location.href = `../thank-you/thank-you.html?order=${encodeURIComponent(redirectOrderNumber)}`;
    } catch (error) {
      console.error("Checkout submit failed:", error);
      alert("There was a problem submitting your order.");
    } finally {
      setSubmittingState(false);
    }
  });
});
