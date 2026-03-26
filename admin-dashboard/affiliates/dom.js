(function () {
  let cachedDom = null;

  function getById(id) {
    return document.getElementById(id);
  }

  function getAllByIds(ids) {
    return ids
      .map(function (id) {
        return getById(id);
      })
      .filter(Boolean);
  }

  function getFirst(selectors) {
    for (let i = 0; i < selectors.length; i += 1) {
      const element = document.querySelector(selectors[i]);
      if (element) return element;
    }
    return null;
  }

  function resolveDom() {
    const refreshButtons = getAllByIds([
      "refreshAffiliatesBtn",
      "refreshAffiliatesBtnTop",
      "refreshAffiliatesSidebarBtn"
    ]);

    const tableBody =
      getById("affiliatesAdminTableBody") ||
      getById("affiliateTableBody") ||
      getById("affiliatesTableBody") ||
      getFirst([
        "[data-affiliate-table-body]",
        "table[data-affiliate-table] tbody"
      ]);

    const payoutRequestsTableBody =
      getById("affiliatePayoutRequestsTableBody") ||
      getById("affiliatePayoutRequestsBody") ||
      getById("payoutRequestsTableBody") ||
      getById("payoutRequestsBody") ||
      getFirst([
        "[data-affiliate-payout-requests-body]",
        "[data-payout-requests-body]",
        "table[data-affiliate-payout-requests] tbody"
      ]);

    const searchInput =
      getById("affiliateSearchInput") ||
      getFirst([
        "[data-affiliate-search]",
        "input[placeholder*='Search by name']",
        "input[placeholder*='Search by name, email']"
      ]);

    const statusFilter =
      getById("affiliateStatusFilter") ||
      getFirst([
        "[data-affiliate-status-filter]",
        "select"
      ]);

    const modal =
      getById("affiliateDetailModal") ||
      getFirst(["[data-affiliate-detail-modal]"]);

    const closeModalBtn =
      getById("closeAffiliateDetailModal") ||
      getFirst(["[data-affiliate-modal-close]"]);

    const recordPayoutForm =
      getById("affiliateRecordPayoutForm") ||
      getFirst(["form[data-affiliate-record-payout]"]);

    return {
      refreshButtons: refreshButtons,
      refreshBtn: getById("refreshAffiliatesBtn"),
      refreshTopBtn: getById("refreshAffiliatesBtnTop"),
      refreshSidebarBtn: getById("refreshAffiliatesSidebarBtn"),

      tableBody: tableBody,
      payoutRequestsTableBody: payoutRequestsTableBody,
      payoutRequestsBody: payoutRequestsTableBody,

      searchInput: searchInput,
      statusFilter: statusFilter,

      statTotal: getById("affiliateStatTotal"),
      statPending: getById("affiliateStatPending"),
      statApproved: getById("affiliateStatApproved"),
      statClaimable: getById("affiliateStatClaimable"),

      modal: modal,
      closeModalBtn: closeModalBtn,
      recordPayoutForm: recordPayoutForm
    };
  }

  function cache() {
    cachedDom = resolveDom();
    return cachedDom;
  }

  function get() {
    return cachedDom || cache();
  }

  function refresh() {
    cachedDom = resolveDom();
    return cachedDom;
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
    cache: cache,
    get: get,
    refresh: refresh,
    setText: setText,
    setHTML: setHTML,
    show: show,
    hide: hide,
    setDisabled: setDisabled,
    setDisabledMany: setDisabledMany
  };
})();
