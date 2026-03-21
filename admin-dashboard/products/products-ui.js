window.AXIOM_PRODUCTS_UI = (function () {
  let state = {
    products: [],
    selectedProductId: null
  };

  const els = {
    listWrap: null,
    detailMount: null,
    refreshSidebarBtn: null,
    refreshTopBtn: null,
    createBtn: null
  };

  let rootButtonsBound = false;

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatMoney(value) {
    return `$${Number(value || 0).toFixed(2)}`;
  }

  function normalizeGalleryImages(value) {
    if (Array.isArray(value)) {
      return value.filter(Boolean).map(String);
    }

    if (typeof value === "string") {
      return value
        .split("\n")
        .map(function (line) { return line.trim(); })
        .filter(Boolean);
    }

    return [];
  }

  function getMainImage(product) {
    if (product && product.main_image) return product.main_image;

    if (
      product &&
      Array.isArray(product.gallery_images) &&
      product.gallery_images.length
    ) {
      return product.gallery_images[0];
    }

    return "";
  }

  function getSelectedProduct() {
    return state.products.find(function (product) {
      return product.id === state.selectedProductId;
    }) || null;
  }

  function setProducts(products) {
    state.products = Array.isArray(products) ? products : [];

    if (!state.selectedProductId && state.products.length) {
      state.selectedProductId = state.products[0].id;
    }

    if (
      state.selectedProductId &&
      !state.products.some(function (product) {
        return product.id === state.selectedProductId;
      })
    ) {
      state.selectedProductId = state.products[0] ? state.products[0].id : null;
    }
  }

  function renderProductsList() {
    if (!els.listWrap) return;

    if (!state.products.length) {
      els.listWrap.innerHTML = `<div class="dashboard-loading">No products found.</div>`;
      return;
    }

    els.listWrap.innerHTML = state.products.map(function (product) {
      const variants = Array.isArray(product.product_variants) ? product.product_variants : [];
      const image = getMainImage(product);
      const activeClass = product.id === state.selectedProductId ? " active" : "";
      const minPrice = variants.length
        ? Math.min.apply(null, variants.map(function (variant) { return Number(variant.price || 0); }))
        : 0;

      return `
        <button
          type="button"
          class="dashboard-item-card${activeClass}"
          data-product-id="${escapeHtml(product.id)}"
          style="width:100%; text-align:left;"
        >
          <div style="display:flex; gap:14px; align-items:center;">
            <div style="width:70px; height:70px; border-radius:14px; border:1px solid #dbe4ef; background:#f8fbff; overflow:hidden; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              ${image ? `<img src="../${escapeHtml(image)}" alt="${escapeHtml(product.name)}" style="width:100%; height:100%; object-fit:contain;" />` : `<i class="fa-solid fa-image" style="color:#7b8ca7;"></i>`}
            </div>
            <div style="min-width:0; flex:1;">
              <div style="font-weight:800; color:#0f172a; font-size:17px;">${escapeHtml(product.name)}</div>
              <div style="font-size:13px; color:#6b7a90; margin-top:4px;">${escapeHtml(product.slug)}</div>
              <div style="font-size:13px; color:#6b7a90; margin-top:4px;">${escapeHtml(product.category)}</div>
              <div style="font-size:13px; color:#244aa5; margin-top:6px; font-weight:700;">From ${formatMoney(minPrice)}</div>
            </div>
            <div style="font-size:12px; font-weight:800; color:#6b7a90; flex-shrink:0;">
              ${variants.length} variant${variants.length === 1 ? "" : "s"}
            </div>
          </div>
        </button>
      `;
    }).join("");

    els.listWrap.querySelectorAll("[data-product-id]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.selectedProductId = button.getAttribute("data-product-id");
        renderProductsList();
        renderProductDetail();
      });
    });
  }

  function variantCardHtml(variant, index) {
    return `
      <div class="product-variant-card" data-variant-index="${index}" style="border:1px solid #dbe4ef; border-radius:18px; padding:16px; background:#f8fbff; display:grid; gap:12px;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
          <strong style="font-size:16px; color:#0f172a;">Variant ${index + 1}</strong>
          <button type="button" class="dashboard-btn dashboard-btn-secondary" data-remove-variant="${index}">Remove Variant</button>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <label>
            <div style="font-size:12px; font-weight:800; color:#6b7a90; margin-bottom:6px;">Variant ID</div>
            <input class="dashboard-search" data-field="variant_id" value="${escapeHtml(variant.variant_id || "")}" />
          </label>

          <label>
            <div style="font-size:12px; font-weight:800; color:#6b7a90; margin-bottom:6px;">Label</div>
            <input class="dashboard-search" data-field="label" value="${escapeHtml(variant.label || "")}" />
          </label>

          <label>
            <div style="font-size:12px; font-weight:800; color:#6b7a90; margin-bottom:6px;">Price</div>
            <input type="number" step="0.01" class="dashboard-search" data-field="price" value="${Number(variant.price || 0)}" />
          </label>

          <label>
            <div style="font-size:12px; font-weight:800; color:#6b7a90; margin-bottom:6px;">Compare At Price</div>
            <input type="number" step="0.01" class="dashboard-search" data-field="compare_at_price" value="${Number(variant.compare_at_price || 0)}" />
          </label>

          <label>
            <div style="font-size:12px; font-weight:800; color:#6b7a90; margin-bottom:6px;">Weight (oz)</div>
            <input type="number" step="0.01" class="dashboard-search" data-field="weight_oz" value="${Number(variant.weight_oz || 0)}" />
          </label>

          <label>
            <div style="font-size:12px; font-weight:800; color:#6b7a90; margin-bottom:6px;">Stock Quantity</div>
            <input type="number" step="1" class="dashboard-search" data-field="stock_quantity" value="${Number(variant.stock_quantity || 0)}" />
          </label>
        </div>

        <div style="display:flex; gap:16px; flex-wrap:wrap;">
          <label style="display:flex; gap:8px; align-items:center;">
            <input type="checkbox" data-field="allow_backorder" ${variant.allow_backorder === true ? "checked" : ""} />
            <span style="font-size:13px; font-weight:700; color:#0f172a;">Allow Backorder</span>
          </label>

          <label style="display:flex; gap:8px; align-items:center;">
            <input type="checkbox" data-field="is_active" ${variant.is_active !== false ? "checked" : ""} />
            <span style="font-size:13px; font-weight:700; color:#0f172a;">Active</span>
          </label>
        </div>
      </div>
    `;
  }

  function renderProductDetail() {
    if (!els.detailMount) return;

    const product = getSelectedProduct();

    if (!product) {
      els.detailMount.innerHTML = `
        <div class="dashboard-card dashboard-span-2">
          <div class="dashboard-loading">Select a product.</div>
        </div>
      `;
      return;
    }

    const variants = Array.isArray(product.product_variants) ? product.product_variants : [];

    els.detailMount.innerHTML = `
      <div class="dashboard-card dashboard-span-2">
        <div class="dashboard-card-header" style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
          <div>
            <p class="dashboard-kicker">Product Details</p>
            <h3>${escapeHtml(product.name)}</h3>
          </div>

          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button type="button" class="dashboard-btn dashboard-btn-secondary" id="addVariantBtn">Add Variant</button>
            <button type="button" class="dashboard-btn dashboard-btn-secondary" id="deleteProductBtn">Delete Product</button>
            <button type="button" class="dashboard-btn" id="saveProductBtn">Save Product</button>
          </div>
        </div>

        <div style="display:grid; gap:18px;">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <label>
              <div style="font-size:12px; font-weight:800; color:#6b7a90; margin-bottom:6px;">Name</div>
              <input id="productNameInput" class="dashboard-search" value="${escapeHtml(product.name || "")}" />
            </label>

            <label>
              <div style="font-size:12px; font-weight:800; color:#6b7a90; margin-bottom:6px;">Slug</div>
              <input id="productSlugInput" class="dashboard-search" value="${escapeHtml(product.slug || "")}" />
            </label>

            <label>
              <div style="font-size:12px; font-weight:800; color:#6b7a90; margin-bottom:6px;">Badge</div>
              <input id="productBadgeInput" class="dashboard-search" value="${escapeHtml(product.badge || "")}" />
            </label>

            <label>
              <div style="font-size:12px; font-weight:800; color:#6b7a90; margin-bottom:6px;">Category</div>
              <input id="productCategoryInput" class="dashboard-search" value="${escapeHtml(product.category || "")}" />
            </label>
          </div>

          <label>
            <div style="font-size:12px; font-weight:800; color:#6b7a90; margin-bottom:6px;">Main Image Path</div>
            <input id="productMainImageInput" class="dashboard-search" value="${escapeHtml(product.main_image || "")}" />
          </label>

          <label>
            <div style="font-size:12px; font-weight:800; color:#6b7a90; margin-bottom:6px;">Gallery Images (one path per line)</div>
            <textarea id="productGalleryImagesInput" class="dashboard-search" style="min-height:120px; padding:14px;">${escapeHtml((product.gallery_images || []).join("\n"))}</textarea>
          </label>

          <label>
            <div style="font-size:12px; font-weight:800; color:#6b7a90; margin-bottom:6px;">Short Description</div>
            <textarea id="productDescriptionInput" class="dashboard-search" style="min-height:120px; padding:14px;">${escapeHtml(product.description || "")}</textarea>
          </label>

          <label>
            <div style="font-size:12px; font-weight:800; color:#6b7a90; margin-bottom:6px;">Long Description</div>
            <textarea id="productLongDescriptionInput" class="dashboard-search" style="min-height:220px; padding:14px;">${escapeHtml(product.long_description || "")}</textarea>
          </label>

          <label style="display:flex; gap:8px; align-items:center;">
            <input type="checkbox" id="productIsActiveInput" ${product.is_active !== false ? "checked" : ""} />
            <span style="font-size:13px; font-weight:700; color:#0f172a;">Product Active</span>
          </label>

          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <strong style="font-size:18px; color:#0f172a;">Variants</strong>
            </div>

            <div id="variantsEditorWrap" style="display:grid; gap:12px;">
              ${variants.map(variantCardHtml).join("")}
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById("addVariantBtn").addEventListener("click", function () {
      if (!Array.isArray(product.product_variants)) {
        product.product_variants = [];
      }

      product.product_variants.push({
        id: null,
        variant_id: "",
        label: "",
        price: 0,
        compare_at_price: 0,
        weight_oz: 0,
        stock_quantity: 0,
        allow_backorder: false,
        is_active: true,
        sort_order: product.product_variants.length
      });

      renderProductDetail();
    });

    document.getElementById("deleteProductBtn").addEventListener("click", async function () {
      const confirmed = window.confirm(`Delete "${product.name}"?`);
      if (!confirmed) return;

      try {
        await window.AXIOM_PRODUCTS_API.deleteProduct(product.id);
        await window.AXIOM_PRODUCTS.init();
      } catch (error) {
        console.error(error);
        alert(error.message || "Could not delete product.");
      }
    });

    document.getElementById("saveProductBtn").addEventListener("click", async function () {
      try {
        const variantsPayload = Array.from(document.querySelectorAll(".product-variant-card")).map(function (card, index) {
          const original = variants[index] || {};

          return {
            id: original.id || null,
            variant_id: card.querySelector('[data-field="variant_id"]').value.trim(),
            label: card.querySelector('[data-field="label"]').value.trim(),
            price: Number(card.querySelector('[data-field="price"]').value || 0),
            compare_at_price: Number(card.querySelector('[data-field="compare_at_price"]').value || 0),
            weight_oz: Number(card.querySelector('[data-field="weight_oz"]').value || 0),
            stock_quantity: Number(card.querySelector('[data-field="stock_quantity"]').value || 0),
            allow_backorder: card.querySelector('[data-field="allow_backorder"]').checked,
            is_active: card.querySelector('[data-field="is_active"]').checked,
            sort_order: index
          };
        });

        const payload = {
          id: product.id,
          name: document.getElementById("productNameInput").value.trim(),
          slug: document.getElementById("productSlugInput").value.trim(),
          badge: document.getElementById("productBadgeInput").value.trim(),
          category: document.getElementById("productCategoryInput").value.trim(),
          main_image: document.getElementById("productMainImageInput").value.trim(),
          gallery_images: normalizeGalleryImages(document.getElementById("productGalleryImagesInput").value),
          description: document.getElementById("productDescriptionInput").value.trim(),
          long_description: document.getElementById("productLongDescriptionInput").value.trim(),
          is_active: document.getElementById("productIsActiveInput").checked,
          product_variants: variantsPayload
        };

        await window.AXIOM_PRODUCTS_API.saveProduct(payload);
        await window.AXIOM_PRODUCTS.init();
      } catch (error) {
        console.error(error);
        alert(error.message || "Could not save product.");
      }
    });

    document.querySelectorAll("[data-remove-variant]").forEach(function (button) {
      button.addEventListener("click", function () {
        const index = Number(button.getAttribute("data-remove-variant"));

        if (!Array.isArray(product.product_variants)) {
          product.product_variants = [];
        }

        product.product_variants.splice(index, 1);
        renderProductDetail();
      });
    });
  }

  function bindRootButtons() {
    if (rootButtonsBound) return;
    rootButtonsBound = true;

    if (els.refreshSidebarBtn) {
      els.refreshSidebarBtn.addEventListener("click", function () {
        window.AXIOM_PRODUCTS.init();
      });
    }

    if (els.refreshTopBtn) {
      els.refreshTopBtn.addEventListener("click", function () {
        window.AXIOM_PRODUCTS.init();
      });
    }

    if (els.createBtn) {
      els.createBtn.addEventListener("click", async function () {
        try {
          const created = await window.AXIOM_PRODUCTS_API.createProduct();
          await window.AXIOM_PRODUCTS.init();

          if (created && created.id) {
            state.selectedProductId = created.id;
            renderProductsList();
            renderProductDetail();
          }
        } catch (error) {
          console.error(error);
          alert(error.message || "Could not create product.");
        }
      });
    }
  }

  function mount(options) {
    els.listWrap = options.listWrap || null;
    els.detailMount = options.detailMount || null;
    els.refreshSidebarBtn = options.refreshSidebarBtn || null;
    els.refreshTopBtn = options.refreshTopBtn || null;
    els.createBtn = options.createBtn || null;

    bindRootButtons();
  }

  return {
    mount,
    setProducts,
    renderProductsList,
    renderProductDetail
  };
})();
