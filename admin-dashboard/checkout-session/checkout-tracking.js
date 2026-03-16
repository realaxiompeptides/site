window.AXIOM_CHECKOUT_TRACKING = {
  getShippingAddress() {
    return {
      first_name: document.getElementById("firstName")?.value.trim() || "",
      last_name: document.getElementById("lastName")?.value.trim() || "",
      address1: document.getElementById("address1")?.value.trim() || "",
      address2: document.getElementById("address2")?.value.trim() || "",
      city: document.getElementById("city")?.value.trim() || "",
      state: document.getElementById("state")?.value.trim() || "",
      zip: document.getElementById("zip")?.value.trim() || "",
      phone: document.getElementById("phone")?.value.trim() || "",
      country: document.getElementById("country")?.value.trim() || "US"
    };
  },

  getBillingAddress() {
    return this.getShippingAddress();
  },

  getPaymentMethod() {
    const checked = document.querySelector('input[name="paymentMethod"]:checked');
    return checked ? checked.value : null;
  },

  getShippingSelection() {
    const checked = document.querySelector('input[name="shippingMethod"]:checked');
    if (!checked) return null;

    const option = checked.closest(".shipping-option");
    const label = option?.querySelector("span")?.textContent?.trim() || "";
    const amount = Number(checked.value || 0);
    const code =
      checked.dataset.code ||
      label.toLowerCase().trim().replace(/\s+/g, "_");

    return {
      label,
      amount,
      code,
      carrier: label.includes("USPS") ? "USPS" : "",
      service_level: label
    };
  },

  calculateSubtotalFromItems(items) {
    const safeItems = Array.isArray(items) ? items : [];

    return safeItems.reduce((sum, item) => {
      const price = Number(item.price || item.variantPrice || 0);
      const quantity = Number(item.quantity || item.qty || 1);
      return sum + (price * quantity);
    }, 0);
  },

  async syncAll() {
    if (!window.AXIOM_CHECKOUT_SESSION || !window.axiomSupabase) return;

    const sessionId = await window.AXIOM_CHECKOUT_SESSION.ensureSession();
    if (!sessionId) return;

    const { data: sessionRow, error } = await window.axiomSupabase
      .from("checkout_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (error) {
      console.error("Failed to fetch checkout session during sync:", error);
      return;
    }

    const email = document.getElementById("checkoutEmail")?.value.trim() || null;
    const phone = document.getElementById("phone")?.value.trim() || null;

    const shippingAddress = this.getShippingAddress();
    const billingAddress = this.getBillingAddress();
    const paymentMethod = this.getPaymentMethod();
    const shippingSelection = this.getShippingSelection();

    const cartItems = Array.isArray(sessionRow?.cart_items) ? sessionRow.cart_items : [];
    const subtotal = this.calculateSubtotalFromItems(cartItems);
    const shippingAmount = Number(shippingSelection?.amount || 0);
    const taxAmount = Number(sessionRow?.tax_amount || 0);
    const totalAmount = subtotal + shippingAmount + taxAmount;

    await window.AXIOM_CHECKOUT_SESSION.patchSession({
      session_status: "active",
      customer_email: email,
      customer_phone: phone,
      customer_first_name: shippingAddress.first_name || null,
      customer_last_name: shippingAddress.last_name || null,
      shipping_address: shippingAddress,
      billing_address: billingAddress,
      payment_method: paymentMethod,
      shipping_selection: shippingSelection,
      shipping_amount: shippingAmount,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      shipping_method_code: shippingSelection?.code || null,
      shipping_method_name: shippingSelection?.label || null,
      shipping_carrier: shippingSelection?.carrier || null,
      shipping_service_level: shippingSelection?.service_level || null
    });
  },

  init() {
    const form = document.getElementById("checkoutForm");
    if (!form) return;

    const inputs = form.querySelectorAll("input, select, textarea");

    inputs.forEach((input) => {
      input.addEventListener("input", async () => {
        await this.syncAll();
      });

      input.addEventListener("change", async () => {
        await this.syncAll();
      });
    });

    this.syncAll();
  }
};

document.addEventListener("DOMContentLoaded", function () {
  if (window.AXIOM_CHECKOUT_TRACKING) {
    window.AXIOM_CHECKOUT_TRACKING.init();
  }
});
