const DASHBOARD_PARTIALS = [
  { mountId: "sessionOverviewMount", file: "session-overview/session-overview.html" },
  { mountId: "paymentInfoMount", file: "payment-info/payment.html" },
  { mountId: "shippingInfoMount", file: "shipping-info/shipping.html" },
  { mountId: "billingInfoMount", file: "billing-info/billing.html" },
  { mountId: "cartItemsMount", file: "cart-items/cart-items.html" },
  { mountId: "analyticsMount", file: "analytics/analytics.html" },
  { mountId: "orderDetailMount", file: "order-detail/order-detail.html" }
];

let allSessions = [];
let allOrders = [];
let selectedSessionId = null;
let dashboardRealtimeChannel = null;
let hasShownCheckoutSessionsError = false;
let hasShownOrdersError = false;

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;

  if (value === undefined || value === null || value === "") {
    el.textContent = "—";
    return;
  }

  el.textContent = String(value);
}

function normalizeImagePath(path) {
  if (!path || typeof path !== "string") {
    return "../images/products/placeholder.PNG";
  }

  const cleanPath = path.trim();

  if (
    cleanPath.startsWith("../") ||
    cleanPath.startsWith("./") ||
    cleanPath.startsWith("/") ||
    cleanPath.startsWith("http://") ||
    cleanPath.startsWith("https://")
  ) {
    return cleanPath;
  }

  return `../${cleanPath}`;
}

function getAddressField(address, keys) {
  for (const key of keys) {
    if (address[key] !== undefined && address[key] !== null && String(address[key]).trim() !== "") {
      return String(address[key]).trim();
    }
  }
  return "";
}

function renderAddress(addressObj) {
  const address = safeObject(addressObj);

  const firstName = getAddressField(address, ["first_name", "firstName"]);
  const lastName = getAddressField(address, ["last_name", "lastName"]);
  const address1 = getAddressField(address, ["address1", "line1", "street", "street_address"]);
  const address2 = getAddressField(address, ["address2", "line2", "apartment", "suite"]);
  const city = getAddressField(address, ["city"]);
  const state = getAddressField(address, ["state", "province", "region"]);
  const zip = getAddressField(address, ["zip", "postal_code", "postalCode"]);
  const country = getAddressField(address, ["country", "country_code", "countryCode"]);

  const cityStateZip = [city, state, zip].filter(Boolean).join(", ");

  const lines = [
    [firstName, lastName].filter(Boolean).join(" ").trim(),
    address1,
    address2,
    cityStateZip,
    country
  ].filter(Boolean);

  if (!lines.length) {
    return `<p>—</p>`;
  }

  return `<p>${lines.join("<br>")}</p>`;
}

function getCartItemName(item) {
  return item.product_name || item.name || "Product";
}

function getCartItemVariant(item) {
  return item.variant_label || item.variantLabel || item.variant || item.option || "—";
}

function getCartItemQty(item) {
  return Number(item.quantity || item.qty || 0);
}

function getCartItemUnitPrice(item) {
  return Number(
    item.unit_price !== undefined && item.unit_price !== null
      ? item.unit_price
      : item.price !== undefined && item.price !== null
        ? item.price
        : 0
  );
}

function getCartItemLineTotal(item) {
  if (item.line_total !== undefined && item.line_total !== null) {
    return Number(item.line_total || 0);
  }

  return getCartItemQty(item) * getCartItemUnitPrice(item);
}

function getCartItemImage(item) {
  return normalizeImagePath(item.image || "");
}

function getShippingMethodName(session, shippingSelection) {
  return (
    session.shipping_method_name ||
    shippingSelection.method_name ||
    shippingSelection.label ||
    "—"
  );
}

function getShippingMethodCode(session, shippingSelection) {
  return (
    session.shipping_method_code ||
    shippingSelection.method_code ||
    shippingSelection.code ||
    "—"
  );
}

function getSessionDisplayTitle(session) {
  const firstName = session.customer_first_name || "";
  const lastName = session.customer_last_name || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return (
    fullName ||
    session.customer_email ||
    session.session_id ||
    "Checkout Session"
  );
}

function getSessionDisplayPhone(session) {
  return session.customer_phone || "No phone";
}

