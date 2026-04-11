let axiomCardTestCurrentSessionId = null;

const AXIOM_TEST_ITEM = {
  id: "test-card-product",
  slug: "test-card-product",
  name: "Card Test Product",
  product_name: "Card Test Product",
  variantLabel: "Test Charge",
  variant_label: "Test Charge",
  quantity: 1,
  qty: 1,
  price: 10,
  unit_price: 10,
  line_total: 10,
  image: "../images/products/placeholder.PNG",
  weightOz: 1,
  weight_oz: 1
};

function axiomTestStatusEl() {
  return document.getElementById("checkoutCardStatus");
}

function axiomTestOutputEl() {
  return document.getElementById("testResponseOutput");
}

function axiomTestSessionInfoEl() {
  return document.getElementById("sessionInfoText");
}

function axiomSetCardStatus(message, type) {
  const el = axiomTestStatusEl();
  if (!el) return;

  el.textContent = message || "";
  el.classList.remove("error", "success");

  if (type === "error") el.classList.add("error");
  if (type === "success") el.classList.add("success");
}

function axiomSetOutput(value) {
  const el = axiomTestOutputEl();
  if (!el) return;

  if (typeof value === "string") {
    el.textContent = value;
    return;
  }

  try {
    el.textContent = JSON.stringify(value, null, 2);
  } catch (error) {
    el.textContent = String(value);
  }
}

function axiomSetSessionInfo(message) {
  const el = axiomTestSessionInfoEl();
  if (!el) return;
  el.textContent = message || "";
}

function axiomGetValue(id) {
  return document.getElementById(id)?.value?.trim() || "";
}

function axiomSetValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

function axiomToNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function axiomFormatMoney(value) {
  return `$${axiomToNumber(value, 0).toFixed(2)}`;
}

function axiomSetValidationMessage(id, message) {
  const el = document.getElementById(id);
  if (!el) return;

  if (message) {
    el.textContent = message;
    el.classList.add("active");
  } else {
    el.textContent = "";
    el.classList.remove("active");
  }
}

function axiomValidateEmailValue(value) {
  const email = String(value || "").trim();
  if (!email) return "Email address is required.";

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return "Please enter a valid email address.";
  }

  return "";
}

function axiomValidatePhoneValue(value) {
  const phone = String(value || "").trim();
  if (!phone) return "";

  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) {
    return "Please enter a valid phone number or leave it blank.";
  }

  return "";
}

function axiomGetShippingAddress() {
  return {
    first_name: axiomGetValue("firstName"),
    last_name: axiomGetValue("lastName"),
    address1: axiomGetValue("address1"),
    address2: axiomGetValue("address2"),
    city: axiomGetValue("city"),
    state: axiomGetValue("state"),
    zip: axiomGetValue("zip"),
    phone: axiomGetValue("phone"),
    country: axiomGetValue("country") || "US"
  };
}

function axiomValidateAddressFields(showMessages = false) {
  const address = axiomGetShippingAddress();
  const missing = [];

  if (!address.first_name) missing.push("first name");
  if (!address.last_name) missing.push("last name");
  if (!address.address1) missing.push("street address");
  if (!address.city) missing.push("city");
  if (!address.state) missing.push("state / province / region");
  if (!address.zip) missing.push("ZIP / postal code");
  if (!address.country) missing.push("country");

  let message = "";
  if (missing.length) {
    message = `Please enter your ${missing.join(", ")}.`;
  }

  if (showMessages) {
    axiomSetValidationMessage("checkoutAddressError", message);
  }

  return {
    isValid: !message,
    message,
    address
  };
}

function axiomFormatCardNumber(value) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, 19)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function axiomFormatExpiry(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
}

function axiomFormatDigits(value, maxLength) {
  return String(value || "").replace(/\D/g, "").slice(0, maxLength);
}

