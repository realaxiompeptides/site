(function () {
  let cachedDom = null;

  function first(selectors) {
    for (let i = 0; i < selectors.length; i += 1) {
      const element = document.querySelector(selectors[i]);
      if (element) return element;
    }
    return null;
  }

  function all(selector) {
    return Array.from(document.querySelectorAll(selector));
  }

  function resolveDom() {
    const root =
      document.getElementById("affiliateManagementMount") ||
      document.getElementById("affiliatesMount") ||
      document.querySelector("[data-affiliate-admin-root]") ||
      document.querySelector(".affiliate-management-section") ||
      document.querySelector(".affiliate-admin-section") ||
      document;

    const refreshButtons = all(
      [
        "#refreshAffiliatesBtn",
        "#affiliateRefreshBtn",
        "[data-affiliate-refresh]",
        ".affiliate-refresh-btn"
      ].join(",")
    );

    const searchInput = first([
      "#affiliateSearchInput",
      "[data-affiliate-search]",
      "input[placeholder*='Search by name']",
      "input[placeholder*='Search by name, email']"
    ]);

    const statusFilter = first([
      "#affiliateStatusFilter",
      "[data-affiliate-status-filter]",
      "select"
    ]);

    const tableBody = first([
      "#affiliatesTableBody",
      "#affiliateTableBody",
      "[data-affiliate-table-body]",
      "tbody"
    ]);

    const loadingRow = first([
      "[data-affiliate-loading-row]"
    ]);

    const emptyState = first([
      "#affiliateEmptyState",
      "[data-affiliate-empty]"
    ]);

    const errorState = first([
      "#affiliateErrorState",
      "[data-affiliate-error]"
    ]);

    const totalAffiliatesValue = first([
      "#totalAffiliatesValue",
      "[data-affiliate-total]",
      "[data-summary='total-affiliates']"
    ]);

    const pendingAffiliatesValue = first([
      "#pendingAffiliatesValue",
      "[data-affiliate-pending]",
      "[data-summary='pending-affiliates']"
    ]);

    const approvedAffiliatesValue = first([
      "#approvedAffiliatesValue",
      "[data-affiliate-approved]",
      "[data-summary='approved-affiliates']"
    ]);

    const claimableValue = first([
      "#claimableValue",
      "[data-affiliate-claimable]",
      "[data-summary='claimable-amount']"
    ]);

    return {
      root: root,
      refreshButtons: refreshButtons,
      refreshBtn: refreshButtons[0] || null,
      searchInput: searchInput,
      statusFilter: statusFilter,
      tableBody: tableBody,
      loadingRow: loadingRow,
      emptyState: emptyState,
      errorState: errorState,
      totalAffiliatesValue: totalAffiliatesValue,
      pendingAffiliatesValue: pendingAffiliatesValue,
      approvedAffiliatesValue: approvedAffiliatesValue,
      claimableValue: claimableValue
    };
  }

  function get() {
    if (!cachedDom) {
      cachedDom = resolveDom();
    }
    return cachedDom;
  }

  function cache() {
    cachedDom = resolveDom();
    return cachedDom;
  }

  function refresh() {
    cachedDom = resolveDom();
    return cachedDom;
  }

  function exists() {
    const dom = get();
    return Boolean(dom.root && dom.tableBody);
  }

  function setText(element, value) {
    if (!element) return;
    element.textContent = value == null ? "" : String(value);
  }

  function setHTML(element, value) {
    if (!element) return;
    element.innerHTML = value == null ? "" : String(value);
  }

  function show(element) {
    if (!element) return;
    element.hidden = false;
    element.style.display = "";
  }

  function hide(element) {
    if (!element) return;
    element.hidden = true;
    element.style.display = "none";
  }

  function setDisabled(element, disabled) {
    if (!element) return;
    element.disabled = Boolean(disabled);
  }

  function setDisabledMany(elements, disabled) {
    (Array.isArray(elements) ? elements : []).forEach(function (element) {
      setDisabled(element, disabled);
    });
  }

  window.AXIOM_ADMIN_AFFILIATES_DOM = {
    get: get,
    cache: cache,
    refresh: refresh,
    exists: exists,
    setText: setText,
    setHTML: setHTML,
    show: show,
    hide: hide,
    setDisabled: setDisabled,
    setDisabledMany: setDisabledMany
  };
})();