function getSessionBadgeClass(status) {
  return String(status || "active")
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function isPendingPaymentOrder(order) {
  const paymentStatus = String(order.payment_status || "").toLowerCase();
  const orderStatus = String(order.order_status || "").toLowerCase();

  return (
    paymentStatus === "unpaid" ||
    paymentStatus === "pending" ||
    orderStatus === "pending_payment"
  );
}

function isPaidOrProcessingOrder(order) {
  const paymentStatus = String(order.payment_status || "").toLowerCase();
  const fulfillmentStatus = String(order.fulfillment_status || "").toLowerCase();
  const orderStatus = String(order.order_status || "").toLowerCase();

  return (
    paymentStatus === "paid" ||
    fulfillmentStatus === "processing" ||
    fulfillmentStatus === "fulfilled" ||
    orderStatus === "processing"
  );
}

function isActiveCheckoutSession(session) {
  const status = String(session.session_status || "").toLowerCase();
  return status === "active";
}

function isPendingCheckoutSession(session) {
  const status = String(session.session_status || "").toLowerCase();
  return status === "pending_payment" || status === "converted";
}

function isAbandonedCheckoutSession(session) {
  const status = String(session.session_status || "").toLowerCase();
  return status === "abandoned";
}

function showOneTimeError(type, message, extra) {
  if (type === "checkout_sessions") {
    if (hasShownCheckoutSessionsError) return;
    hasShownCheckoutSessionsError = true;
  }

  if (type === "orders") {
    if (hasShownOrdersError) return;
    hasShownOrdersError = true;
  }

  console.error(message, extra || "");
  alert(message);
}

async function loadPartials() {
  await Promise.all(
    DASHBOARD_PARTIALS.map(async ({ mountId, file }) => {
      const mount = document.getElementById(mountId);
      if (!mount) return;

      const response = await fetch(file, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to load ${file}`);
      }

      mount.innerHTML = await response.text();
    })
  );
}

async function fetchCheckoutSessions() {
  if (!window.axiomSupabase) {
    showOneTimeError("checkout_sessions", "Supabase client missing on dashboard.");
    return [];
  }

  try {
    const { data, error } = await window.axiomSupabase
      .from("checkout_sessions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      showOneTimeError(
        "checkout_sessions",
        "Dashboard failed to load checkout sessions: " + (error.message || "Unknown error"),
        error
      );
      return [];
    }

    console.log("checkout_sessions loaded:", data?.length || 0, data);
    return data || [];
  } catch (error) {
    showOneTimeError(
      "checkout_sessions",
      "Dashboard failed to load checkout sessions: " + (error?.message || "Load failed"),
      error
    );
    return [];
  }
}

async function fetchOrders() {
  if (!window.axiomSupabase) {
    showOneTimeError("orders", "Supabase client missing on dashboard.");
    return [];
  }

  try {
    const { data, error } = await window.axiomSupabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      showOneTimeError(
        "orders",
        "Dashboard failed to load orders: " + (error.message || "Unknown error"),
        error
      );
      return [];
    }

    console.log("orders loaded:", data?.length || 0, data);
    return data || [];
  } catch (error) {
    showOneTimeError(
      "orders",
      "Dashboard failed to load orders: " + (error?.message || "Load failed"),
      error
    );
    return [];
  }
}

async function countPageViewsSince(dateIso) {
  if (!window.axiomSupabase) return 0;

  try {
    const { count, error } = await window.axiomSupabase
      .from("page_views")
      .select("*", { count: "exact", head: true })
      .gte("viewed_at", dateIso);

    if (error) {
      console.error("Failed to count page views:", error);
      return 0;
    }

    return Number(count || 0);
  } catch (error) {
    console.error("Failed to count page views:", error);
    return 0;
  }
}

async function countUniqueVisitorsSince(dateIso) {
  if (!window.axiomSupabase) return 0;

  try {
    const { data, error } = await window.axiomSupabase
      .from("page_views")
      .select("visitor_id")
      .gte("viewed_at", dateIso);

    if (error) {
      console.error("Failed to count unique visitors:", error);
      return 0;
    }

    return new Set(
      safeArray(data)
        .map((row) => row.visitor_id)
        .filter(Boolean)
    ).size;
  } catch (error) {
    console.error("Failed to count unique visitors:", error);
    return 0;
  }
}

function getFilteredSessions() {
  const searchValue = (document.getElementById("sessionSearch")?.value || "").trim().toLowerCase();
  const statusValue = (document.getElementById("statusFilter")?.value || "").trim().toLowerCase();

  return allSessions.filter((session) => {
    const email = String(session.customer_email || "").toLowerCase();
    const phone = String(session.customer_phone || "").toLowerCase();
    const sessionId = String(session.session_id || "").toLowerCase();
    const firstName = String(session.customer_first_name || "").toLowerCase();
    const lastName = String(session.customer_last_name || "").toLowerCase();
    const fullName = `${firstName} ${lastName}`.trim();
    const status = String(session.session_status || "").toLowerCase();

    const matchesSearch =
      !searchValue ||
      email.includes(searchValue) ||
      phone.includes(searchValue) ||
      sessionId.includes(searchValue) ||
      firstName.includes(searchValue) ||
      lastName.includes(searchValue) ||
      fullName.includes(searchValue);

    const matchesStatus = !statusValue || status === statusValue;

    return matchesSearch && matchesStatus;
  });
}

function clearSelectedSessionDisplay() {
  setText("dashboardSessionTitle", "Select a session");

  setText("overviewSessionId", "—");
  setText("overviewStatus", "—");
  setText("overviewEmail", "—");
  setText("overviewPhone", "—");
  setText("overviewCreated", "—");
  setText("overviewLastActivity", "—");
  setText("overviewSubtotal", "—");
  setText("overviewShipping", "—");
  setText("overviewTax", "—");
  setText("overviewTotal", "—");

  setText("paymentMethodValue", "—");
  setText("paymentShippingMethodValue", "—");
  setText("paymentShippingCodeValue", "—");

  const shippingInfoBlock = document.getElementById("shippingInfoBlock");
  if (shippingInfoBlock) {
    shippingInfoBlock.innerHTML = `<p>—</p>`;
  }

  const billingInfoBlock = document.getElementById("billingInfoBlock");
  if (billingInfoBlock) {
    billingInfoBlock.innerHTML = `<p>—</p>`;
  }

  const cartItemsTableWrap = document.getElementById("cartItemsTableWrap");
  if (cartItemsTableWrap) {
    cartItemsTableWrap.innerHTML = `<div class="dashboard-empty">No cart items saved.</div>`;
  }
}

function renderSessionsList() {
  const list = document.getElementById("sessionsList");
  if (!list) return;

  const sessions = getFilteredSessions();

  if (!sessions.length) {
    list.innerHTML = `<div class="dashboard-empty">No checkout sessions found.</div>`;
    return;
  }

  list.innerHTML = sessions.map((session) => {
    const isActive = session.id === selectedSessionId;
    const badgeClass = getSessionBadgeClass(session.session_status);

    return `
      <div class="dashboard-session-card ${isActive ? "active" : ""}" data-session-id="${session.id}">
        <h4>${getSessionDisplayTitle(session)}</h4>
        <p>${getSessionDisplayPhone(session)}</p>
        <p>${formatDateTime(session.created_at)}</p>
        <span class="dashboard-badge ${badgeClass}">${session.session_status || "active"}</span>
      </div>
    `;
  }).join("");

  list.querySelectorAll("[data-session-id]").forEach((card) => {
    card.addEventListener("click", () => {
      selectedSessionId = card.getAttribute("data-session-id");
      renderSessionsList();
      renderSelectedSession();
    });
  });
}

function renderSelectedSession() {
  const session = allSessions.find((entry) => entry.id === selectedSessionId);

  if (!session) {
    clearSelectedSessionDisplay();
    return;
  }

  setText("dashboardSessionTitle", getSessionDisplayTitle(session));

  const shippingSelection = safeObject(session.shipping_selection);
  const cartItems = safeArray(session.cart_items);

  setText("overviewSessionId", session.session_id || "—");
  setText("overviewStatus", session.session_status || "—");
  setText("overviewEmail", session.customer_email || "—");
  setText("overviewPhone", session.customer_phone || "—");
  setText("overviewCreated", formatDateTime(session.created_at));
  setText("overviewLastActivity", formatDateTime(session.last_activity_at || session.updated_at));
  setText("overviewSubtotal", formatMoney(session.subtotal));
  setText("overviewShipping", formatMoney(session.shipping_amount));
  setText("overviewTax", formatMoney(session.tax_amount));
  setText("overviewTotal", formatMoney(session.total_amount));

  setText("paymentMethodValue", session.payment_method || "—");
  setText("paymentShippingMethodValue", getShippingMethodName(session, shippingSelection));
  setText("paymentShippingCodeValue", getShippingMethodCode(session, shippingSelection));

  const shippingInfoBlock = document.getElementById("shippingInfoBlock");
  if (shippingInfoBlock) {
    shippingInfoBlock.innerHTML = renderAddress(session.shipping_address);
  }

  const billingInfoBlock = document.getElementById("billingInfoBlock");
  if (billingInfoBlock) {
    billingInfoBlock.innerHTML = renderAddress(session.billing_address);
  }

  const cartItemsTableWrap = document.getElementById("cartItemsTableWrap");
  if (cartItemsTableWrap) {
    if (!cartItems.length) {
      cartItemsTableWrap.innerHTML = `<div class="dashboard-empty">No cart items saved.</div>`;
    } else {
      cartItemsTableWrap.innerHTML = cartItems.map((item) => {
        const qty = getCartItemQty(item);
        const lineTotal = getCartItemLineTotal(item);
        const image = getCartItemImage(item);

        return `
          <div class="dashboard-item-row">
            <div class="dashboard-item-image">
              <img src="${image}" alt="${getCartItemName(item)}" onerror="this.onerror=null;this.src='../images/products/placeholder.PNG';">
            </div>

            <div class="dashboard-item-info">
              <h4>${getCartItemName(item)}</h4>
              <p>${getCartItemVariant(item)}</p>
              <p>Qty: ${qty}</p>
            </div>

            <div class="dashboard-item-price">
              ${formatMoney(lineTotal)}
            </div>
          </div>
        `;
      }).join("");
    }
  }
}

function renderOrdersList() {
  const wrap = document.getElementById("ordersListWrap");
  if (!wrap) return;

  if (!Array.isArray(allOrders) || !allOrders.length) {
    wrap.innerHTML = `<div class="dashboard-empty">No orders found.</div>`;
    return;
  }

  wrap.innerHTML = allOrders.map((order) => {
    const fullName = [order.customer_first_name, order.customer_last_name]
      .filter(Boolean)
      .join(" ")
      .trim();

    return `
      <div class="dashboard-session-card">
        <h4>Order #${order.order_number || "—"}</h4>
        <p>${fullName || order.customer_email || "Unknown customer"}</p>
        <p>${formatDateTime(order.created_at)}</p>
        <p>Status: ${order.order_status || "—"} | Payment: ${order.payment_status || "—"} | Fulfillment: ${order.fulfillment_status || "—"}</p>
        <p>Total: ${formatMoney(order.total_amount)}</p>
      </div>
    `;
  }).join("");
}

async function refreshOrders() {
  const wrap = document.getElementById("ordersListWrap");
  if (wrap) {
    wrap.innerHTML = `<div class="dashboard-loading">Loading orders...</div>`;
  }

  allOrders = await fetchOrders();
  renderOrdersList();
}

async function refreshHomeDashboard() {
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

  const unfulfilledOrders = orders.filter((order) => {
    return String(order.fulfillment_status || "").toLowerCase() === "unfulfilled";
  }).length;

  const pendingPaymentOrders = orders.filter((order) => {
    return isPendingPaymentOrder(order);
  }).length;

  const paidOrders = orders.filter((order) => {
    return isPaidOrProcessingOrder(order);
  }).length;

  const activeSessions = sessions.filter((session) => {
    return isActiveCheckoutSession(session);
  }).length;

  const pendingSessions = sessions.filter((session) => {
    return isPendingCheckoutSession(session);
  }).length;

  const abandonedSessions = sessions.filter((session) => {
    return isAbandonedCheckoutSession(session);
  }).length;

  setText("homeUnfulfilledOrders", unfulfilledOrders);
  setText("homePendingPaymentOrders", pendingPaymentOrders);
  setText("homePaidOrders", paidOrders);

  setText("homeActiveSessions", activeSessions);
  setText("homePendingSessions", pendingSessions);
  setText("homeAbandonedSessions", abandonedSessions);

  setText("homePageViewsToday", todayViews);
  setText("homeVisitorsToday", todayVisitors);
  setText("homePageViews7Days", sevenDayViews);

  const homeRecentOrders = document.getElementById("homeRecentOrders");
  if (homeRecentOrders) {
    const recentOrders = orders.slice(0, 5);

    if (!recentOrders.length) {
      homeRecentOrders.innerHTML = `<div class="dashboard-empty">No orders found.</div>`;
    } else {
      homeRecentOrders.innerHTML = recentOrders.map((order) => {
        return `
          <div class="dashboard-session-card">
            <h4>Order #${order.order_number || "—"}</h4>
            <p>${order.customer_email || "No email"}</p>
            <p>${formatDateTime(order.created_at)}</p>
            <p>${formatMoney(order.total_amount)}</p>
          </div>
        `;
      }).join("");
    }
  }

  const homeRecentSessions = document.getElementById("homeRecentSessions");
  if (homeRecentSessions) {
    const recentSessions = sessions.slice(0, 5);

    if (!recentSessions.length) {
      homeRecentSessions.innerHTML = `<div class="dashboard-empty">No checkout sessions found.</div>`;
    } else {
      homeRecentSessions.innerHTML = recentSessions.map((session) => {
        return `
          <div class="dashboard-session-card">
            <h4>${getSessionDisplayTitle(session)}</h4>
            <p>${session.session_status || "—"}</p>
            <p>${formatDateTime(session.created_at)}</p>
            <p>${formatMoney(session.total_amount)}</p>
          </div>
        `;
      }).join("");
    }
  }
}

async function refreshAnalytics() {
  if (window.AXIOM_ANALYTICS && typeof window.AXIOM_ANALYTICS.load === "function") {
    await window.AXIOM_ANALYTICS.load();
  }
}

async function refreshDashboard() {
  const list = document.getElementById("sessionsList");
  if (list) {
    list.innerHTML = `<div class="dashboard-loading">Loading sessions...</div>`;
  }

  allSessions = await fetchCheckoutSessions();

  if (!selectedSessionId && allSessions.length) {
    selectedSessionId = allSessions[0].id;
  }

  if (selectedSessionId && !allSessions.some((entry) => entry.id === selectedSessionId)) {
    selectedSessionId = allSessions.length ? allSessions[0].id : null;
  }

  renderSessionsList();
  renderSelectedSession();
}

async function refreshAllDashboardData() {
  await Promise.all([
    refreshHomeDashboard(),
    refreshDashboard(),
    refreshOrders()
  ]);
}

function subscribeDashboardRealtime() {
  if (!window.axiomSupabase) {
    console.error("Supabase client missing for realtime subscription.");
    return;
  }

  if (dashboardRealtimeChannel) {
    try {
      window.axiomSupabase.removeChannel(dashboardRealtimeChannel);
    } catch (error) {
      console.error("Failed to remove previous realtime channel:", error);
    }
  }

  dashboardRealtimeChannel = window.axiomSupabase
    .channel("dashboard-live")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "checkout_sessions" },
      async function () {
        await refreshAllDashboardData();
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders" },
      async function () {
        await refreshAllDashboardData();
      }
    )
    .subscribe((status) => {
      console.log("Dashboard realtime status:", status);
    });
}

document.addEventListener("DOMContentLoaded", async function () {
  const views = {
    home: document.getElementById("dashboardHomeView"),
    sessions: document.getElementById("dashboardSessionsView"),
    analytics: document.getElementById("dashboardAnalyticsView"),
    orders: document.getElementById("dashboardOrdersView")
  };

  const buttons = {
    home: document.getElementById("showHomeViewBtn"),
    sessions: document.getElementById("showSessionsViewBtn"),
    analytics: document.getElementById("showAnalyticsViewBtn"),
    orders: document.getElementById("showOrdersViewBtn")
  };

  const sessionsSidebar = document.getElementById("dashboardSessionsSidebar");
  const analyticsSidebar = document.getElementById("dashboardAnalyticsSidebar");

  function setActiveButton(activeKey) {
    Object.entries(buttons).forEach(([key, btn]) => {
      if (!btn) return;
      btn.classList.toggle("active", key === activeKey);
    });
  }

  async function showView(viewKey) {
    Object.values(views).forEach((view) => {
      if (view) view.hidden = true;
    });

    if (views[viewKey]) {
      views[viewKey].hidden = false;
    }

    if (sessionsSidebar) {
      sessionsSidebar.hidden = viewKey !== "sessions";
    }

    if (analyticsSidebar) {
      analyticsSidebar.hidden = viewKey !== "analytics";
    }

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
  }

  try {
    await loadPartials();
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
      await showView("orders");
    });

    document.getElementById("quickOpenSessionsBtn")?.addEventListener("click", async function () {
      await showView("sessions");
    });

    document.getElementById("quickOpenAnalyticsBtn")?.addEventListener("click", async function () {
      await showView("analytics");
    });

    document.getElementById("quickOpenOrdersBtn")?.addEventListener("click", async function () {
      await showView("orders");
    });

    subscribeDashboardRealtime();
    await showView("home");
  } catch (error) {
    console.error("Dashboard failed to initialize:", error);
    alert("Dashboard failed to initialize: " + (error.message || "Unknown error"));
  }
});
