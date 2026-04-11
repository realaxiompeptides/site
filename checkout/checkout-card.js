function axiomGetCardStatusEl() {
  return document.getElementById("checkoutCardStatus");
}

function axiomSetCardStatus(message, type) {
  const el = axiomGetCardStatusEl();
  if (!el) return;

  el.textContent = message || "";
  el.classList.remove("error", "success");

  if (type === "error") el.classList.add("error");
  if (type === "success") el.classList.add("success");
}

function axiomCardSelected() {
  const checked = document.querySelector('input[name="paymentMethod"]:checked');
  if (!checked) return false;

  return ["creditcard", "credit_card", "card"].includes(
    String(checked.value || "").trim().toLowerCase()
  );
}

function axiomToggleCardFields() {
  const section = document.getElementById("checkoutCardFieldsSection");
  if (!section) return;

  section.hidden = !axiomCardSelected();
}

function axiomBindCardPaymentVisibility() {
  const radios = document.querySelectorAll('input[name="paymentMethod"]');

  radios.forEach((radio) => {
    if (radio.dataset.cardToggleBound === "true") return;
    radio.dataset.cardToggleBound = "true";
    radio.addEventListener("change", axiomToggleCardFields);
  });

  axiomToggleCardFields();
}

function axiomGetCheckoutSessionId() {
  if (
    window.AXIOM_CHECKOUT_SESSION &&
    typeof window.AXIOM_CHECKOUT_SESSION.ensureSession === "function"
  ) {
    return window.AXIOM_CHECKOUT_SESSION.ensureSession();
  }

  return Promise.resolve(null);
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

function axiomGetCheckoutValue(id) {
  return document.getElementById(id)?.value?.trim() || "";
}

function axiomGetCardPayload() {
  const cardHolderName =
    axiomGetCheckoutValue("cardHolderName") ||
    [axiomGetCheckoutValue("firstName"), axiomGetCheckoutValue("lastName")]
      .filter(Boolean)
      .join(" ")
      .trim();

  return {
    cardHolderName,
    cardNumber: (document.getElementById("cardNumber")?.value || "").replace(/\s+/g, ""),
    cardExpiryMonth: axiomGetCheckoutValue("cardExpiryMonth"),
    cardExpiryYear: axiomGetCheckoutValue("cardExpiryYear"),
    cardCvv: axiomGetCheckoutValue("cardCvv")
  };
}

function axiomValidateCardPayload(payload) {
  if (!payload.cardHolderName) return "Name on card is required.";
  if (!payload.cardNumber || payload.cardNumber.length < 12) return "Enter a valid card number.";
  if (!payload.cardExpiryMonth || payload.cardExpiryMonth.length < 2) return "Enter a valid expiry month.";
  if (!payload.cardExpiryYear || payload.cardExpiryYear.length < 4) return "Enter a valid expiry year.";
  if (!payload.cardCvv || payload.cardCvv.length < 3) return "Enter a valid CVV.";
  return "";
}

async function axiomRefreshCheckoutSessionIfPossible() {
  if (typeof fetchCurrentCheckoutSession === "function") {
    try {
      await fetchCurrentCheckoutSession();
    } catch (error) {
      console.error("Failed refreshing checkout session:", error);
    }
  }
}

function axiomGetOrderNumberFromSessionOrResponse(response) {
  if (
    window.axiomCurrentCheckoutSession &&
    window.axiomCurrentCheckoutSession.order_number
  ) {
    return window.axiomCurrentCheckoutSession.order_number;
  }

  if (
    typeof axiomCurrentCheckoutSession !== "undefined" &&
    axiomCurrentCheckoutSession &&
    axiomCurrentCheckoutSession.order_number
  ) {
    return axiomCurrentCheckoutSession.order_number;
  }

  return response?.order_number || "";
}

async function axiomHandleCreditCardCheckoutSubmit(e) {
  if (e.target.id !== "checkoutForm") return;
  if (!axiomCardSelected()) return;

  e.preventDefault();
  e.stopImmediatePropagation();

  axiomSetCardStatus("", "");

  try {
    if (typeof syncCheckoutSessionFromForm === "function") {
      await syncCheckoutSessionFromForm();
    }

    const sessionId = await axiomGetCheckoutSessionId();
    if (!sessionId) {
      throw new Error("Checkout session not found.");
    }

    const cardPayload = axiomGetCardPayload();
    const cardError = axiomValidateCardPayload(cardPayload);

    if (cardError) {
      axiomSetCardStatus(cardError, "error");
      alert(cardError);
      return;
    }

    const email = axiomGetCheckoutValue("checkoutEmail");
    const phone = axiomGetCheckoutValue("phone");
    const firstName = axiomGetCheckoutValue("firstName");
    const lastName = axiomGetCheckoutValue("lastName");
    const address = axiomGetCheckoutValue("address1");
    const city = axiomGetCheckoutValue("city");
    const state = axiomGetCheckoutValue("state");
    const zipCode = axiomGetCheckoutValue("zip");
    const country = document.getElementById("country")?.value?.trim() || "US";

    axiomSetCardStatus("Processing card payment...", "success");

    const response = await axiomInvokeFunction("create-card-payment", {
      session_id: sessionId,
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      country,
      ...cardPayload,
      ipAddress: ""
    });

    const status = String(response?.status || "").toUpperCase();
    const statusCode = String(response?.statusCode || "");
    const redirectUrl = String(response?.redirectUrl || "").trim();

    if (status === "SUCCESS" || statusCode === "1") {
      axiomSetCardStatus("Payment successful. Redirecting...", "success");

      await axiomRefreshCheckoutSessionIfPossible();

      const orderNumber = axiomGetOrderNumberFromSessionOrResponse(response);

      if (!orderNumber) {
        window.location.href = "../thank-you/thank-you.html";
        return;
      }

      window.location.href = `../thank-you/thank-you.html?order=${encodeURIComponent(orderNumber)}`;
      return;
    }

    if ((statusCode === "2" || status === "3DS REQUIRED") && redirectUrl) {
      window.location.href = redirectUrl;
      return;
    }

    if (statusCode === "3" || status === "OTP REQUIRED") {
      axiomSetCardStatus(
        "This payment requires OTP verification. That flow is not wired yet.",
        "error"
      );
      alert("This payment requires OTP verification. OTP handling still needs to be added.");
      return;
    }

    const gatewayMessage =
      String(response?.raw?.message || response?.message || "").trim() ||
      "Payment was not approved. Please try another method.";

    axiomSetCardStatus(gatewayMessage, "error");
    alert(gatewayMessage);
  } catch (error) {
    console.error(error);
    axiomSetCardStatus("Card payment failed. Please try again.", "error");
    alert(error?.message || "Card payment failed.");
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  const mount = document.getElementById("checkoutCardFieldsMount");

  if (mount) {
    try {
      const response = await fetch("checkout-card-fields.html", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed loading checkout-card-fields.html");
      }
      mount.innerHTML = await response.text();
    } catch (error) {
      console.error(error);
    }
  }

  setTimeout(function () {
    axiomBindCardPaymentVisibility();
  }, 250);
});

document.addEventListener("submit", axiomHandleCreditCardCheckoutSubmit, true);
