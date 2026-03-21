(function () {
  const {
    safeArray,
    formatMoney,
    formatDateTime,
    setText,
    getOrderDisplayTitle,
    getOrderStatusBadgeHtml,
    isPendingPaymentOrder,
    isPaidOrProcessingOrder,
    isActiveCheckoutSession,
    isPendingCheckoutSession,
    isAbandonedCheckoutSession
  } = window.AXIOM_DASHBOARD_UTILS;

  const {
    fetchCheckoutSessions,
    fetchOrders,
    countPageViewsSince,
    countUniqueVisitorsSince
  } = window.AXIOM_DASHBOARD_DATA;

  async function refreshHomeDashboard() {
    const state = window.AXIOM_DASHBOARD_STATE;
    const now = new Date();

    function isoDaysAgo(days) {
      const d = new Date(now);
      d.setDate(d.getDate() - days);
      return d.toISOString();
    }

    const [sessions, orders, todayViews, todayVisitors, sevenDayViews] = await Promise.all([
      fetchCheckoutSessions(),
      fetchOrders(),
      countPageViewsSince(isoDaysAgo(1)),
      countUniqueVisitorsSince(isoDaysAgo(1)),
      countPageViewsSince(isoDaysAgo(7))
    ]);

    state.allSessions = sessions;
    state.allOrders = orders;

    const unfulfilledOrders = orders.filter((order) => {
      const fulfillmentStatus = String(order.fulfillment_status || "").toLowerCase();
      const orderStatus = String(order.order_status || "").toLowerCase();

      return fulfillmentStatus === "unfulfilled" || orderStatus === "cancelled";
    }).length;

    const pendingPaymentOrders = orders.filter((order) => isPendingPaymentOrder(order)).length;
    const paidOrders = orders.filter((order) => isPaidOrProcessingOrder(order)).length;

    const activeSessions = sessions.filter((session) => isActiveCheckoutSession(session)).length;
    const pendingSessions = sessions.filter((session) => isPendingCheckoutSession(session)).length;
    const abandonedSessions = sessions.filter((session) => isAbandonedCheckoutSession(session)).length;

    setText("homeUnfulfilledOrders", unfulfilledOrders);
    setText("homePendingPaymentOrders", pendingPaymentOrders);
    setText("homePaidOrders", paidOrders);

    setText("homeActiveSessions", activeSessions);
    setText("homePendingSessions", pendingSessions);
    setText("homeAbandonedSessions", abandonedSessions);

    setText("homePageViewsToday", todayViews);
    setText("homeVisitorsToday", todayVisitors);
    setText("homePageViews7Days", sevenDayViews);

    if (
      window.AXIOM_DASHBOARD_APP &&
      typeof window.AXIOM_DASHBOARD_APP === "object"
    ) {
      window.AXIOM_DASHBOARD_APP.orders = orders;
      window.AXIOM_DASHBOARD_APP.checkoutSessionsForTracking = sessions;
    }

    if (
      window.AXIOM_PAYMENT_TRACKING &&
      typeof window.AXIOM_PAYMENT_TRACKING.render === "function"
    ) {
      window.AXIOM_PAYMENT_TRACKING.render(orders);
    }

    const homeRecentOrders = document.getElementById("homeRecentOrders");
    if (homeRecentOrders) {
      const recentOrders = orders.slice(0, 5);

      if (!recentOrders.length) {
        homeRecentOrders.innerHTML = `<div class="dashboard-empty">No orders found.</div>`;
      } else {
        homeRecentOrders.innerHTML = recentOrders.map((order) => {
          return `
            <div class="dashboard-session-card" data-home-order-id="${order.id}">
              <h4>Order #${order.order_number || "—"}</h4>
              <p>${getOrderDisplayTitle(order)}</p>
              ${getOrderStatusBadgeHtml(order)}
              <p>${formatDateTime(order.created_at)}</p>
              <p>${formatMoney(order.total_amount)}</p>
            </div>
          `;
        }).join("");

        homeRecentOrders.querySelectorAll("[data-home-order-id]").forEach((card) => {
          card.addEventListener("click", async () => {
            state.selectedOrderId = card.getAttribute("data-home-order-id");
            state.isOrderDetailOpen = true;

            if (window.AXIOM_DASHBOARD_APP && typeof window.AXIOM_DASHBOARD_APP.showView === "function") {
              await window.AXIOM_DASHBOARD_APP.showView("orders");
            } else {
              const ordersView = document.getElementById("dashboardOrdersView");
              if (ordersView) {
                ordersView.hidden = false;
              }
              await window.AXIOM_DASHBOARD_ORDERS.refreshOrders();
            }

            window.AXIOM_DASHBOARD_ORDERS.openSelectedOrderDetail();
          });
        });
      }
    }

    const homeRecentSessions = document.getElementById("homeRecentSessions");
    if (homeRecentSessions) {
      const sessionsCard = homeRecentSessions.closest(".dashboard-card");
      if (sessionsCard) {
        sessionsCard.remove();
      } else {
        homeRecentSessions.innerHTML = "";
      }
    }
  }

  window.AXIOM_DASHBOARD_HOME = {
    refreshHomeDashboard
  };
})();