function axiomParseExpiry(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (digits.length < 3) {
    return { month: "", year: "" };
  }

  const month = digits.slice(0, 2);
  let year = digits.slice(2);

  if (year.length === 2) {
    year = `20${year}`;
  }

  return {
    month,
    year
  };
}

function axiomBindCardFieldFormatting() {
  const cardNumberEl = document.getElementById("cardNumber");
  const expiryEl = document.getElementById("cardExpiry");
  const cvvEl = document.getElementById("cardCvv");

  if (cardNumberEl && cardNumberEl.dataset.formatBound !== "true") {
    cardNumberEl.dataset.formatBound = "true";
    cardNumberEl.addEventListener("input", function () {
      this.value = axiomFormatCardNumber(this.value);
    });
  }

  if (expiryEl && expiryEl.dataset.formatBound !== "true") {
    expiryEl.dataset.formatBound = "true";
    expiryEl.addEventListener("input", function () {
      this.value = axiomFormatExpiry(this.value);
    });
  }

  if (cvvEl && cvvEl.dataset.formatBound !== "true") {
    cvvEl.dataset.formatBound = "true";
    cvvEl.addEventListener("input", function () {
      this.value = axiomFormatDigits(this.value, 4);
    });
  }
}

function axiomGetCardPayload() {
  const parsedExpiry = axiomParseExpiry(axiomGetValue("cardExpiry"));

  return {
    cardHolderName: [axiomGetValue("firstName"), axiomGetValue("lastName")]
      .filter(Boolean)
      .join(" ")
      .trim(),
    cardNumber: axiomGetValue("cardNumber").replace(/\s+/g, ""),
    cardExpiryMonth: parsedExpiry.month,
    cardExpiryYear: parsedExpiry.year,
    cardCvv: axiomGetValue("cardCvv")
  };
}

function axiomValidateCardPayload(payload) {
  if (!payload.cardHolderName) return "Enter your first and last name above.";
  if (!payload.cardNumber || payload.cardNumber.length < 12) return "Enter a valid card number.";
  if (!payload.cardExpiryMonth || payload.cardExpiryMonth.length < 2) return "Enter a valid expiry date.";
  if (!payload.cardExpiryYear || payload.cardExpiryYear.length < 4) return "Enter a valid expiry date.";
  if (!payload.cardCvv || payload.cardCvv.length < 3) return "Enter a valid CVV.";

  const month = Number(payload.cardExpiryMonth);
  const year = Number(payload.cardExpiryYear);
  const currentYear = new Date().getFullYear();

  if (!Number.isFinite(month) || month < 1 || month > 12) {
    return "Enter a valid expiry date.";
  }

  if (!Number.isFinite(year) || year < currentYear) {
    return "Enter a valid expiry date.";
  }

  return "";
}

function axiomRenderSummary() {
  const subtotal = 10;
  const shipping = 0;
  const tax = 0;
  const total = subtotal + shipping + tax;

  const subtotalEl = document.getElementById("subtotal");
  const shippingEl = document.getElementById("shipping");
  const taxEl = document.getElementById("tax");
  const totalEl = document.getElementById("total");
  const summaryStaticTotalEl = document.getElementById("summaryStaticTotal");

  if (subtotalEl) subtotalEl.textContent = axiomFormatMoney(subtotal);
  if (shippingEl) shippingEl.textContent = axiomFormatMoney(shipping);
  if (taxEl) taxEl.textContent = axiomFormatMoney(tax);
  if (totalEl) totalEl.textContent = axiomFormatMoney(total);
  if (summaryStaticTotalEl) summaryStaticTotalEl.textContent = axiomFormatMoney(total);
}

