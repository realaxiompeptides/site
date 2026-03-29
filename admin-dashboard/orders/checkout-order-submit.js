document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("checkoutForm");
  if (!form) return;

  function getSupabase() {
    return window.axiomSupabase || window.AXIOM_SUPABASE || window.supabaseClient || null;
  }

  function getSiteRootPath() {
    let pathname = window.location.pathname || "/";

    pathname = pathname.replace(/\/+$/, "");

    pathname = pathname
      .replace(/\/checkout\/checkout\.html$/i, "")
      .replace(/\/checkout\.html$/i, "")
      .replace(/checkout\/checkout\.html$/i, "")
      .replace(/checkout\.html$/i, "");

    if (!pathname) return "";
    return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  }

  function getThankYouBaseUrl() {
    const origin = window.location.origin;
    const siteRoot = getSiteRootPath();

    if (window.location.hostname.includes("github.io")) {
      return origin + siteRoot + "/thank-you/thank-you.html";
    }

    return origin + siteRoot + "/thank-you/thank-you.html";
  }

  const THANK_YOU_BASE_URL = getThankYouBaseUrl();

  function normalizeCartItems(items) {
    if (!Array.isArray(items)) return [];

    return items.map(function (item) {
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

  function normalizeCode(value) {
    return String(value || "").trim().toUpperCase();
  }

  function toNumber(value, fallback) {
    const num = Number(value);
    return Number.isFinite(num) ? num : (fallback !== undefined ? fallback : 0);
  }

  function showError(message, extra) {
    if (extra) {
      console.error(message, extra);
    } else {
      console.error(message);
    }
    alert(message);
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function waitForCheckoutDependencies(timeoutMs) {
    const timeout = Number(timeoutMs || 6000);

    return new Promise(function (resolve) {
      const startedAt = Date.now();

      function check() {
        const ready =
          !!window.AXIOM_CHECKOUT_SESSION &&
          typeof window.AXIOM_CHECKOUT_SESSION.ensureSession === "function" &&
          typeof window.AXIOM_CHECKOUT_SESSION.getSession === "function" &&
          typeof window.AXIOM_CHECKOUT_SESSION.patchSession === "function" &&
          !!getSupabase() &&
          !!window.AXIOM_ORDER_SUBMIT &&
          typeof window.AXIOM_ORDER_SUBMIT.createOrderFromSession === "function";

        if (ready) {
          resolve(true);
          return;
        }

        if (Date.now() - startedAt >= timeout) {
          resolve(false);
          return;
        }

        setTimeout(check, 100);
      }

      check();
    });
  }

  async function syncAffiliateBeforeSubmit() {
    if (
      window.AXIOM_AFFILIATE_TRACKING &&
      typeof window.AXIOM_AFFILIATE_TRACKING.syncAttributionIntoCheckoutSession === "function"
    ) {
      try {
        await window.AXIOM_AFFILIATE_TRACKING.syncAttributionIntoCheckoutSession();
      } catch (error) {
        console.error("Affiliate checkout sync failed before submit:", error);
      }
    }
  }

  function getDiscountUiState() {
    if (
      window.AXIOM_DISCOUNT_CODES_UI &&
      typeof window.AXIOM_DISCOUNT_CODES_UI.getAppliedDiscount === "function"
    ) {
      try {
        return window.AXIOM_DISCOUNT_CODES_UI.getAppliedDiscount() || null;
      } catch (error) {
        console.error("Failed to read discount UI state:", error);
      }
    }
    return null;
  }

  function getLiveAffiliateAttribution() {
    if (
      window.AXIOM_AFFILIATE_TRACKING &&
      typeof window.AXIOM_AFFILIATE_TRACKING.getAttributionForCheckout === "function"
    ) {
      try {
        return window.AXIOM_AFFILIATE_TRACKING.getAttributionForCheckout() || null;
      } catch (error) {
        console.error("Failed to read live affiliate attribution:", error);
      }
    }

    return null;
  }

  function mergeAffiliateSessionData(currentSession, discountUiState) {
    const liveAttribution = getLiveAffiliateAttribution();

    const existingAffiliateId =
      (liveAttribution && liveAttribution.affiliate_id) ||
      currentSession?.affiliate_id ||
      null;

    const existingAffiliateCode =
      (liveAttribution && liveAttribution.affiliate_code) ||
      currentSession?.affiliate_code ||
      null;

    const existingAffiliateClickId =
      (liveAttribution && liveAttribution.affiliate_click_id) ||
      currentSession?.affiliate_click_id ||
      null;

    const existingAffiliateReferralSessionId =
      (liveAttribution && liveAttribution.affiliate_referral_session_id) ||
      currentSession?.affiliate_referral_session_id ||
      null;

    const existingAffiliateLandingPage =
      (liveAttribution && liveAttribution.affiliate_landing_page) ||
      currentSession?.affiliate_landing_page ||
      null;

    const existingAffiliateDiscountAmount = toNumber(
      liveAttribution?.affiliate_discount_amount ?? currentSession?.affiliate_discount_amount,
      0
    );

    const existingAffiliateCommissionAmount = toNumber(
      liveAttribution?.affiliate_commission_amount ?? currentSession?.affiliate_commission_amount,
      0
    );

    const isAffiliateDiscountApplied =
      discountUiState &&
      discountUiState.isApplied === true &&
      discountUiState.isAffiliateCode === true;

    const affiliateDiscountAmountForSession = isAffiliateDiscountApplied
      ? toNumber(
          discountUiState.affiliateDiscountAmount !== undefined &&
          discountUiState.affiliateDiscountAmount !== null
            ? discountUiState.affiliateDiscountAmount
            : discountUiState.discountAmount,
          existingAffiliateDiscountAmount
        )
      : existingAffiliateDiscountAmount;

    const affiliateCommissionAmountForSession = isAffiliateDiscountApplied
      ? toNumber(
          discountUiState.affiliateCommissionAmount,
          existingAffiliateCommissionAmount
        )
      : existingAffiliateCommissionAmount;

    return {
      affiliate_id: existingAffiliateId,
      affiliate_code: existingAffiliateCode,
      affiliate_click_id: existingAffiliateClickId,
      affiliate_referral_session_id: existingAffiliateReferralSessionId,
      affiliate_landing_page: existingAffiliateLandingPage,
      affiliate_discount_amount: affiliateDiscountAmountForSession,
      affiliate_commission_amount: affiliateCommissionAmountForSession
    };
  }

  async function forceSyncConversion(orderId) {
    if (!orderId) return;

    if (
      window.AXIOM_AFFILIATE_TRACKING &&
      typeof window.AXIOM_AFFILIATE_TRACKING.syncConversionForOrder === "function"
    ) {
      try {
        await window.AXIOM_AFFILIATE_TRACKING.syncConversionForOrder(orderId);
      } catch (error) {
        console.error("Direct affiliate conversion sync failed:", error);
      }
    }
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton ? submitButton.textContent : "Place Order";

    function setSubmittingState(isSubmitting) {
      if (!submitButton) return;
      submitButton.disabled = isSubmitting;
      submitButton.textContent = isSubmitting ? "Submitting..." : originalButtonText;
    }

    try {
      const termsCheckbox = document.getElementById("termsCheckbox");
      if (!termsCheckbox || !termsCheckbox.checked) {
        showError("You must agree to the Terms & Conditions before placing your order.");
        return;
      }

      setSubmittingState(true);

      const ready = await waitForCheckoutDependencies(6000);
      if (!ready) {
        showError("Checkout session is not ready.");
        return;
      }

      if (
        window.AXIOM_CHECKOUT_TRACKING &&
        typeof window.AXIOM_CHECKOUT_TRACKING.syncAll === "function"
      ) {
        try {
          await window.AXIOM_CHECKOUT_TRACKING.syncAll();
        } catch (trackingError) {
          console.error("Checkout tracking sync failed:", trackingError);
        }
      }

      const selectedShipping = document.querySelector('input[name="shippingMethod"]:checked');
      if (!selectedShipping) {
        showError("Please choose a shipping method.");
        return;
      }

      const sessionId = await window.AXIOM_CHECKOUT_SESSION.ensureSession();
      if (!sessionId) {
        showError("Could not create or load your checkout session.");
        return;
      }

      await syncAffiliateBeforeSubmit();

      const currentSession = await window.AXIOM_CHECKOUT_SESSION.getSession(true);
      const sessionCartItems = normalizeCartItems(currentSession?.cart_items || []);

      if (!sessionCartItems.length) {
        showError("Your cart is empty.");
        return;
      }

      const paymentMethod =
        document.querySelector('input[name="paymentMethod"]:checked')?.value || null;

      const shippingOption = selectedShipping.closest(".shipping-option");
      const shippingLabel =
        selectedShipping.dataset.methodName ||
        shippingOption?.querySelector(".shipping-option-name")?.textContent?.trim() ||
        shippingOption?.querySelector("span")?.textContent?.trim() ||
        "";

      const shippingEta =
        selectedShipping.dataset.eta ||
        shippingOption?.querySelector(".shipping-option-eta")?.textContent?.trim() ||
        "";

      const shippingAmount = Number(selectedShipping.value || 0);
      const shippingCode =
        selectedShipping.dataset.code ||
        String(shippingLabel || "")
          .toLowerCase()
          .replace(/\s+/g, "_");

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

      const billingSameCheckbox = document.getElementById("billingSameAsShipping");
      const billingSameAsShipping = billingSameCheckbox ? billingSameCheckbox.checked : true;

      let billingAddress = { ...shippingAddress, same_as_shipping: true };

      if (!billingSameAsShipping) {
        billingAddress = {
          first_name: document.getElementById("billingFirstName")?.value.trim() || "",
          last_name: document.getElementById("billingLastName")?.value.trim() || "",
          address1: document.getElementById("billingAddress1")?.value.trim() || "",
          address2: document.getElementById("billingAddress2")?.value.trim() || "",
          city: document.getElementById("billingCity")?.value.trim() || "",
          state: document.getElementById("billingState")?.value.trim() || "",
          zip: document.getElementById("billingZip")?.value.trim() || "",
          phone: document.getElementById("billingPhone")?.value.trim() || "",
          country: document.getElementById("billingCountry")?.value.trim() || "US",
          same_as_shipping: false
        };
      }

      const subtotal = sessionCartItems.reduce(function (sum, item) {
        return sum + (
          Number(item.unit_price || item.price || 0) *
          Number(item.quantity || item.qty || 1)
        );
      }, 0);

      const taxAmount = toNumber(currentSession?.tax_amount || currentSession?.tax || 0, 0);
      const discountAmount = toNumber(currentSession?.discount_amount || 0, 0);
      const discountCode = normalizeCode(currentSession?.discount_code || "");
      const totalAmount = Math.max(0, subtotal - discountAmount + shippingAmount + taxAmount);

      const discountUiState = getDiscountUiState();
      const affiliateFields = mergeAffiliateSessionData(currentSession, discountUiState);

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
          method_code: shippingCode,
          carrier: String(shippingLabel || "").includes("USPS") ? "USPS" : "",
          service_level: shippingEta || shippingLabel,
          eta: shippingEta || ""
        },
        shipping_method_code: shippingCode,
        shipping_method_name: shippingLabel || null,
        shipping_carrier: String(shippingLabel || "").includes("USPS") ? "USPS" : null,
        shipping_service_level: shippingEta || shippingLabel || null,
        subtotal: subtotal,
        shipping_amount: shippingAmount,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        discount_code: discountCode || null,
        total_amount: totalAmount,

        affiliate_id: affiliateFields.affiliate_id,
        affiliate_code: affiliateFields.affiliate_code,
        affiliate_click_id: affiliateFields.affiliate_click_id,
        affiliate_referral_session_id: affiliateFields.affiliate_referral_session_id,
        affiliate_landing_page: affiliateFields.affiliate_landing_page,
        affiliate_discount_amount: affiliateFields.affiliate_discount_amount,
        affiliate_commission_amount: affiliateFields.affiliate_commission_amount,

        updated_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString()
      };

      await window.AXIOM_CHECKOUT_SESSION.patchSession(patchPayload);

      await syncAffiliateBeforeSubmit();
      await wait(100);

      const supabase = getSupabase();
      const refreshedSessionResult = await supabase
        .from("checkout_sessions")
        .select("*")
        .eq("session_id", sessionId)
        .maybeSingle();

      if (refreshedSessionResult.error) {
        showError(
          "There was a problem preparing your order: " +
            (refreshedSessionResult.error.message || "Session reload failed"),
          refreshedSessionResult.error
        );
        return;
      }

      const refreshedSessionRow = refreshedSessionResult.data || null;

      if (!refreshedSessionRow) {
        showError("Checkout session could not be loaded.");
        return;
      }

      const refreshedCartItems = Array.isArray(refreshedSessionRow.cart_items)
        ? refreshedSessionRow.cart_items
        : [];

      if (!refreshedCartItems.length) {
        showError("Your cart is empty.");
        return;
      }

      const result = await window.AXIOM_ORDER_SUBMIT.createOrderFromSession({
        order_status: "pending_payment",
        payment_status: "pending",
        fulfillment_status: "unfulfilled",
        session_status: "converted"
      });

      if (!result || !result.ok) {
        showError(
          result?.error
            ? "There was a problem creating the order: " + result.error
            : "There was a problem creating the order.",
          result
        );
        return;
      }

      const redirectOrderNumber = result.orderNumber || result.order_number || "";
      const orderId = result.orderId || result.order_id || null;

      if (!redirectOrderNumber) {
        showError("The order was created, but the order number was missing.");
        return;
      }

      try {
        if (orderId) {
          window.dispatchEvent(
            new CustomEvent("axiom-order-created", {
              detail: {
                orderId: orderId,
                orderNumber: redirectOrderNumber
              }
            })
          );
        }
      } catch (eventDispatchError) {
        console.error("Order-created event dispatch failed:", eventDispatchError);
      }

      if (orderId) {
        await forceSyncConversion(orderId);
      }

      try {
        await window.AXIOM_CHECKOUT_SESSION.patchSession({
          cart_items: [],
          subtotal: 0,
          shipping_amount: 0,
          tax_amount: 0,
          discount_amount: 0,
          discount_code: null,
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

      window.location.href =
        THANK_YOU_BASE_URL + "?order=" + encodeURIComponent(redirectOrderNumber);
    } catch (error) {
      console.error("Checkout submit failed:", error);
      alert("There was a problem submitting your order: " + (error?.message || "Unknown error"));
    } finally {
      setSubmittingState(false);
    }
  });
});
