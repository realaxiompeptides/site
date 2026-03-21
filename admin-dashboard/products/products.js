window.AXIOM_PRODUCTS = (function () {
  const viewIds = {
    home: "dashboardHomeView",
    sessions: "dashboardSessionsView",
    analytics: "dashboardAnalyticsView",
    orders: "dashboardOrdersView",
    products: "dashboardProductsView"
  };

  const sidebarIds = {
    sessions: "dashboardSessionsSidebar",
    analytics: "dashboardAnalyticsSidebar",
    orders: "dashboardOrdersSidebar",
    products: "dashboardProductsSidebar"
  };

  function $(id) {
    return document.getElementById(id);
  }

  function setActiveNav(buttonId) {
    document.querySelectorAll(".dashboard-nav-link").forEach(function (button) {
      button.classList.remove("active");
    });

    const activeButton = $(buttonId);
    if (activeButton) activeButton.classList.add("active");
  }

  function hideAllViews() {
    Object.keys(viewIds).forEach(function (key) {
      const el = $(viewIds[key]);
      if (el) el.hidden = true;
    });

    Object.keys(sidebarIds).forEach(function (key) {
      const el = $(sidebarIds[key]);
      if (el) el.hidden = true;
    });
  }

  function showProductsView() {
    hideAllViews();

    const productsView = $(viewIds.products);
    const productsSidebar = $(sidebarIds.products);

    if (productsView) productsView.hidden = false;
    if (productsSidebar) productsSidebar.hidden = false;

    setActiveNav("showProductsViewBtn");
  }

  async function init() {
    const products = await window.AXIOM_PRODUCTS_API.listProducts();

    window.AXIOM_PRODUCTS_UI.setProducts(products);
    window.AXIOM_PRODUCTS_UI.renderProductsList();
    window.AXIOM_PRODUCTS_UI.renderProductDetail();
  }

  function bindViewButton() {
    const showProductsViewBtn = $("showProductsViewBtn");
    if (!showProductsViewBtn || showProductsViewBtn.dataset.bound === "true") return;

    showProductsViewBtn.dataset.bound = "true";
    showProductsViewBtn.addEventListener("click", async function () {
      showProductsView();
      await init();
    });
  }

  function mountUi() {
    window.AXIOM_PRODUCTS_UI.mount({
      listWrap: $("productsListWrap"),
      detailMount: $("productDetailMount"),
      refreshSidebarBtn: $("refreshProductsBtn"),
      refreshTopBtn: $("refreshProductsBtnTop"),
      createBtn: $("createProductBtn")
    });
  }

  function injectCreateButton() {
    const header = document.querySelector("#dashboardProductsView .dashboard-main-header");
    if (!header) return;

    if ($("createProductBtn")) return;

    const rightButton = $("refreshProductsBtnTop");
    if (!rightButton || !rightButton.parentElement) return;

    const createBtn = document.createElement("button");
    createBtn.type = "button";
    createBtn.className = "dashboard-btn";
    createBtn.id = "createProductBtn";
    createBtn.textContent = "New Product";

    rightButton.parentElement.insertBefore(createBtn, rightButton);
  }

  function bootstrap() {
    if (!window.AXIOM_PRODUCTS_API || !window.AXIOM_PRODUCTS_UI) return;

    injectCreateButton();
    mountUi();
    bindViewButton();
  }

  document.addEventListener("DOMContentLoaded", bootstrap);

  return {
    init,
    showProductsView
  };
})();