async function axiomEnsureSupabaseSession() {
  if (
    !window.AXIOM_CHECKOUT_SESSION ||
    typeof window.AXIOM_CHECKOUT_SESSION.ensureSession !== "function"
  ) {
    throw new Error("AXIOM_CHECKOUT_SESSION.ensureSession is not available.");
  }

  const sessionId = await window.AXIOM_CHECKOUT_SESSION.ensureSession();

  if (!sessionId) {
    throw new Error("Failed to create or load checkout session.");
  }

  axiomCardTestCurrentSessionId = sessionId;
  axiomSetSessionInfo(`Prepared session: ${sessionId}`);
  return sessionId;
}

async function axiomPatchTestSession() {
  const emailValue = axiomGetValue("checkoutEmail");
  const phoneValue = axiomGetValue("phone");
  const emailError = axiomValidateEmailValue(emailValue);
  const phoneError = axiomValidatePhoneValue(phoneValue);
  const addressCheck = axiomValidateAddressFields(true);

  axiomSetValidationMessage("checkoutEmailError", emailError);
  axiomSetValidationMessage("checkoutPhoneError", phoneError);

  if (emailError) {
    throw new Error(emailError);
  }

  if (phoneError) {
    throw new Error(phoneError);
  }

  if (!addressCheck.isValid) {
    throw new Error("Please complete your shipping address.");
  }

  const sessionId = await axiomEnsureSupabaseSession();

  if (
    !window.AXIOM_CHECKOUT_SESSION ||
    typeof window.AXIOM_CHECKOUT_SESSION.patchSession !== "function"
  ) {
    throw new Error("AXIOM_CHECKOUT_SESSION.patchSession is not available.");
  }

  const shippingAddress = axiomGetShippingAddress();
  const subtotal = 10;
  const shippingAmount = 0;
  const taxAmount = 0;
  const totalAmount = subtotal + shippingAmount + taxAmount;

  const patchPayload = {
    session_status: "pending_payment",
    payment_status: "unpaid",
    fulfillment_status: "unfulfilled",
    customer_email: emailValue || null,
    customer_phone: phoneValue || null,
    customer_first_name: shippingAddress.first_name || null,
    customer_last_name: shippingAddress.last_name || null,
    shipping_address: shippingAddress,
    billing_address: shippingAddress,
    payment_method: "creditcard",
    cart_items: [AXIOM_TEST_ITEM],
    shipping_selection: {
      label: "Card Test Shipping",
      method_name: "Card Test Shipping",
      amount: shippingAmount,
      code: "card_test_shipping",
      method_code: "card_test_shipping",
      carrier: "Test",
      service_level: "Test",
      eta: "Test"
    },
    shipping_method_code: "card_test_shipping",
    shipping_method_name: "Card Test Shipping",
    shipping_carrier: "Test",
    shipping_service_level: "Test",
    subtotal: subtotal,
    shipping_amount: shippingAmount,
    tax_amount: taxAmount,
    discount_amount: 0,
    discount_code: null,
    total_amount: totalAmount,
    last_activity_at: new Date().toISOString()
  };

  await window.AXIOM_CHECKOUT_SESSION.patchSession(patchPayload);

  axiomSetOutput({
    message: "Session patched successfully.",
    session_id: sessionId,
    patch_payload: patchPayload
  });

  return sessionId;
}

async function axiomInvokeFunction(functionName, body) {
  if (!window.axiomSupabase || !window.axiomSupabase.functions) {
    throw new Error("Supabase functions client is not available.");
  }

  const { data, error } = await window.axiomSupabase.functions.invoke(functionName, {
    body
  });

  if (error) {
    throw new Error(error.message || "Function call failed.");
  }

  return data;
}

