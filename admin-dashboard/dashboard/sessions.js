(function () {
  const {
    formatMoney,
    formatDateTime,
    safeArray,
    safeObject,
    setText,
    renderAddress,
    getCartItemName,
    getCartItemVariant,
    getCartItemQty,
    getCartItemLineTotal,
    getCartItemImage,
    getShippingMethodName,
    getShippingMethodCode,
    getSessionDisplayTitle,
    getSessionDisplayPhone,
    getSessionBadgeClass
  } = window.AXIOM_DASHBOARD_UTILS;

  const { fetchCheckoutSessions } = window.AXIOM_DASHBOARD_DATA;

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

  function getFilteredSessions() {
    const state = window.AXIOM_DASHBOARD_STATE;

    const searchValue = (document.getElementById("sessionSearch")?.value || "").trim().toLowerCase();
    const statusValue = (document.getElementById("statusFilter")?.value || "").trim().toLowerCase();

    return state.allSessions.filter((session) => {
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

  function renderSessionsList() {
    const state = window.AXIOM_DASHBOARD_STATE;
    const list = document.getElementById("sessionsList");
    if (!list) return;

    const sessions = getFilteredSessions();

    if (!sessions.length) {
      list.innerHTML = `<div class="dashboard-empty">No checkout sessions found.</div>`;
      return;
    }

    list.innerHTML = sessions.map((session) => {
      const isActive = session.id === state.selectedSessionId;
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
        state.selectedSessionId = card.getAttribute("data-session-id");
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
    const state = window.AXIOM_DASHBOARD_STATE;
    const session = state.allSessions.find((entry) => entry.id === state.selectedSessionId);

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

  async function refreshDashboard() {
    const state = window.AXIOM_DASHBOARD_STATE;
    const list = document.getElementById("sessionsList");
    if (list) {
      list.innerHTML = `<div class="dashboard-loading">Loading sessions...</div>`;
    }

    state.allSessions = await fetchCheckoutSessions();

    if (
      window.AXIOM_DASHBOARD_APP &&
      typeof window.AXIOM_DASHBOARD_APP === "object"
    ) {
      window.AXIOM_DASHBOARD_APP.checkoutSessionsForTracking = state.allSessions;
    }

    if (!state.selectedSessionId && state.allSessions.length) {
      state.selectedSessionId = state.allSessions[0].id;
    }

    if (state.selectedSessionId && !state.allSessions.some((entry) => entry.id === state.selectedSessionId)) {
      state.selectedSessionId = state.allSessions.length ? state.allSessions[0].id : null;
    }

    renderSessionsList();
    renderSelectedSession();
  }

  window.AXIOM_DASHBOARD_SESSIONS = {
    clearSelectedSessionDisplay,
    getFilteredSessions,
    renderSessionsList,
    renderSelectedSession,
    refreshDashboard
  };
})();
