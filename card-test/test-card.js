function axiomCardTestStatusEl() {
  return document.getElementById("cardTestStatus");
}

function axiomCardTestOutputEl() {
  return document.getElementById("cardTestOutput");
}

function axiomSetCardTestStatus(message, type) {
  const el = axiomCardTestStatusEl();
  if (!el) return;

  el.textContent = message || "";
  el.classList.remove("error", "success");

  if (type === "error") el.classList.add("error");
  if (type === "success") el.classList.add("success");
}

function axiomSetCardTestOutput(value) {
  const el = axiomCardTestOutputEl();
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

function axiomCardTestValue(id) {
  return document.getElementById(id)?.value?.trim() || "";
}

function axiomBuildCreatePaymentPayload() {
  return {
    session_id: axiomCardTestValue("sessionId"),
    firstName: axiomCardTestValue("firstName"),
    lastName: axiomCardTestValue("lastName"),
    email: axiomCardTestValue("email"),
    phone: axiomCardTestValue("phone"),
    address: axiomCardTestValue("address"),
    city: axiomCardTestValue("city"),
    state: axiomCardTestValue("state"),
    zipCode: axiomCardTestValue("zipCode"),
    country: axiomCardTestValue("country") || "US",
    cardNumber: axiomCardTestValue("cardNumber").replace(/\s+/g, ""),
    cardHolderName: [axiomCardTestValue("firstName"), axiomCardTestValue("lastName")]
      .filter(Boolean)
      .join(" ")
      .trim(),
    cardExpiryMonth: axiomCardTestValue("cardExpiryMonth"),
    cardExpiryYear: axiomCardTestValue("cardExpiryYear"),
    cardCvv: axiomCardTestValue("cardCvv"),
    ipAddress: axiomCardTestValue("ipAddress") || "127.0.0.1"
  };
}

function axiomValidateCreatePaymentPayload(payload) {
  if (!payload.session_id) return "session_id is required.";
  if (!payload.firstName) return "First name is required.";
  if (!payload.lastName) return "Last name is required.";
  if (!payload.email) return "Email is required.";
  if (!payload.address) return "Address is required.";
  if (!payload.city) return "City is required.";
  if (!payload.state) return "State is required.";
  if (!payload.zipCode) return "ZIP code is required.";
  if (!payload.country) return "Country is required.";
  if (!payload.cardNumber) return "Card number is required.";
  if (!payload.cardExpiryMonth) return "Expiry month is required.";
  if (!payload.cardExpiryYear) return "Expiry year is required.";
  if (!payload.cardCvv) return "CVV is required.";
  return "";
}

async function axiomInvokeCardTestFunction(functionName, body) {
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

function axiomFillCardTestSample() {
  if (!document.getElementById("firstName")?.value) {
    document.getElementById("firstName").value = "Test";
  }
  if (!document.getElementById("lastName")?.value) {
    document.getElementById("lastName").value = "User";
  }
  if (!document.getElementById("email")?.value) {
    document.getElementById("email").value = "test@example.com";
  }
  if (!document.getElementById("phone")?.value) {
    document.getElementById("phone").value = "5551234567";
  }
  if (!document.getElementById("address")?.value) {
    document.getElementById("address").value = "123 Test St";
  }
  if (!document.getElementById("city")?.value) {
    document.getElementById("city").value = "Los Angeles";
  }
  if (!document.getElementById("state")?.value) {
    document.getElementById("state").value = "CA";
  }
  if (!document.getElementById("zipCode")?.value) {
    document.getElementById("zipCode").value = "90001";
  }
  if (!document.getElementById("country")?.value) {
    document.getElementById("country").value = "US";
  }
  if (!document.getElementById("ipAddress")?.value) {
    document.getElementById("ipAddress").value = "127.0.0.1";
  }
  if (!document.getElementById("cardNumber")?.value) {
    document.getElementById("cardNumber").value = "4111111111111111";
  }
  if (!document.getElementById("cardExpiryMonth")?.value) {
    document.getElementById("cardExpiryMonth").value = "12";
  }
  if (!document.getElementById("cardExpiryYear")?.value) {
    document.getElementById("cardExpiryYear").value = "2027";
  }
  if (!document.getElementById("cardCvv")?.value) {
    document.getElementById("cardCvv").value = "123";
  }
}

async function axiomRunCreateCardPaymentTest() {
  const sendBtn = document.getElementById("sendCreatePaymentBtn");
  const payload = axiomBuildCreatePaymentPayload();
  const validationError = axiomValidateCreatePaymentPayload(payload);

  if (validationError) {
    axiomSetCardTestStatus(validationError, "error");
    axiomSetCardTestOutput({ error: validationError, payload });
    return;
  }

  try {
    if (sendBtn) sendBtn.disabled = true;

    axiomSetCardTestStatus("Sending test request...", "success");
    axiomSetCardTestOutput({
      request_sent_to: "create-card-payment",
      request_body: payload
    });

    const response = await axiomInvokeCardTestFunction("create-card-payment", payload);

    axiomSetCardTestStatus("Request completed.", "success");
    axiomSetCardTestOutput({
      request_body: payload,
      response
    });
  } catch (error) {
    console.error(error);
    axiomSetCardTestStatus("Test request failed.", "error");
    axiomSetCardTestOutput({
      request_body: payload,
      error: error?.message || "Unknown error"
    });
  } finally {
    if (sendBtn) sendBtn.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const sendBtn = document.getElementById("sendCreatePaymentBtn");
  const fillBtn = document.getElementById("fillSampleBtn");
  const clearBtn = document.getElementById("clearOutputBtn");

  if (fillBtn) {
    fillBtn.addEventListener("click", function () {
      axiomFillCardTestSample();
      axiomSetCardTestStatus("Sample values filled.", "success");
    });
  }

  if (sendBtn) {
    sendBtn.addEventListener("click", function () {
      axiomRunCreateCardPaymentTest();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      axiomSetCardTestStatus("", "");
      axiomSetCardTestOutput("No request sent yet.");
    });
  }
});
