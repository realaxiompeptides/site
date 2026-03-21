(function () {
  async function refreshAnalytics() {
    if (window.AXIOM_ANALYTICS && typeof window.AXIOM_ANALYTICS.load === "function") {
      await window.AXIOM_ANALYTICS.load();
    }
  }

  window.AXIOM_DASHBOARD_ANALYTICS = {
    refreshAnalytics
  };
})();
