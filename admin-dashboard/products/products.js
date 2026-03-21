window.AXIOM_PRODUCTS = window.AXIOM_PRODUCTS || {};

(function () {
  let products = [];
  let selectedProductId = null;

  function ensureApi() {
    if (
      !window.AXIOM_PRODUCTS_API ||
      typeof window.AXIOM_PRODUCTS_API.listProducts !== "function"
    ) {
      throw new Error("AXIOM_PRODUCTS_API.listProducts is missing.");
    }
  }

  function ensureUi() {
    if (
      !window.AXIOM_PRODUCTS_UI ||
      typeof window.AXIOM_PRODUCTS_UI.renderProductsList !== "function" ||
      typeof window.AXIOM_PRODUCTS_UI.renderProductDetail !== "function"
    ) {
      throw new Error("AXIOM_PRODUCTS_UI is missing required functions.");
    }
  }

  function getSelectedProduct() {
    return products.find(function (product) {
      return product.id === selectedProductId;
    }) || null;
  }

  async function loadProducts() {
    ensureApi();
    ensureUi();

    const wrap = document.getElementById("productsListWrap");
    const detailMount = document.getElementById("productDetailMount");

    if (wrap) {
      wrap.innerHTML = `<div class="dashboard-loading">Loading products...</div>`;
    }

    if (detailMount && !selectedProductId) {
      detailMount.innerHTML = `<div class="dashboard-card dashboard-span-2"><div class="dashboard-empty">Loading product details...</div></div>`;
    }

    products = await window.AXIOM_PRODUCTS_API.listProducts();

    if (!selectedProductId && products.length) {
      selectedProductId = products[0].id;
    }

    if (selectedProductId && !products.some(function (product) { return product.id === selectedProductId; })) {
      selectedProductId = products.length ? products[0].id : null;
    }

    render();
  }

  function render() {
    ensureUi();

    window.AXIOM_PRODUCTS_UI.renderProductsList(products, selectedProductId);
    window.AXIOM_PRODUCTS_UI.renderProductDetail(getSelectedProduct());

    bindListEvents();
    bindDetailEvents();
  }

  function bindListEvents() {
    const wrap = document.getElementById("productsListWrap");
    if (!wrap) return;

    wrap.querySelectorAll("[data-product-id]").forEach(function (card) {
      card.addEventListener("click", function () {
        selectedProductId = card.getAttribute("data-product-id");
        render();
      });
    });
  }

  function bindDetailEvents() {
    const product = getSelectedProduct();
    if (!product) return;

    const saveProductBtn = document.getElementById("saveProductBtn");
    const addVariantBtn = document.getElementById("addVariantBtn");
    const deleteProductBtn = document.getElementById("deleteProductBtn");

    if (saveProductBtn) {
      saveProductBtn.addEventListener("click", async function () {
        try {
          await window.AXIOM_PRODUCTS_API.updateProduct(product.id, {
            name: document.getElementById("productEditName")?.value || "",
            slug: document.getElementById("productEditSlug")?.value || "",
            badge: document.getElementById("productEditBadge")?.value || "",
            category: document.getElementById("productEditCategory")?.value || "",
            main_image: document.getElementById("productEditMainImage")?.value || "",
            description: document.getElementById("productEditDescription")?.value || "",
            long_description: document.getElementById("productEditLongDescription")?.value || ""
          });

          await loadProducts();
          alert("Product updated.");
        } catch (error) {
          console.error(error);
          alert(error.message || "Failed to update product.");
        }
      });
    }

    if (addVariantBtn) {
      addVariantBtn.addEventListener("click", async function () {
        try {
          await window.AXIOM_PRODUCTS_API.createVariant(product.id, {
            label: "New Variant",
            price: 0,
            compare_at_price: 0,
            weight_oz: 0,
            stock_quantity: 0,
            allow_backorder: false,
            is_active: true,
            sort_order: product.variants ? product.variants.length : 0
          });

          await loadProducts();
          alert("Variant created.");
        } catch (error) {
          console.error(error);
          alert(error.message || "Failed to create variant.");
        }
      });
    }

    if (deleteProductBtn) {
      deleteProductBtn.addEventListener("click", async function () {
        const confirmed = window.confirm("Delete this product and all its variants?");
        if (!confirmed) return;

        try {
          await window.AXIOM_PRODUCTS_API.deleteProduct(product.id);
          selectedProductId = null;
          await loadProducts();
          alert("Product deleted.");
        } catch (error) {
          console.error(error);
          alert(error.message || "Failed to delete product.");
        }
      });
    }

    document.querySelectorAll("[data-variant-id]").forEach(function (variantCard) {
      const variantId = variantCard.getAttribute("data-variant-id");
      const saveVariantBtn = variantCard.querySelector(".save-variant-btn");
      const deleteVariantBtn = variantCard.querySelector(".delete-variant-btn");

      if (saveVariantBtn) {
        saveVariantBtn.addEventListener("click", async function () {
          try {
            await window.AXIOM_PRODUCTS_API.updateVariant(variantId, {
              label: variantCard.querySelector(".variant-label")?.value || "",
              price: Number(variantCard.querySelector(".variant-price")?.value || 0),
              compare_at_price: Number(variantCard.querySelector(".variant-compare-at-price")?.value || 0),
              weight_oz: Number(variantCard.querySelector(".variant-weight-oz")?.value || 0),
              stock_quantity: Number(variantCard.querySelector(".variant-stock-quantity")?.value || 0)
            });

            await loadProducts();
            alert("Variant updated.");
          } catch (error) {
            console.error(error);
            alert(error.message || "Failed to update variant.");
          }
        });
      }

      if (deleteVariantBtn) {
        deleteVariantBtn.addEventListener("click", async function () {
          const confirmed = window.confirm("Delete this variant?");
          if (!confirmed) return;

          try {
            await window.AXIOM_PRODUCTS_API.deleteVariant(variantId);
            await loadProducts();
            alert("Variant deleted.");
          } catch (error) {
            console.error(error);
            alert(error.message || "Failed to delete variant.");
          }
        });
      }
    });
  }

  async function init() {
    try {
      await loadProducts();
    } catch (error) {
      console.error(error);

      const wrap = document.getElementById("productsListWrap");
      const detailMount = document.getElementById("productDetailMount");

      if (wrap) {
        wrap.innerHTML = `<div class="dashboard-empty">Failed to load products: ${error.message || "Unknown error"}</div>`;
      }

      if (detailMount) {
        detailMount.innerHTML = `<div class="dashboard-card dashboard-span-2"><div class="dashboard-empty">Product editor unavailable until products load.</div></div>`;
      }
    }
  }

  async function createProduct(productData) {
    try {
      const safeProductData = productData && typeof productData === "object" ? productData : {
        slug: "",
        name: "New Product",
        badge: "SALE",
        category: "",
        description: "",
        long_description: "",
        main_image: "",
        gallery_images: [],
        is_active: true,
        sort_order: 0
      };

      const created = await window.AXIOM_PRODUCTS_API.createProduct(safeProductData);
      selectedProductId = created.id;
      await loadProducts();
      return created;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  window.AXIOM_PRODUCTS.init = init;
  window.AXIOM_PRODUCTS.loadProducts = loadProducts;
  window.AXIOM_PRODUCTS.createProduct = createProduct;
})();
