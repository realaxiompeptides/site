(function () {
  const { loadPartials } = window.AXIOM_DASHBOARD_PARTIALS;
  const { refreshDashboard, renderSessionsList } = window.AXIOM_DASHBOARD_SESSIONS;
  const { refreshOrders } = window.AXIOM_DASHBOARD_ORDERS;
  const { refreshHomeDashboard } = window.AXIOM_DASHBOARD_HOME;
  const { refreshAnalytics } = window.AXIOM_DASHBOARD_ANALYTICS;
  const { refreshProducts } = window.AXIOM_DASHBOARD_PRODUCTS;
  const { subscribeDashboardRealtime } = window.AXIOM_DASHBOARD_REALTIME;

  async function refreshAffiliatesSafe() {
    if (
      window.AXIOM_ADMIN_AFFILIATES &&
      typeof window.AXIOM_ADMIN_AFFILIATES.loadAffiliates === "function"
    ) {
      await window.AXIOM_ADMIN_AFFILIATES.loadAffiliates();
    }
  }

  async function refreshAllDashboardData() {
    await Promise.all([
      refreshHomeDashboard(),
      refreshDashboard(),
      refreshOrders(),
      refreshAffiliatesSafe()
    ]);
  }

  async function boot() {
    const state = window.AXIOM_DASHBOARD_STATE || {
      allSessions: [],
      allOrders: [],
      selectedSessionId: null,
      selectedOrderId: null,
      dashboardRealtimeChannel: null,
      hasShownCheckoutSessionsError: false,
      hasShownOrdersError: false,
      isOrderDetailOpen: false
    };

    window.AXIOM_DASHBOARD_STATE = state;

    const views = {
      home: document.getElementById("dashboardHomeView"),
      sessions: document.getElementById("dashboardSessionsView"),
      analytics: document.getElementById("dashboardAnalyticsView"),
      orders: document.getElementById("dashboardOrdersView"),
      products: document.getElementById("dashboardProductsView"),
      affiliates: document.getElementById("dashboardAffiliatesView")
    };

    const buttons = {
      home: document.getElementById("showHomeViewBtn"),
      sessions: document.getElementById("showSessionsViewBtn"),
      analytics: document.getElementById("showAnalyticsViewBtn"),
      orders: document.getElementById("showOrdersViewBtn"),
      products: document.getElementById("showProductsViewBtn"),
      affiliates: document.getElementById("showAffiliatesViewBtn")
    };

    const sessionsSidebar = document.getElementById("dashboardSessionsSidebar");
    const analyticsSidebar = document.getElementById("dashboardAnalyticsSidebar");
    const ordersSidebar = document.getElementById("dashboardOrdersSidebar");
    const productsSidebar = document.getElementById("dashboardProductsSidebar");
    const affiliatesSidebar = document.getElementById("dashboardAffiliatesSidebar");

    function setActiveButton(activeKey) {
      Object.entries(buttons).forEach(([key, btn]) => {
        if (!btn) return;
        btn.classList.toggle("active", key === activeKey);
      });
    }

    function showOrdersListOnly() {
      state.isOrderDetailOpen = false;

      if (
        window.AXIOM_ORDER_DETAIL &&
        typeof window.AXIOM_ORDER_DETAIL.hide === "function"
      ) {
        window.AXIOM_ORDER_DETAIL.hide();
      }

      const ordersListWrap = document.getElementById("ordersListWrap");
      const ordersListCard = ordersListWrap ? ordersListWrap.closest(".dashboard-card") : null;

      if (ordersListCard) {
        ordersListCard.hidden = false;
        ordersListCard.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    async function showView(viewKey) {
      Object.values(views).forEach((view) => {
        if (view) view.hidden = true;
      });

      if (views[viewKey]) {
        views[viewKey].hidden = false;
      }

      if (sessionsSidebar) sessionsSidebar.hidden = viewKey !== "sessions";
      if (analyticsSidebar) analyticsSidebar.hidden = viewKey !== "analytics";
      if (ordersSidebar) ordersSidebar.hidden = viewKey !== "orders";
      if (productsSidebar) productsSidebar.hidden = viewKey !== "products";
      if (affiliatesSidebar) affiliatesSidebar.hidden = viewKey !== "affiliates";

      setActiveButton(viewKey);

      if (viewKey === "home") {
        await refreshHomeDashboard();
      }

      if (viewKey === "sessions") {
        await refreshDashboard();
      }

      if (viewKey === "analytics") {
        await refreshAnalytics();
      }

      if (viewKey === "orders") {
        await refreshOrders();
      }

      if (viewKey === "products") {
        await refreshProducts();
      }

      if (viewKey === "affiliates") {
        await refreshAffiliatesSafe();
      }
    }

    window.AXIOM_DASHBOARD_APP = {
      showView,
      showOrdersListOnly,
      refreshHomeDashboard,
      refreshDashboard,
      refreshOrders,
      refreshProducts,
      refreshAffiliates: refreshAffiliatesSafe,
      refreshAllDashboardData,
      renderOrdersList:
        window.AXIOM_DASHBOARD_ORDERS &&
        typeof window.AXIOM_DASHBOARD_ORDERS.renderOrdersList === "function"
          ? window.AXIOM_DASHBOARD_ORDERS.renderOrdersList
          : function () {},
      renderRecentOrders: refreshHomeDashboard,
      orders: state.allOrders,
      checkoutSessionsForTracking: state.allSessions
    };

    try {
      await loadPartials();

      if (
        window.AXIOM_PAYMENT_TRACKING &&
        typeof window.AXIOM_PAYMENT_TRACKING.init === "function"
      ) {
        window.AXIOM_PAYMENT_TRACKING.init();
      }

      if (
        window.AXIOM_ORDER_DETAIL &&
        typeof window.AXIOM_ORDER_DETAIL.init === "function"
      ) {
        window.AXIOM_ORDER_DETAIL.init();
        if (typeof window.AXIOM_ORDER_DETAIL.hide === "function") {
          window.AXIOM_ORDER_DETAIL.hide();
        }
      }

      await refreshHomeDashboard();
      await refreshDashboard();
      await refreshOrders();

      document.getElementById("sessionSearch")?.addEventListener("input", renderSessionsList);
      document.getElementById("statusFilter")?.addEventListener("change", renderSessionsList);

      document.getElementById("refreshSessionsBtn")?.addEventListener("click", async function () {
        await refreshDashboard();
      });

      document.getElementById("refreshAnalyticsBtn")?.addEventListener("click", async function () {
        await refreshAnalytics();
      });

      document.getElementById("refreshAnalyticsBtnTop")?.addEventListener("click", async function () {
        await refreshAnalytics();
      });

      document.getElementById("refreshOrdersBtn")?.addEventListener("click", async function () {
        await refreshOrders();
      });

      document.getElementById("refreshOrdersBtnTop")?.addEventListener("click", async function () {
        await refreshOrders();
      });

      document.getElementById("refreshProductsBtn")?.addEventListener("click", async function () {
        await refreshProducts();
      });

      document.getElementById("refreshProductsBtnTop")?.addEventListener("click", async function () {
        await refreshProducts();
      });

      document.getElementById("refreshAffiliatesBtn")?.addEventListener("click", async function () {
        await refreshAffiliatesSafe();
      });

      document.getElementById("refreshAffiliatesBtnTop")?.addEventListener("click", async function () {
        await refreshAffiliatesSafe();
      });

      document.getElementById("refreshHomeDashboardBtn")?.addEventListener("click", async function () {
        await refreshHomeDashboard();
      });

      buttons.home?.addEventListener("click", async function () {
        await showView("home");
      });

      buttons.sessions?.addEventListener("click", async function () {
        await showView("sessions");
      });

      buttons.analytics?.addEventListener("click", async function () {
        await showView("analytics");
      });

      buttons.orders?.addEventListener("click", async function () {
        state.isOrderDetailOpen = false;
        await showView("orders");
      });

      buttons.products?.addEventListener("click", async function () {
        await showView("products");
      });

      buttons.affiliates?.addEventListener("click", async function () {
        await showView("affiliates");
      });

      document.getElementById("quickOpenSessionsBtn")?.addEventListener("click", async function () {
        await showView("sessions");
      });

      document.getElementById("quickOpenAnalyticsBtn")?.addEventListener("click", async function () {
        await showView("analytics");
      });

      document.getElementById("quickOpenOrdersBtn")?.addEventListener("click", async function () {
        state.isOrderDetailOpen = false;
        await showView("orders");
      });

      document.getElementById("quickOpenProductsBtn")?.addEventListener("click", async function () {
        await showView("products");
      });

      document.getElementById("quickOpenAffiliatesBtn")?.addEventListener("click", async function () {
        await showView("affiliates");
      });

      subscribeDashboardRealtime();
      await showView("home");
    } catch (error) {
      console.error("Dashboard failed to initialize:", error);
      alert("Dashboard failed to initialize: " + (error.message || "Unknown error"));
    }
  }

  window.AXIOM_DASHBOARD_INIT = {
    boot,
    refreshAllDashboardData
  };
})();
