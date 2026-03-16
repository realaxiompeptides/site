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
      country: "US"
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

    const label = checked.closest(".shipping-option")?.querySelector("span")?.textContent?.trim() || "";
    const price = Number(checked.value || 0);

    return {
      label,
      amount: price,
      code: checked.dataset.code || ""
    };
  },

  async syncAll() {
    if (!window.AXIOM_CHECKOUT_SESSION || !window.AXIOM_CART_SESSION) return;

    const email = document.getElementById("checkoutEmail")?.value.trim() || null;
    const phone = document.getElementById("phone")?.value.trim() || null;
    const shippingSelection = this.getShippingSelection();
    const paymentMethod = this.getPaymentMethod();

    const cartTotals = window.AXIOM_CART_SESSION.getCartTotals();
    const shippingAmount = Number(shippingSelection?.amount || 0);
    const taxAmount = 0;

    await window.AXIOM_CHECKOUT_SESSION.patchSession({
      customer_email: email,
      customer_phone: phone,
      shipping_address: this.getShippingAddress(),
      billing_address: this.getBillingAddress(),
      payment_method: paymentMethod,
      shipping_selection: shippingSelection,
      subtotal: cartTotals.subtotal,
      shipping_amount: shippingAmount,
      tax_amount: taxAmount,
      total_amount: cartTotals.subtotal + shippingAmount + taxAmount
    });
  },

  init() {
    const form = document.getElementById("checkoutForm");
    if (!form) return;

    const inputs = form.querySelectorAll("input, select, textarea");
    inputs.forEach((input) => {
      input.addEventListener("input", () => this.syncAll());
      input.addEventListener("change", () => this.syncAll());
    });

    this.syncAll();
  }
};

document.addEventListener("DOMContentLoaded", function () {
  window.AXIOM_CHECKOUT_TRACKING.init();
});
