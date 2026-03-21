(function () {
  function getState() {
    return window.AXIOM_DASHBOARD_STATE;
  }

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

  window.AXIOM_DASHBOARD_UTILS = {
    getState,
    formatMoney,
    formatDateTime,
    safeArray,
    safeObject,
    setText,
    normalizeImagePath,
    getAddressField,
    renderAddress,
    getCartItemName,
    getCartItemVariant,
    getCartItemQty,
    getCartItemUnitPrice,
    getCartItemLineTotal,
    getCartItemImage,
    getShippingMethodName,
    getShippingMethodCode,
    getSessionDisplayTitle,
    getSessionDisplayPhone,
    getSessionBadgeClass,
    getOrderDisplayTitle,
    getOrderFulfillmentState,
    getOrderStatusBadgeHtml,
    isPendingPaymentOrder,
    isPaidOrProcessingOrder,
    isActiveCheckoutSession,
    isPendingCheckoutSession,
    isAbandonedCheckoutSession
  };
})();
