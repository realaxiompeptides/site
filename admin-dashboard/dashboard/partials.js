(function () {
  async function loadPartialIntoMount(file, mountId) {
    const mount = document.getElementById(mountId);
    if (!mount) return;

    try {
      const response = await fetch(file, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load " + file);
      }

      mount.innerHTML = await response.text();
    } catch (error) {
      console.error(error);
      mount.innerHTML = `
        <div class="dashboard-card dashboard-span-2">
          <div class="dashboard-loading">Failed to load ${file}</div>
        </div>
      `;
    }
  }

  async function loadPartials() {
    await Promise.all([
      loadPartialIntoMount("session-overview/session-overview.html", "sessionOverviewMount"),
      loadPartialIntoMount("payment-info/payment.html", "paymentInfoMount"),
      loadPartialIntoMount("shipping-info/shipping.html", "shippingInfoMount"),
      loadPartialIntoMount("billing-info/billing.html", "billingInfoMount"),
      loadPartialIntoMount("cart-items/cart-items.html", "cartItemsMount"),
      loadPartialIntoMount("analytics/analytics.html", "analyticsMount"),
      loadPartialIntoMount("order-detail/order-detail.html", "orderDetailMount"),
      loadPartialIntoMount("affiliates/affiliates.html", "affiliatesAdminMount")
    ]);
  }

  window.AXIOM_DASHBOARD_PARTIALS = {
    loadPartials
  };
})();
