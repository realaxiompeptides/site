(function () {
  const {
    formatMoney,
    formatDateTime,
    getOrderDisplayTitle,
    getOrderFulfillmentState,
    getOrderStatusBadgeHtml
  } = window.AXIOM_DASHBOARD_UTILS;

  const { fetchOrders } = window.AXIOM_DASHBOARD_DATA;

  function getCurrentOrderFilter() {
    const state = window.AXIOM_DASHBOARD_STATE;
    return String(state.currentOrderFilter || "all").trim().toLowerCase();
  }

  function setCurrentOrderFilter(nextFilter) {
    const state = window.AXIOM_DASHBOARD_STATE;
    state.currentOrderFilter = String(nextFilter || "all").trim().toLowerCase();
  }

  function setOrderFilterButtonsActive(nextFilter) {
    const normalized = String(nextFilter || "all").trim().toLowerCase();

    document.querySelectorAll("[data-order-filter]").forEach((btn) => {
      const buttonFilter = String(btn.getAttribute("data-order-filter") || "all")
        .trim()
        .toLowerCase();

      const isActive = buttonFilter === normalized;
      btn.classList.toggle("active", isActive);
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function getFilteredOrders(allOrders) {
    const rows = Array.isArray(allOrders) ? allOrders : [];
    const filter = getCurrentOrderFilter();

    if (filter === "all") return rows;

    return rows.filter((order) => {
      const orderStatus = String(order.order_status || "").trim().toLowerCase();
      const paymentStatus = String(order.payment_status || "").trim().toLowerCase();
      const fulfillmentStatus = String(order.fulfillment_status || "").trim().toLowerCase();

      if (filter === "fulfilled") {
        return fulfillmentStatus === "fulfilled" || fulfillmentStatus === "shipped";
      }

      if (filter === "unfulfilled") {
        return !["fulfilled", "shipped", "cancelled"].includes(fulfillmentStatus);
      }

      if (filter === "paid") {
        return paymentStatus === "paid";
      }

      if (filter === "unpaid") {
        return paymentStatus === "unpaid";
      }

      if (filter === "pending") {
        return orderStatus === "pending";
      }

      if (filter === "cancelled") {
        return orderStatus === "cancelled" || fulfillmentStatus === "cancelled";
      }

      return true;
    });
  }

  function openSelectedOrderDetail() {
    const state = window.AXIOM_DASHBOARD_STATE;
    const selectedOrder =
      state.allOrders.find((entry) => entry.id === state.selectedOrderId) || null;

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

    const filteredOrders = getFilteredOrders(state.allOrders);
    setOrderFilterButtonsActive(getCurrentOrderFilter());

    if (!Array.isArray(filteredOrders) || !filteredOrders.length) {
      wrap.innerHTML = `<div class="dashboard-empty">No orders found for this filter.</div>`;

      if (
        state.selectedOrderId &&
        !filteredOrders.some((entry) => entry.id === state.selectedOrderId)
      ) {
        state.selectedOrderId = null;
        state.isOrderDetailOpen = false;
      }

      if (
        window.AXIOM_ORDER_DETAIL &&
        typeof window.AXIOM_ORDER_DETAIL.clear === "function"
      ) {
        window.AXIOM_ORDER_DETAIL.clear();
      }

      if (
        window.AXIOM_ORDER_DETAIL &&
        typeof window.AXIOM_ORDER_DETAIL.hide === "function"
      ) {
        window.AXIOM_ORDER_DETAIL.hide();
      }

      return;
    }

    wrap.innerHTML = filteredOrders.map((order) => {
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

    if (
      state.isOrderDetailOpen &&
      state.selectedOrderId &&
      filteredOrders.some((entry) => entry.id === state.selectedOrderId)
    ) {
      openSelectedOrderDetail();
    } else if (
      window.AXIOM_ORDER_DETAIL &&
      typeof window.AXIOM_ORDER_DETAIL.hide === "function"
    ) {
      window.AXIOM_ORDER_DETAIL.hide();
    }
  }

  function bindOrderFilterButtons() {
    if (document.body.dataset.orderFilterButtonsBound === "true") return;
    document.body.dataset.orderFilterButtonsBound = "true";

    document.addEventListener("click", function (event) {
      const btn = event.target.closest("[data-order-filter]");
      if (!btn) return;

      event.preventDefault();

      const nextFilter = String(btn.getAttribute("data-order-filter") || "all")
        .trim()
        .toLowerCase();

      setCurrentOrderFilter(nextFilter);
      setOrderFilterButtonsActive(nextFilter);
      renderOrdersList();
    });
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

    if (!state.currentOrderFilter) {
      state.currentOrderFilter = "all";
    }

    if (
      state.selectedOrderId &&
      !state.allOrders.some((entry) => entry.id === state.selectedOrderId)
    ) {
      state.selectedOrderId = null;
      state.isOrderDetailOpen = false;

      if (
        window.AXIOM_ORDER_DETAIL &&
        typeof window.AXIOM_ORDER_DETAIL.clear === "function"
      ) {
        window.AXIOM_ORDER_DETAIL.clear();
      }

      if (
        window.AXIOM_ORDER_DETAIL &&
        typeof window.AXIOM_ORDER_DETAIL.hide === "function"
      ) {
        window.AXIOM_ORDER_DETAIL.hide();
      }
    }

    bindOrderFilterButtons();
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
