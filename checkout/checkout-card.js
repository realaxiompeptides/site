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
  return String(checked.value || "").trim().toLowerCase() === "creditcard";
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
    throw error;
  }

  return data;
}

function axiomGetCardPayload() {
  return {
    cardHolderName: document.getElementById("cardHolderName")?.value.trim() || "",
    cardNumber: document.getElementById("cardNumber")?.value.replace(/\s+/g, "") || "",
    cardExpiryMonth: document.getElementById("cardExpiryMonth")?.value.trim() || "",
    cardExpiryYear: document.getElementById("cardExpiryYear")?.value.trim() || "",
    cardCvv: document.getElementById("cardCvv")?.value.trim() || ""
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

    axiomSetCardStatus("Processing card payment...", "success");

    const response = await axiomInvokeFunction("quiklie-create-payment", {
      session_id: sessionId,
      ...cardPayload,
      ipAddress: ""
    });

    const status = String(response?.status || "").toUpperCase();
    const statusCode = String(response?.statusCode || "");
    const redirectUrl = String(response?.redirectUrl || "");
    const orderNumber = response?.order_number;

    if (status === "SUCCESS" || statusCode === "1") {
      axiomSetCardStatus("Payment successful. Redirecting...", "success");
      window.location.href = `../thank-you/thank-you.html?order=${encodeURIComponent(orderNumber)}`;
      return;
    }

    if (statusCode === "2" && redirectUrl) {
      window.location.href = redirectUrl;
      return;
    }

    if (statusCode === "3") {
      const otp = window.prompt("Enter the OTP code sent by your bank:");
      if (!otp) {
        axiomSetCardStatus("OTP is required to continue.", "error");
        return;
      }

      const otpResponse = await axiomInvokeFunction("quiklie-verify-otp", {
        transactionId: response?.transactionId,
        otp
      });

      const otpStatus = String(otpResponse?.status || "").toUpperCase();
      const otpStatusCode = String(otpResponse?.statusCode || "");

      if (otpStatus === "SUCCESS" || otpStatusCode === "1") {
        window.location.href = `../thank-you/thank-you.html?order=${encodeURIComponent(orderNumber)}`;
        return;
      }

      axiomSetCardStatus("OTP verification did not complete payment.", "error");
      alert("OTP verification did not complete payment.");
      return;
    }

    axiomSetCardStatus("Payment was not approved. Please try another method.", "error");
    alert("Payment was not approved. Please try another method.");
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
      if (!response.ok) throw new Error("Failed loading checkout-card-fields.html");
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
