window.AXIOM_ORDERS_LIST = {
  selectedOrderId: null,

  render(allOrders) {
    const wrap = document.getElementById("ordersListWrap");
    if (!wrap) return;

    if (!Array.isArray(allOrders) || !allOrders.length) {
      wrap.innerHTML = `<div class="dashboard-empty">No orders found.</div>`;
      if (window.AXIOM_ORDER_DETAIL) window.AXIOM_ORDER_DETAIL.clear();
      return;
    }

    if (!this.selectedOrderId) {
      this.selectedOrderId = allOrders[0].id;
    }

    if (!allOrders.some((entry) => entry.id === this.selectedOrderId)) {
      this.selectedOrderId = allOrders[0].id;
    }

    wrap.innerHTML = allOrders.map((order) => {
      const fullName = [order.customer_first_name, order.customer_last_name]
        .filter(Boolean)
        .join(" ")
        .trim();

      const isActive = order.id === this.selectedOrderId;

      return `
        <div class="dashboard-session-card ${isActive ? "active" : ""}" data-order-id="${order.id}">
          <h4>Order #${order.order_number || "—"}</h4>
          <p>${fullName || order.customer_email || "Unknown customer"}</p>
          <p>${window.AXIOM_DASHBOARD_UTILS.formatDateTime(order.created_at)}</p>
          <p>Status: ${order.order_status || "—"} | Payment: ${order.payment_status || "—"} | Fulfillment: ${order.fulfillment_status || "—"}</p>
          <p>Total: ${window.AXIOM_DASHBOARD_UTILS.formatMoney(order.total_amount)}</p>
        </div>
      `;
    }).join("");

    const selectedOrder = allOrders.find((order) => order.id === this.selectedOrderId);
    if (window.AXIOM_ORDER_DETAIL) {
      window.AXIOM_ORDER_DETAIL.render(selectedOrder);
    }

    wrap.querySelectorAll("[data-order-id]").forEach((card) => {
      card.addEventListener("click", () => {
        this.selectedOrderId = card.getAttribute("data-order-id");
        this.render(allOrders);

        const detailMount = document.getElementById("orderDetailMount");
        if (detailMount) {
          detailMount.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
  },

  openFromHome(orderId, allOrders, showOrdersView) {
    this.selectedOrderId = orderId;
    showOrdersView().then(() => {
      this.render(allOrders);

      const detailMount = document.getElementById("orderDetailMount");
      if (detailMount) {
        detailMount.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }
};
