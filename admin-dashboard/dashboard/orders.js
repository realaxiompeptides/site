(function () {
  const {
    formatMoney,
    formatDateTime,
    getOrderDisplayTitle,
    getOrderFulfillmentState,
    getOrderStatusBadgeHtml
  } = window.AXIOM_DASHBOARD_UTILS;

  const { fetchOrders } = window.AXIOM_DASHBOARD_DATA;

  function openSelectedOrderDetail() {
    const state = window.AXIOM_DASHBOARD_STATE;
    const selectedOrder = state.allOrders.find((entry) => entry.id === state.selectedOrderId) || null;

    if (
      window.AXIOM_ORDER_DETAIL &&
      typeof window.AXIOM_ORDER_DETAIL.setOrder === "function"
    ) {
      window.AXIOM_ORDER_DETAIL.setOrder(selectedOrder);
    }

    const panel = document.getElementById("orderDetailPanel");
    if (panel) {
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function renderOrdersList() {
    const state = window.AXIOM_DASHBOARD_STATE;
    const wrap = document.getElementById("ordersListWrap");
    if (!wrap) return;

    if (!Array.isArray(state.allOrders) || !state.allOrders.length) {
      wrap.innerHTML = `<div class="dashboard-empty">No orders found.</div>`;

      if (window.AXIOM_ORDER_DETAIL && typeof window.AXIOM_ORDER_DETAIL.clear === "function") {
        window.AXIOM_ORDER_DETAIL.clear();
      }

      if (window.AXIOM_ORDER_DETAIL && typeof window.AXIOM_ORDER_DETAIL.hide === "function") {
        window.AXIOM_ORDER_DETAIL.hide();
      }

      return;
    }

    wrap.innerHTML = state.allOrders.map((order) => {
      const fullName = [order.customer_first_name, order.customer_last_name]
        .filter(Boolean)
        .join(" ")
        .trim();

      return `
        <div class="dashboard-session-card" data-order-id="${order.id}">
          <h4>Order #${order.order_number || "—"}</h4>
          <p>${fullName || order.customer_email || "Unknown customer"}</p>
          <p>${formatDateTime(order.created_at)}</p>
          ${getOrderStatusBadgeHtml(order)}
          <p>Status: ${order.order_status || "—"} | Payment: ${order.payment_status || "—"} | Fulfillment: ${order.fulfillment_status || "—"}</p>
          <p>Total: ${formatMoney(order.total_amount)}</p>
        </div>
      `;
    }).join("");

    wrap.querySelectorAll("[data-order-id]").forEach((card) => {
      card.addEventListener("click", () => {
        state.selectedOrderId = card.getAttribute("data-order-id");
        state.isOrderDetailOpen = true;
        openSelectedOrderDetail();
      });
    });

    if (state.isOrderDetailOpen && state.selectedOrderId) {
      openSelectedOrderDetail();
    } else if (
      window.AXIOM_ORDER_DETAIL &&
      typeof window.AXIOM_ORDER_DETAIL.hide === "function"
    ) {
      window.AXIOM_ORDER_DETAIL.hide();
    }
  }

  async function refreshOrders() {
    const state = window.AXIOM_DASHBOARD_STATE;
    const wrap = document.getElementById("ordersListWrap");
    if (wrap) {
      wrap.innerHTML = `<div class="dashboard-loading">Loading orders...</div>`;
    }

    state.allOrders = await fetchOrders();

    if (
      window.AXIOM_DASHBOARD_APP &&
      typeof window.AXIOM_DASHBOARD_APP === "object"
    ) {
      window.AXIOM_DASHBOARD_APP.orders = state.allOrders;
    }

    if (state.selectedOrderId && !state.allOrders.some((entry) => entry.id === state.selectedOrderId)) {
      state.selectedOrderId = null;
      state.isOrderDetailOpen = false;

      if (window.AXIOM_ORDER_DETAIL && typeof window.AXIOM_ORDER_DETAIL.clear === "function") {
        window.AXIOM_ORDER_DETAIL.clear();
      }

      if (window.AXIOM_ORDER_DETAIL && typeof window.AXIOM_ORDER_DETAIL.hide === "function") {
        window.AXIOM_ORDER_DETAIL.hide();
      }
    }

    renderOrdersList();
  }

  window.AXIOM_DASHBOARD_ORDERS = {
    getOrderFulfillmentState,
    getOrderStatusBadgeHtml,
    openSelectedOrderDetail,
    renderOrdersList,
    refreshOrders
  };
})();
