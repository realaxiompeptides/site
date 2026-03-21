const DASHBOARD_PARTIALS = [
  { mountId: "sessionOverviewMount", file: "session-overview/session-overview.html" },
  { mountId: "paymentInfoMount", file: "payment-info/payment.html" },
  { mountId: "shippingInfoMount", file: "shipping-info/shipping.html" },
  { mountId: "billingInfoMount", file: "billing-info/billing.html" },
  { mountId: "cartItemsMount", file: "cart-items/cart-items.html" },
  { mountId: "analyticsMount", file: "analytics/analytics.html" },
  { mountId: "orderDetailMount", file: "order-detail/order-detail.html" },
  { mountId: "paymentTrackingMount", file: "payment-tracking/payment-tracking.html" }
];

let allSessions = [];
let allOrders = [];
let allProducts = [];
let selectedSessionId = null;
let selectedOrderId = null;
let dashboardRealtimeChannel = null;
let hasShownCheckoutSessionsError = false;
let hasShownOrdersError = false;

window.AXIOM_DASHBOARD_STATE = window.AXIOM_DASHBOARD_STATE || {
  isOrderDetailOpen: false
};

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
  el.textContent =
    value === undefined || value === null || value === "" ? "—" : String(value);
}

function escapeHtml(value) {
  return String(value === undefined || value === null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

  return fullName || session.customer_email || session.session_id || "Checkout Session";
}

function getSessionDisplayPhone(session) {
  return session.customer_phone || "No phone";
}

function getSessionBadgeClass(status) {
  return String(status || "active")
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function getOrderDisplayTitle(order) {
  const firstName = order.customer_first_name || "";
  const lastName = order.customer_last_name || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return fullName || order.customer_email || `Order #${order.order_number || "—"}`;
}

function getOrderFulfillmentState(order) {
  const orderStatus = String(order?.order_status || "").toLowerCase();
  const fulfillmentStatus = String(order?.fulfillment_status || "").toLowerCase();

  if (orderStatus === "cancelled") {
    return "unfulfilled";
  }

  if (
    fulfillmentStatus === "fulfilled" ||
    fulfillmentStatus === "shipped" ||
    orderStatus === "fulfilled" ||
    orderStatus === "shipped"
  ) {
    return "fulfilled";
  }

  return "unfulfilled";
}

function getOrderStatusBadgeHtml(order) {
  const state = getOrderFulfillmentState(order);
  const isFulfilled = state === "fulfilled";

  return `
    <span class="order-status-badge ${isFulfilled ? "is-fulfilled" : "is-unfulfilled"}">
      ${isFulfilled ? "Fulfilled" : "Unfulfilled"}
    </span>
  `;
}

function isPendingPaymentOrder(order) {
  const paymentStatus = String(order.payment_status || "").toLowerCase();
  const orderStatus = String(order.order_status || "").toLowerCase();

  if (orderStatus === "cancelled") return false;

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

  if (orderStatus === "cancelled") return false;

  return (
    paymentStatus === "paid" ||
    fulfillmentStatus === "processing" ||
    fulfillmentStatus === "fulfilled" ||
    orderStatus === "processing"
  );
}

function isActiveCheckoutSession(session) {
  return String(session.session_status || "").toLowerCase() === "active";
}

function isPendingCheckoutSession(session) {
  const status = String(session.session_status || "").toLowerCase();
  return status === "pending_payment" || status === "converted";
}

function isAbandonedCheckoutSession(session) {
  return String(session.session_status || "").toLowerCase() === "abandoned";
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

window.AXIOM_DASHBOARD_UTILS = {
  formatMoney,
  formatDateTime,
  safeArray,
  safeObject,
  renderAddress,
  getCartItemName,
  getCartItemVariant,
  getCartItemQty,
  getCartItemUnitPrice,
  getCartItemLineTotal,
  getCartItemImage,
  normalizeImagePath,
  getOrderFulfillmentState,
  getOrderStatusBadgeHtml
};

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

    if (error) return 0;
    return Number(count || 0);
  } catch {
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

    if (error) return 0;

    return new Set(
      safeArray(data)
        .map((row) => row.visitor_id)
        .filter(Boolean)
    ).size;
  } catch {
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
  if (shippingInfoBlock) shippingInfoBlock.innerHTML = `<p>—</p>`;

  const billingInfoBlock = document.getElementById("billingInfoBlock");
  if (billingInfoBlock) billingInfoBlock.innerHTML = `<p>—</p>`;

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

      const detailTitle = document.getElementById("dashboardSessionTitle");
      if (detailTitle) {
        detailTitle.scrollIntoView({ behavior: "smooth", block: "start" });
      }
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
  if (shippingInfoBlock) shippingInfoBlock.innerHTML = renderAddress(session.shipping_address);

  const billingInfoBlock = document.getElementById("billingInfoBlock");
  if (billingInfoBlock) billingInfoBlock.innerHTML = renderAddress(session.billing_address);

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
              <img src="${image}" alt="${escapeHtml(getCartItemName(item))}" onerror="this.onerror=null;this.src='../images/products/placeholder.PNG';">
            </div>

            <div class="dashboard-item-info">
              <h4>${escapeHtml(getCartItemName(item))}</h4>
              <p>${escapeHtml(getCartItemVariant(item))}</p>
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

function openSelectedOrderDetail() {
  const selectedOrder = allOrders.find((entry) => entry.id === selectedOrderId) || null;

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
  const wrap = document.getElementById("ordersListWrap");
  if (!wrap) return;

  if (!Array.isArray(allOrders) || !allOrders.length) {
    wrap.innerHTML = `<div class="dashboard-empty">No orders found.</div>`;

    if (window.AXIOM_ORDER_DETAIL && typeof window.AXIOM_ORDER_DETAIL.clear === "function") {
      window.AXIOM_ORDER_DETAIL.clear();
    }

    if (window.AXIOM_ORDER_DETAIL && typeof window.AXIOM_ORDER_DETAIL.hide === "function") {
      window.AXIOM_ORDER_DETAIL.hide();
    }

    return;
  }

  wrap.innerHTML = allOrders.map((order) => {
    const fullName = [order.customer_first_name, order.customer_last_name]
      .filter(Boolean)
      .join(" ")
      .trim();

    return `
      <div class="dashboard-session-card" data-order-id="${order.id}">
        <h4>Order #${order.order_number || "—"}</h4>
        <p>${escapeHtml(fullName || order.customer_email || "Unknown customer")}</p>
        <p>${formatDateTime(order.created_at)}</p>
        ${getOrderStatusBadgeHtml(order)}
        <p>Status: ${escapeHtml(order.order_status || "—")} | Payment: ${escapeHtml(order.payment_status || "—")} | Fulfillment: ${escapeHtml(order.fulfillment_status || "—")}</p>
        <p>Total: ${formatMoney(order.total_amount)}</p>
      </div>
    `;
  }).join("");

  wrap.querySelectorAll("[data-order-id]").forEach((card) => {
    card.addEventListener("click", () => {
      selectedOrderId = card.getAttribute("data-order-id");
      window.AXIOM_DASHBOARD_STATE.isOrderDetailOpen = true;
      openSelectedOrderDetail();
    });
  });

  if (window.AXIOM_DASHBOARD_STATE.isOrderDetailOpen && selectedOrderId) {
    openSelectedOrderDetail();
  } else if (
    window.AXIOM_ORDER_DETAIL &&
    typeof window.AXIOM_ORDER_DETAIL.hide === "function"
  ) {
    window.AXIOM_ORDER_DETAIL.hide();
  }
}

async function refreshOrders() {
  const wrap = document.getElementById("ordersListWrap");
  if (wrap) {
    wrap.innerHTML = `<div class="dashboard-loading">Loading orders...</div>`;
  }

  allOrders = await fetchOrders();

  if (
    window.AXIOM_DASHBOARD_APP &&
    typeof window.AXIOM_DASHBOARD_APP === "object"
  ) {
    window.AXIOM_DASHBOARD_APP.orders = allOrders;
  }

  if (selectedOrderId && !allOrders.some((entry) => entry.id === selectedOrderId)) {
    selectedOrderId = null;
    window.AXIOM_DASHBOARD_STATE.isOrderDetailOpen = false;

    if (window.AXIOM_ORDER_DETAIL && typeof window.AXIOM_ORDER_DETAIL.clear === "function") {
      window.AXIOM_ORDER_DETAIL.clear();
    }

    if (window.AXIOM_ORDER_DETAIL && typeof window.AXIOM_ORDER_DETAIL.hide === "function") {
      window.AXIOM_ORDER_DETAIL.hide();
    }
  }

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

  allSessions = sessions;
  allOrders = orders;

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
            <p>${escapeHtml(getOrderDisplayTitle(order))}</p>
            ${getOrderStatusBadgeHtml(order)}
            <p>${formatDateTime(order.created_at)}</p>
            <p>${formatMoney(order.total_amount)}</p>
          </div>
        `;
      }).join("");

      homeRecentOrders.querySelectorAll("[data-home-order-id]").forEach((card) => {
        card.addEventListener("click", async () => {
          selectedOrderId = card.getAttribute("data-home-order-id");
          window.AXIOM_DASHBOARD_STATE.isOrderDetailOpen = true;

          if (window.AXIOM_DASHBOARD_APP && typeof window.AXIOM_DASHBOARD_APP.showView === "function") {
            await window.AXIOM_DASHBOARD_APP.showView("orders");
          } else {
            const ordersView = document.getElementById("dashboardOrdersView");
            if (ordersView) {
              ordersView.hidden = false;
            }
            await refreshOrders();
          }

          openSelectedOrderDetail();
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

async function refreshAnalytics() {
  if (window.AXIOM_ANALYTICS && typeof window.AXIOM_ANALYTICS.load === "function") {
    await window.AXIOM_ANALYTICS.load();
  }
}

/* =========================
   PRODUCTS MANAGEMENT
========================= */

const PRODUCT_OVERRIDES_STORAGE_KEY = "axiom_dashboard_product_overrides";

function injectProductsStyles() {
  if (document.getElementById("axiomDashboardProductsStyles")) return;

  const style = document.createElement("style");
  style.id = "axiomDashboardProductsStyles";
  style.textContent = `
    .dashboard-products-toolbar {
      display: flex;
      gap: 12px;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 18px;
      flex-wrap: wrap;
    }

    .dashboard-products-search {
      flex: 1 1 320px;
      min-width: 220px;
      height: 46px;
      border-radius: 14px;
      border: 1px solid #dbe3ee;
      padding: 0 14px;
      font: inherit;
      background: #fff;
    }

    .dashboard-products-meta {
      color: #64748b;
      font-size: 14px;
      font-weight: 700;
    }

    .dashboard-products-grid {
      display: grid;
      gap: 18px;
    }

    .dashboard-product-card {
      background: #fff;
      border: 1px solid #dbe3ee;
      border-radius: 22px;
      padding: 18px;
      box-shadow: 0 10px 24px rgba(15,23,42,0.04);
    }

    .dashboard-product-card.is-editing {
      border-color: #4b90d9;
      box-shadow: 0 0 0 4px rgba(75,144,217,0.12);
    }

    .dashboard-product-top {
      display: grid;
      grid-template-columns: 90px 1fr auto;
      gap: 16px;
      align-items: start;
    }

    .dashboard-product-image {
      width: 90px;
      height: 90px;
      border-radius: 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .dashboard-product-image img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }

    .dashboard-product-name {
      margin: 0 0 6px;
      font-size: 28px;
      line-height: 1.05;
      color: #0f172a;
      font-weight: 900;
      letter-spacing: -0.03em;
    }

    .dashboard-product-subline,
    .dashboard-product-variants,
    .dashboard-product-stockline {
      margin: 0;
      color: #64748b;
      font-size: 14px;
      line-height: 1.6;
    }

    .dashboard-product-subline strong,
    .dashboard-product-stockline strong {
      color: #0f172a;
    }

    .dashboard-product-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .dashboard-product-btn {
      border: 1px solid #dbe3ee;
      background: #fff;
      color: #0f172a;
      height: 42px;
      padding: 0 16px;
      border-radius: 999px;
      font: inherit;
      font-weight: 800;
      cursor: pointer;
    }

    .dashboard-product-btn.primary {
      background: #0f172a;
      border-color: #0f172a;
      color: #fff;
    }

    .dashboard-product-btn.secondary {
      background: #eef4fb;
    }

    .dashboard-product-editor {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      display: none;
    }

    .dashboard-product-card.is-editing .dashboard-product-editor {
      display: block;
    }

    .dashboard-product-editor-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .dashboard-product-editor-field {
      display: grid;
      gap: 6px;
    }

    .dashboard-product-editor-field.full {
      grid-column: 1 / -1;
    }

    .dashboard-product-editor-field label {
      font-size: 13px;
      color: #475569;
      font-weight: 800;
    }

    .dashboard-product-editor-field input,
    .dashboard-product-editor-field textarea {
      width: 100%;
      border: 1px solid #dbe3ee;
      background: #fff;
      border-radius: 14px;
      padding: 12px 14px;
      font: inherit;
      color: #0f172a;
    }

    .dashboard-product-editor-field textarea {
      min-height: 96px;
      resize: vertical;
    }

    .dashboard-product-editor-actions {
      display: flex;
      gap: 10px;
      margin-top: 14px;
      flex-wrap: wrap;
    }

    .dashboard-products-empty {
      background: #fff;
      border: 1px solid #dbe3ee;
      border-radius: 20px;
      padding: 24px;
      color: #64748b;
      font-weight: 700;
    }

    .dashboard-products-note {
      margin-top: 14px;
      color: #64748b;
      font-size: 13px;
      line-height: 1.6;
    }

    @media (max-width: 900px) {
      .dashboard-product-top {
        grid-template-columns: 80px 1fr;
      }

      .dashboard-product-actions {
        grid-column: 1 / -1;
        justify-content: flex-start;
      }
    }

    @media (max-width: 640px) {
      .dashboard-product-editor-grid {
        grid-template-columns: 1fr;
      }

      .dashboard-product-name {
        font-size: 22px;
      }
    }
  `;
  document.head.appendChild(style);
}

function getProductsOverrides() {
  try {
    return safeObject(JSON.parse(localStorage.getItem(PRODUCT_OVERRIDES_STORAGE_KEY) || "{}"));
  } catch {
    return {};
  }
}

function saveProductsOverrides(overrides) {
  localStorage.setItem(PRODUCT_OVERRIDES_STORAGE_KEY, JSON.stringify(safeObject(overrides)));
}

function getProductsMount() {
  return (
    document.getElementById("dashboardProductsList") ||
    document.getElementById("productsListWrap") ||
    document.getElementById("dashboardProductsGrid") ||
    document.getElementById("productsManagementGrid") ||
    document.getElementById("productsManagementMount") ||
    document.getElementById("dashboardProductsView")
  );
}

function getRawProductSource() {
  if (Array.isArray(window.AXIOM_PRODUCTS)) {
    return window.AXIOM_PRODUCTS;
  }

  if (Array.isArray(window.productData)) {
    return window.productData;
  }

  if (Array.isArray(window.PRODUCTS)) {
    return window.PRODUCTS;
  }

  return [];
}

function getProductKey(product, index) {
  if (product.slug) return `slug:${product.slug}`;
  if (product.id !== undefined && product.id !== null && String(product.id).trim() !== "") {
    return `id:${product.id}`;
  }
  return `idx:${index}`;
}

function getProductBasePrice(product) {
  if (product.price !== undefined && product.price !== null && product.price !== "") {
    return Number(product.price) || 0;
  }

  const variants = safeArray(product.variants);
  if (variants.length) {
    const firstVariantWithPrice = variants.find((variant) => variant && (variant.price !== undefined && variant.price !== null));
    if (firstVariantWithPrice) {
      return Number(firstVariantWithPrice.price) || 0;
    }
  }

  return 0;
}

function getProductCompareAtPrice(product) {
  if (product.compareAtPrice !== undefined && product.compareAtPrice !== null && product.compareAtPrice !== "") {
    return Number(product.compareAtPrice) || 0;
  }

  if (product.compare_at_price !== undefined && product.compare_at_price !== null && product.compare_at_price !== "") {
    return Number(product.compare_at_price) || 0;
  }

  return 0;
}

function getProductImage(product) {
  if (typeof product.image === "string" && product.image.trim()) {
    return normalizeImagePath(product.image);
  }

  const images = safeArray(product.images);
  const firstStringImage = images.find((img) => typeof img === "string" && img.trim());
  if (firstStringImage) {
    return normalizeImagePath(firstStringImage);
  }

  return "../images/products/placeholder.PNG";
}

function getProductVariants(product) {
  const variants = safeArray(product.variants);

  if (!variants.length) {
    return [];
  }

  return variants.map((variant, index) => {
    const safeVariant = safeObject(variant);
    return {
      id: safeVariant.id || `variant-${index + 1}`,
      label:
        safeVariant.label ||
        safeVariant.name ||
        safeVariant.variant ||
        safeVariant.title ||
        `Variant ${index + 1}`,
      price:
        safeVariant.price !== undefined && safeVariant.price !== null
          ? Number(safeVariant.price) || 0
          : null,
      stock:
        safeVariant.stock !== undefined && safeVariant.stock !== null
          ? safeVariant.stock
          : safeVariant.inStock !== undefined
            ? safeVariant.inStock
            : safeVariant.in_stock !== undefined
              ? safeVariant.in_stock
              : "—"
    };
  });
}

function getProductStockLabel(product) {
  if (product.stock !== undefined && product.stock !== null && product.stock !== "") {
    return String(product.stock);
  }

  if (product.inStock !== undefined) {
    return product.inStock ? "In stock" : "Out of stock";
  }

  if (product.in_stock !== undefined) {
    return product.in_stock ? "In stock" : "Out of stock";
  }

  return "—";
}

function mergeProductWithOverride(product, override) {
  const merged = {
    ...safeObject(product),
    ...safeObject(override)
  };

  if (safeObject(override).variants && Array.isArray(override.variants)) {
    merged.variants = override.variants;
  }

  return merged;
}

function getDashboardProducts() {
  const rawProducts = safeArray(getRawProductSource());
  const overrides = getProductsOverrides();

  return rawProducts.map((product, index) => {
    const key = getProductKey(product, index);
    return mergeProductWithOverride(product, overrides[key]);
  });
}

function buildVariantsSummaryHtml(product) {
  const variants = getProductVariants(product);
  if (!variants.length) {
    return `<p class="dashboard-product-variants"><strong>Variants:</strong> —</p>`;
  }

  return `
    <p class="dashboard-product-variants">
      <strong>Variants:</strong>
      ${variants.map((variant) => {
        const pieces = [variant.label];
        if (variant.price !== null) pieces.push(formatMoney(variant.price));
        if (variant.stock !== "—") pieces.push(`Stock: ${variant.stock}`);
        return escapeHtml(pieces.join(" • "));
      }).join("<br>")}
    </p>
  `;
}

function serializeVariantsForEditor(product) {
  const variants = safeArray(product.variants);
  if (!variants.length) return "";
  return JSON.stringify(variants, null, 2);
}

function getProductsSearchValue() {
  return (document.getElementById("dashboardProductsSearch")?.value || "").trim().toLowerCase();
}

function getFilteredProducts() {
  const search = getProductsSearchValue();

  if (!search) return allProducts;

  return allProducts.filter((product, index) => {
    const key = getProductKey(product, index);
    const haystack = [
      key,
      product.id,
      product.slug,
      product.name,
      product.title,
      product.category,
      product.type,
      product.shortDescription,
      product.description
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(search);
  });
}

function renderProductsToolbar(mount) {
  const existingToolbar = document.getElementById("dashboardProductsToolbar");
  if (existingToolbar) return;

  const toolbar = document.createElement("div");
  toolbar.id = "dashboardProductsToolbar";
  toolbar.className = "dashboard-products-toolbar";
  toolbar.innerHTML = `
    <input
      type="text"
      id="dashboardProductsSearch"
      class="dashboard-products-search"
      placeholder="Search products by name, slug, category, or id"
      autocomplete="off"
    />
    <div class="dashboard-products-meta" id="dashboardProductsMeta">0 products</div>
  `;

  mount.parentNode.insertBefore(toolbar, mount);

  document.getElementById("dashboardProductsSearch")?.addEventListener("input", renderProductsList);
}

function renderProductsList() {
  injectProductsStyles();

  const mount = getProductsMount();
  if (!mount) return;

  renderProductsToolbar(mount);

  const products = getFilteredProducts();
  const meta = document.getElementById("dashboardProductsMeta");
  if (meta) {
    meta.textContent = `${products.length} product${products.length === 1 ? "" : "s"}`;
  }

  if (!products.length) {
    mount.innerHTML = `<div class="dashboard-products-empty">No products found.</div>`;
    return;
  }

  mount.innerHTML = `
    <div class="dashboard-products-grid">
      ${products.map((product, index) => {
        const key = getProductKey(product, index);
        const name = product.name || product.title || "Untitled Product";
        const slug = product.slug || "—";
        const image = getProductImage(product);
        const price = getProductBasePrice(product);
        const compareAtPrice = getProductCompareAtPrice(product);
        const stock = getProductStockLabel(product);
        const category = product.category || product.type || "—";
        const shortDescription = product.shortDescription || product.description || "";
        const variantsSummary = buildVariantsSummaryHtml(product);

        return `
          <div class="dashboard-product-card" data-product-key="${escapeHtml(key)}">
            <div class="dashboard-product-top">
              <div class="dashboard-product-image">
                <img src="${image}" alt="${escapeHtml(name)}" onerror="this.onerror=null;this.src='../images/products/placeholder.PNG';">
              </div>

              <div class="dashboard-product-main">
                <h3 class="dashboard-product-name">${escapeHtml(name)}</h3>
                <p class="dashboard-product-subline"><strong>Slug:</strong> ${escapeHtml(slug)}</p>
                <p class="dashboard-product-subline"><strong>Category:</strong> ${escapeHtml(category)}</p>
                <p class="dashboard-product-subline"><strong>Base price:</strong> ${formatMoney(price)}${compareAtPrice > 0 ? ` • <strong>Compare at:</strong> ${formatMoney(compareAtPrice)}` : ""}</p>
                <p class="dashboard-product-stockline"><strong>Stock:</strong> ${escapeHtml(stock)}</p>
                ${variantsSummary}
              </div>

              <div class="dashboard-product-actions">
                <button type="button" class="dashboard-product-btn secondary" data-product-edit="${escapeHtml(key)}">Edit</button>
              </div>
            </div>

            <div class="dashboard-product-editor">
              <div class="dashboard-product-editor-grid">
                <div class="dashboard-product-editor-field">
                  <label>Name</label>
                  <input type="text" data-field="name" value="${escapeHtml(name)}">
                </div>

                <div class="dashboard-product-editor-field">
                  <label>Slug</label>
                  <input type="text" data-field="slug" value="${escapeHtml(slug === "—" ? "" : slug)}">
                </div>

                <div class="dashboard-product-editor-field">
                  <label>Category</label>
                  <input type="text" data-field="category" value="${escapeHtml(category === "—" ? "" : category)}">
                </div>

                <div class="dashboard-product-editor-field">
                  <label>Base Price</label>
                  <input type="number" step="0.01" data-field="price" value="${Number(price || 0)}">
                </div>

                <div class="dashboard-product-editor-field">
                  <label>Compare At Price</label>
                  <input type="number" step="0.01" data-field="compareAtPrice" value="${Number(compareAtPrice || 0)}">
                </div>

                <div class="dashboard-product-editor-field">
                  <label>Stock</label>
                  <input type="text" data-field="stock" value="${escapeHtml(stock === "—" ? "" : stock)}">
                </div>

                <div class="dashboard-product-editor-field full">
                  <label>Image Path</label>
                  <input type="text" data-field="image" value="${escapeHtml(image)}">
                </div>

                <div class="dashboard-product-editor-field full">
                  <label>Short Description</label>
                  <textarea data-field="shortDescription">${escapeHtml(shortDescription)}</textarea>
                </div>

                <div class="dashboard-product-editor-field full">
                  <label>Variants JSON</label>
                  <textarea data-field="variants">${escapeHtml(serializeVariantsForEditor(product))}</textarea>
                </div>
              </div>

              <div class="dashboard-product-editor-actions">
                <button type="button" class="dashboard-product-btn primary" data-product-save="${escapeHtml(key)}">Save</button>
                <button type="button" class="dashboard-product-btn" data-product-cancel="${escapeHtml(key)}">Cancel</button>
              </div>
            </div>
          </div>
        `;
      }).join("")}
    </div>

    <div class="dashboard-products-note">
      Dashboard product edits are saved in this browser only unless you wire them to Supabase or another backend source of truth.
    </div>
  `;

  mount.querySelectorAll("[data-product-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.getAttribute("data-product-edit");
      const card = mount.querySelector(`[data-product-key="${CSS.escape(key)}"]`);
      if (!card) return;
      card.classList.add("is-editing");
    });
  });

  mount.querySelectorAll("[data-product-cancel]").forEach((button) => {
    button.addEventListener("click", () => {
      renderProductsList();
    });
  });

  mount.querySelectorAll("[data-product-save]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.getAttribute("data-product-save");
      const card = mount.querySelector(`[data-product-key="${CSS.escape(key)}"]`);
      if (!card) return;

      const overrides = getProductsOverrides();
      const fields = Array.from(card.querySelectorAll("[data-field]"));

      const draft = {};
      fields.forEach((field) => {
        const name = field.getAttribute("data-field");
        if (!name) return;
        draft[name] = field.value;
      });

      let parsedVariants = [];
      if (draft.variants && String(draft.variants).trim()) {
        try {
          const parsed = JSON.parse(draft.variants);
          parsedVariants = Array.isArray(parsed) ? parsed : [];
        } catch (error) {
          alert("Variants JSON is invalid. Please fix it before saving.");
          return;
        }
      }

      overrides[key] = {
        name: draft.name || "",
        title: draft.name || "",
        slug: draft.slug || "",
        category: draft.category || "",
        type: draft.category || "",
        price: Number(draft.price || 0),
        compareAtPrice: Number(draft.compareAtPrice || 0),
        compare_at_price: Number(draft.compareAtPrice || 0),
        stock: draft.stock || "",
        shortDescription: draft.shortDescription || "",
        description: draft.shortDescription || "",
        image: draft.image || "",
        variants: parsedVariants
      };

      saveProductsOverrides(overrides);
      allProducts = getDashboardProducts();
      renderProductsList();
    });
  });
}

async function refreshProducts() {
  injectProductsStyles();

  const mount = getProductsMount();
  if (mount) {
    mount.innerHTML = `<div class="dashboard-loading">Loading products...</div>`;
  }

  allProducts = getDashboardProducts();

  renderProductsList();
}

/* =========================
   END PRODUCTS MANAGEMENT
========================= */

async function refreshDashboard() {
  const list = document.getElementById("sessionsList");
  if (list) {
    list.innerHTML = `<div class="dashboard-loading">Loading sessions...</div>`;
  }

  allSessions = await fetchCheckoutSessions();

  if (
    window.AXIOM_DASHBOARD_APP &&
    typeof window.AXIOM_DASHBOARD_APP === "object"
  ) {
    window.AXIOM_DASHBOARD_APP.checkoutSessionsForTracking = allSessions;
  }

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
    refreshOrders(),
    refreshProducts()
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
    orders: document.getElementById("dashboardOrdersView"),
    products: document.getElementById("dashboardProductsView")
  };

  const buttons = {
    home: document.getElementById("showHomeViewBtn"),
    sessions: document.getElementById("showSessionsViewBtn"),
    analytics: document.getElementById("showAnalyticsViewBtn"),
    orders: document.getElementById("showOrdersViewBtn"),
    products: document.getElementById("showProductsViewBtn")
  };

  const sessionsSidebar = document.getElementById("dashboardSessionsSidebar");
  const analyticsSidebar = document.getElementById("dashboardAnalyticsSidebar");
  const ordersSidebar = document.getElementById("dashboardOrdersSidebar");
  const productsSidebar = document.getElementById("dashboardProductsSidebar");

  function setActiveButton(activeKey) {
    Object.entries(buttons).forEach(([key, btn]) => {
      if (!btn) return;
      btn.classList.toggle("active", key === activeKey);
    });
  }

  function showOrdersListOnly() {
    window.AXIOM_DASHBOARD_STATE.isOrderDetailOpen = false;

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

    if (sessionsSidebar) {
      sessionsSidebar.hidden = viewKey !== "sessions";
    }

    if (analyticsSidebar) {
      analyticsSidebar.hidden = viewKey !== "analytics";
    }

    if (ordersSidebar) {
      ordersSidebar.hidden = viewKey !== "orders";
    }

    if (productsSidebar) {
      productsSidebar.hidden = viewKey !== "products";
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

    if (viewKey === "products") {
      await refreshProducts();
    }
  }

  window.AXIOM_DASHBOARD_APP = {
    showView,
    showOrdersListOnly,
    refreshHomeDashboard,
    refreshDashboard,
    refreshOrders,
    refreshProducts,
    refreshAllDashboardData,
    renderOrdersList,
    renderRecentOrders: refreshHomeDashboard,
    orders: allOrders,
    checkoutSessionsForTracking: allSessions,
    products: allProducts
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
    await refreshProducts();

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
      window.AXIOM_DASHBOARD_STATE.isOrderDetailOpen = false;
      await showView("orders");
    });

    buttons.products?.addEventListener("click", async function () {
      await showView("products");
    });

    document.getElementById("quickOpenSessionsBtn")?.addEventListener("click", async function () {
      await showView("sessions");
    });

    document.getElementById("quickOpenAnalyticsBtn")?.addEventListener("click", async function () {
      await showView("analytics");
    });

    document.getElementById("quickOpenOrdersBtn")?.addEventListener("click", async function () {
      window.AXIOM_DASHBOARD_STATE.isOrderDetailOpen = false;
      await showView("orders");
    });

    document.getElementById("quickOpenProductsBtn")?.addEventListener("click", async function () {
      await showView("products");
    });

    subscribeDashboardRealtime();
    await showView("home");
  } catch (error) {
    console.error("Dashboard failed to initialize:", error);
    alert("Dashboard failed to initialize: " + (error.message || "Unknown error"));
  }
});
