document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("checkoutForm");
  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const termsCheckbox = document.getElementById("termsCheckbox");
    if (!termsCheckbox || !termsCheckbox.checked) {
      alert("You must agree to the Terms & Conditions before placing your order.");
      return;
    }

    const items = window.AXIOM_HELPERS.getCart();
    if (!items.length) {
      alert("Your cart is empty.");
      return;
    }

    if (window.AXIOM_CHECKOUT_TRACKING) {
      await window.AXIOM_CHECKOUT_TRACKING.syncAll();
    }

    const result = await window.AXIOM_ORDER_SUBMIT.createOrderFromSession({
      order_status: "pending_payment",
      payment_status: "pending",
      fulfillment_status: "unfulfilled"
    });

    if (!result.ok) {
      alert("There was a problem creating the order.");
      return;
    }

    window.location.href = `../order-confirmation/order-confirmation.html?order=${result.orderNumber}`;
  });
});