async function axiomSubmitTestCardOrder() {
  const submitBtn = document.getElementById("submitTestOrderBtn");
  const originalText = submitBtn ? submitBtn.textContent : "Submit Test Card Order";

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting...";
    }

    axiomSetCardStatus("", "");

    const sessionId = await axiomPatchTestSession();

    const cardPayload = axiomGetCardPayload();
    const cardError = axiomValidateCardPayload(cardPayload);

    if (cardError) {
      axiomSetCardStatus(cardError, "error");
      axiomSetOutput({ error: cardError, card_payload: cardPayload });
      return;
    }

    const requestBody = {
      session_id: sessionId,
      firstName: axiomGetValue("firstName"),
      lastName: axiomGetValue("lastName"),
      email: axiomGetValue("checkoutEmail"),
      phone: axiomGetValue("phone"),
      address: axiomGetValue("address1"),
      city: axiomGetValue("city"),
      state: axiomGetValue("state"),
      zipCode: axiomGetValue("zip"),
      country: axiomGetValue("country") || "US",
      ...cardPayload,
      ipAddress: "127.0.0.1"
    };

    axiomSetCardStatus("Processing card payment...", "success");
    axiomSetOutput({
      message: "Sending create-card-payment request...",
      request_body: requestBody
    });

    const response = await axiomInvokeFunction("create-card-payment", requestBody);

    const status = String(response?.status || "").toUpperCase();
    const statusCode = String(response?.statusCode || "");
    const redirectUrl = String(
      response?.redirectUrl ||
      response?.quikleeRedirectUrl ||
      response?.redirect_url ||
      ""
    ).trim();

    axiomSetOutput({
      request_body: requestBody,
      response
    });

    if (status === "SUCCESS" || statusCode === "1") {
      axiomSetCardStatus("Payment success response returned.", "success");
      return;
    }

    if ((statusCode === "2" || status === "3DS REQUIRED") && redirectUrl) {
      axiomSetCardStatus("3DS redirect returned by gateway.", "success");
      return;
    }

    if (statusCode === "3" || status === "OTP REQUIRED") {
      axiomSetCardStatus("OTP required response returned by gateway.", "success");
      return;
    }

    const message =
      String(response?.raw?.message || response?.message || "").trim() ||
      "Gateway returned a non-success response.";

    axiomSetCardStatus(message, "error");
  } catch (error) {
    console.error(error);
    axiomSetCardStatus(error?.message || "Test card request failed.", "error");
    axiomSetOutput({
      error: error?.message || "Unknown error"
    });
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }
}

function axiomFillSampleData() {
  axiomSetValue("checkoutEmail", "test@example.com");
  axiomSetValue("phone", "5551234567");
  axiomSetValue("firstName", "Test");
  axiomSetValue("lastName", "User");
  axiomSetValue("country", "US");
  axiomSetValue("address1", "123 Test St");
  axiomSetValue("address2", "");
  axiomSetValue("city", "Los Angeles");
  axiomSetValue("state", "CA");
  axiomSetValue("zip", "90001");
  axiomSetValue("cardNumber", "4111111111111111");
  axiomSetValue("cardExpiry", "12 / 27");
  axiomSetValue("cardCvv", "123");

  axiomRenderSummary();
  axiomSetCardStatus("Sample values filled.", "success");
}

document.addEventListener("DOMContentLoaded", function () {
  axiomRenderSummary();
  axiomBindCardFieldFormatting();

  const fillBtn = document.getElementById("fillSampleBtn");
  const prepareBtn = document.getElementById("prepareSessionBtn");
  const submitBtn = document.getElementById("submitTestOrderBtn");

  if (fillBtn) {
    fillBtn.addEventListener("click", function () {
      axiomFillSampleData();
    });
  }

  if (prepareBtn) {
    prepareBtn.addEventListener("click", async function () {
      try {
        axiomSetCardStatus("Preparing test session...", "success");
        const sessionId = await axiomPatchTestSession();
        axiomSetCardStatus("Test session prepared.", "success");
        axiomSetOutput({
          message: "Prepared session successfully.",
          session_id: sessionId
        });
      } catch (error) {
        console.error(error);
        axiomSetCardStatus(error?.message || "Failed to prepare session.", "error");
        axiomSetOutput({
          error: error?.message || "Unknown error"
        });
      }
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener("click", function () {
      axiomSubmitTestCardOrder();
    });
  }
});
