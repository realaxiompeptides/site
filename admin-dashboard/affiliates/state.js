(function () {
  const defaultState = {
    affiliates: [],
    filteredAffiliates: [],
    summary: {
      total: 0,
      pending: 0,
      approved: 0,
      claimable: 0
    },
    filters: {
      search: "",
      status: "all"
    },
    loading: false,
    initialized: false,
    lastError: null,
    selectedAffiliateId: null
  };

  window.AXIOM_ADMIN_AFFILIATES_STATE = window.AXIOM_ADMIN_AFFILIATES_STATE || {};

  const state = window.AXIOM_ADMIN_AFFILIATES_STATE;

  Object.keys(defaultState).forEach(function (key) {
    if (typeof state[key] === "undefined") {
      state[key] = defaultState[key];
    }
  });

  state.reset = function resetAffiliateState() {
    state.affiliates = [];
    state.filteredAffiliates = [];
    state.summary = {
      total: 0,
      pending: 0,
      approved: 0,
      claimable: 0
    };
    state.filters = {
      search: "",
      status: "all"
    };
    state.loading = false;
    state.initialized = false;
    state.lastError = null;
    state.selectedAffiliateId = null;
  };

  state.setLoading = function setLoading(value) {
    state.loading = Boolean(value);
  };

  state.setError = function setError(error) {
    state.lastError = error || null;
  };

  state.setAffiliates = function setAffiliates(affiliates) {
    state.affiliates = Array.isArray(affiliates) ? affiliates.slice() : [];
  };

  state.setFilteredAffiliates = function setFilteredAffiliates(affiliates) {
    state.filteredAffiliates = Array.isArray(affiliates) ? affiliates.slice() : [];
  };

  state.setSummary = function setSummary(summary) {
    const nextSummary = summary || {};

    state.summary = {
      total: Number(nextSummary.total || 0),
      pending: Number(nextSummary.pending || 0),
      approved: Number(nextSummary.approved || 0),
      claimable: Number(nextSummary.claimable || 0)
    };
  };

  state.setSearch = function setSearch(value) {
    state.filters.search = typeof value === "string" ? value : "";
  };

  state.setStatus = function setStatus(value) {
    state.filters.status = typeof value === "string" && value.trim() ? value : "all";
  };
})();
