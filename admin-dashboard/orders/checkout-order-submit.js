document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("checkoutForm");
  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton ? submitButton.textContent : "";

    function setSubmittingState(isSubmitting) {
      if (!submitButton) return;
      submitButton.disabled = isSubmitting;
      submitButton.textContent = isSubmitting ? "Submitting..." : originalButtonText;
    }

    function safeArray(value) {
      return Array.isArray(value) ? value : [];
    }

    function toNumber(value) {
      const n = Number(value);
      return Number.isFinite(n) ? n : 0;
    }

    function getLocalCartItems() {
      try {
        const parsed = JSON.parse(localStorage.getItem("axiom_cart") || "[]");
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.error("Failed to read local cart:", error);
        return [];
      }
    }

    function normalizeCartItemsForSession(items) {
      return safeArray(items).map(function (item) {
        const quantity = toNumber(item.quantity || item.qty || 1) || 1;
        const unitPrice = toNumber(
          item.unit_price !== undefined && item.unit_price !== null
            ? item.unit_price
            : item.price !== undefined && item.price !== null
              ? item.price
              : 0
        );

        const compareAtPrice =
          item.compare_at_price !== undefined && item.compare_at_price !== null
            ? toNumber(item.compare_at_price)
            : item.compareAtPrice !== undefined && item.compareAtPrice !== null
              ? toNumber(item.compareAtPrice)
              : null;

        const weightOz =
          item.weight_oz !== undefined && item.weight_oz !== null
            ? toNumber(item.weight_oz)
            : item.weightOz !== undefined && item.weightOz !== null
              ? toNumber(item.weightOz)
              : 0;

        return {
          id: item.id || "",
          slug: item.slug || "",
          name: item.name || item.product_name || "Product",
          product_name: item.product_name || item.name || "Product",
          variantLabel: item.variantLabel || item.variant_label || item.variant || "",
          variant_label: item.variant_label || item.variantLabel || item.variant || "",
          variant: item.variant || item.variantLabel || item.variant_label || "",
          quantity: quantity,
          qty: quantity,
          price: unitPrice,
          unit_price: unitPrice,
          line_total:
            item.line_total !== undefined && item.line_total !== null
              ? toNumber(item.line_total)
              : unitPrice * quantity,
          compareAtPrice: compareAtPrice,
          compare_at_price: compareAtPrice,
          image: item.image || "",
          weightOz: weightOz,
          weight_oz: weightOz,
          inStock: item.inStock !== false && item.in_stock !== false,
          in_stock: item.inStock !== false && item.in_stock !== false
        };
      });
    }

    function calculateSubtotal(items) {
      return safeArray(items).reduce(function (sum, item) {
        return sum + (toNumber(item.price || item.unit_price || 0) * toNumber(item.quantity || item.qty || 1));
      }, 0);
    }

    async function fetchSessionRow(sessionId) {
      const { data, error } = await window.axiomSupabase
        .from("checkout_sessions")
        .select("*")
        .eq("session_id", sessionId)
        .maybeSingle();

      return { data, error };
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

      if (
        typeof window.syncCheckoutSessionFromForm === "function"
      ) {
        await window.syncCheckoutSessionFromForm();
      }

      if (
        typeof window.syncLocalCartIntoSession === "function"
      ) {
        await window.syncLocalCartIntoSession(true);
      }

      const sessionId = await window.AXIOM_CHECKOUT_SESSION.ensureSession();
      if (!sessionId) {
        alert("Could not create or load your checkout session.");
        return;
      }

      let { data: sessionRow, error: sessionError } = await fetchSessionRow(sessionId);

      if (sessionError) {
        console.error("Failed to load checkout session before order submit:", sessionError);
        alert("There was a problem loading your checkout session.");
        return;
      }

      let cartItems = safeArray(sessionRow?.cart_items);

      const localCartItems = normalizeCartItemsForSession(getLocalCartItems());

      if (!cartItems.length && localCartItems.length) {
        const localSubtotal = calculateSubtotal(localCartItems);

        const selectedShippingNow = document.querySelector('input[name="shippingMethod"]:checked');
        const shippingOptionNow = selectedShippingNow?.closest(".shipping-option");
        const shippingLabelNow = shippingOptionNow?.querySelector("span")?.textContent?.trim() || "";
        const shippingAmountNow = toNumber(selectedShippingNow?.value || 0);
        const shippingCodeNow =
          selectedShippingNow?.dataset.code ||
          shippingLabelNow.toLowerCase().replace(/\s+/g, "_");

        const fallbackPatchPayload = {
          cart_items: localCartItems,
          subtotal: localSubtotal,
          shipping_amount: shippingAmountNow,
          tax_amount: 0,
          total_amount: localSubtotal + shippingAmountNow,
          shipping_selection: {
            label: shippingLabelNow,
            method_name: shippingLabelNow,
            amount: shippingAmountNow,
            code: shippingCodeNow,
            method_code: shippingCodeNow
          },
          shipping_method_code: shippingCodeNow,
          shipping_method_name: shippingLabelNow || null,
          shipping_carrier: shippingLabelNow.includes("USPS") ? "USPS" : null,
          shipping_service_level: shippingLabelNow || null,
          last_activity_at: new Date().toISOString()
        };

        await window.AXIOM_CHECKOUT_SESSION.patchSession(fallbackPatchPayload);

        const retryResult = await fetchSessionRow(sessionId);
        sessionRow = retryResult.data;
        sessionError = retryResult.error;

        if (sessionError) {
          console.error("Failed to reload checkout session after fallback cart sync:", sessionError);
          alert("There was a problem preparing your order.");
          return;
        }

        cartItems = safeArray(sessionRow?.cart_items);
      }

      if (!cartItems.length) {
        alert("Your cart is empty.");
        return;
      }

      const paymentMethod =
        document.querySelector('input[name="paymentMethod"]:checked')?.value || null;

      const shippingOption = selectedShipping.closest(".shipping-option");
      const shippingLabel = shippingOption?.querySelector("span")?.textContent?.trim() || "";
      const shippingAmount = toNumber(selectedShipping.value || 0);
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

      const subtotal = cartItems.reduce(function (sum, item) {
        return sum + (toNumber(item.price || item.unit_price || 0) * toNumber(item.quantity || item.qty || 1));
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
        cart_items: cartItems,
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
        last_activity_at: new Date().toISOString()
      };

      await window.AXIOM_CHECKOUT_SESSION.patchSession(patchPayload);

      const { data: refreshedSessionRow, error: refreshedSessionError } = await fetchSessionRow(sessionId);

      if (refreshedSessionError) {
        console.error("Failed to reload checkout session after patch:", refreshedSessionError);
        alert("There was a problem preparing your order.");
        return;
      }

      const refreshedCartItems = safeArray(refreshedSessionRow?.cart_items);

      if (!refreshedCartItems.length) {
        alert("Your cart is empty.");
        return;
      }

      const result = await window.AXIOM_ORDER_SUBMIT.createOrderFromSession({
        order_status: "pending_payment",
        payment_status: "pending",
        fulfillment_status: "unfulfilled"
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
        if (window.AXIOM_HELPERS && typeof window.AXIOM_HELPERS.clearCart === "function") {
          window.AXIOM_HELPERS.clearCart();
        } else {
          localStorage.removeItem("axiom_cart");
        }
      } catch (cartClearError) {
        console.error("Cart clear failed after order creation:", cartClearError);
      }

      try {
        window.dispatchEvent(new Event("axiom-cart-updated"));
        document.dispatchEvent(new CustomEvent("axiom-cart-updated"));
      } catch (eventError) {
        console.error("Cart update event failed:", eventError);
      }

      console.log(
        "Redirecting to thank you page:",
        `/site/thank-you/thank-you.html?order=${encodeURIComponent(redirectOrderNumber)}`
      );

      window.location.href = `/site/thank-you/thank-you.html?order=${encodeURIComponent(redirectOrderNumber)}`;
    } catch (error) {
      console.error("Checkout submit failed:", error);
      alert("There was a problem submitting your order.");
    } finally {
      setSubmittingState(false);
    }
  });
});
