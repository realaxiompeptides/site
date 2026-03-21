(function () {
  async function refreshProducts() {
    if (
      window.AXIOM_PRODUCTS &&
      typeof window.AXIOM_PRODUCTS.init === "function"
    ) {
      await window.AXIOM_PRODUCTS.init();
    }
  }

  window.AXIOM_DASHBOARD_PRODUCTS = {
    refreshProducts
  };
})();
