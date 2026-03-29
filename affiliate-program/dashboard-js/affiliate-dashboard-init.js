(function () {
  window.AXIOM_AFFILIATE_DASHBOARD_INIT = {
    async boot() {
      if (
        window.AXIOM_AFFILIATE_DASHBOARD &&
        typeof window.AXIOM_AFFILIATE_DASHBOARD.init === "function"
      ) {
        return window.AXIOM_AFFILIATE_DASHBOARD.init();
      }

      throw new Error("AXIOM_AFFILIATE_DASHBOARD.init is missing.");
    }
  };
})();
