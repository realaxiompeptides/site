window.AXIOM_PRODUCTS = (function () {
  let products = [];
  let initialized = false;

  function getListWrap() {
    return document.getElementById("productsListWrap");
  }

  function getDetailMount() {
    return document.getElementById("productDetailMount");
  }

  function getRefreshSidebarBtn() {
    return document.getElementById("refreshProductsBtn");
  }

  function getRefreshTopBtn() {
    return document.getElementById("refreshProductsBtnTop");
  }

  function getCreateBtn() {
    return document.getElementById("createProductBtn");
  }

  function ensureUiMounted() {
    if (
      !window.AXIOM_PRODUCTS_UI ||
      typeof window.AXIOM_PRODUCTS_UI.mount !== "function"
    ) {
      throw new Error("AXIOM_PRODUCTS_UI.mount is missing.");
    }

    window.AXIOM_PRODUCTS_UI.mount({
      listWrap: getListWrap(),
      detailMount: getDetailMount(),
      refreshSidebarBtn: getRefreshSidebarBtn(),
      refreshTopBtn: getRefreshTopBtn(),
      createBtn: getCreateBtn()
    });
  }

  async function loadProducts() {
    if (
      !window.AXIOM_PRODUCTS_API ||
      typeof window.AXIOM_PRODUCTS_API.listProducts !== "function"
    ) {
      throw new Error("AXIOM_PRODUCTS_API.listProducts is missing.");
    }

    return await window.AXIOM_PRODUCTS_API.listProducts();
  }

  async function init() {
    const listWrap = getListWrap();
    const detailMount = getDetailMount();

    try {
      ensureUiMounted();

      if (listWrap) {
        listWrap.innerHTML = `<div class="dashboard-loading">Loading products...</div>`;
      }

      if (detailMount) {
        detailMount.innerHTML = `
          <div class="dashboard-card dashboard-span-2">
            <div class="dashboard-loading">Loading product details...</div>
          </div>
        `;
      }

      products = await loadProducts();

      if (
        window.AXIOM_PRODUCTS_UI &&
        typeof window.AXIOM_PRODUCTS_UI.setProducts === "function"
      ) {
        window.AXIOM_PRODUCTS_UI.setProducts(products);
      }

      if (
        window.AXIOM_PRODUCTS_UI &&
        typeof window.AXIOM_PRODUCTS_UI.renderProductsList === "function"
      ) {
        window.AXIOM_PRODUCTS_UI.renderProductsList();
      }

      if (
        window.AXIOM_PRODUCTS_UI &&
        typeof window.AXIOM_PRODUCTS_UI.renderProductDetail === "function"
      ) {
        window.AXIOM_PRODUCTS_UI.renderProductDetail();
      }

      initialized = true;
    } catch (error) {
      console.error("Failed to load products:", error);

      if (listWrap) {
        listWrap.innerHTML = `
          <div class="dashboard-empty">
            Failed to load products: ${error.message || "Unknown error"}
          </div>
        `;
      }

      if (detailMount) {
        detailMount.innerHTML = `
          <div class="dashboard-card dashboard-span-2">
            <div class="dashboard-empty">
              Product editor unavailable until products load.
            </div>
          </div>
        `;
      }
    }
  }

  async function refresh() {
    await init();
  }

  function getProducts() {
    return Array.isArray(products) ? products : [];
  }

  function isReady() {
    return initialized;
  }

  return {
    init,
    refresh,
    getProducts,
    isReady
  };
})();
