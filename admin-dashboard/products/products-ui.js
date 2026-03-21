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

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function safeObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function normalizeImagePath(path) {
    const raw = String(path || "").trim();

    if (!raw) return "";

    if (
      raw.startsWith("http://") ||
      raw.startsWith("https://") ||
      raw.startsWith("/") ||
      raw.startsWith("../")
    ) {
      return raw;
    }

    if (raw.startsWith("./")) {
      return `../${raw.replace("./", "")}`;
    }

    return `../${raw}`;
  }

  function normalizeGalleryImages(value) {
    if (Array.isArray(value)) {
      return value
        .map(function (item) {
          return String(item || "").trim();
        })
        .filter(Boolean);
    }

    if (typeof value === "string") {
      return value
        .split("\n")
        .map(function (item) {
          return String(item || "").trim();
        })
        .filter(Boolean);
    }

    return [];
  }

  function normalizeVariants(product) {
    const sourceVariants = Array.isArray(product?.product_variants)
      ? product.product_variants
      : Array.isArray(product?.variants)
        ? product.variants
        : [];

    return sourceVariants.map(function (variant, index) {
      const safeVariant = safeObject(variant);

      return {
        id: safeVariant.id || null,
        product_id: safeVariant.product_id || product.id || null,
        variant_id: safeVariant.variant_id || safeVariant.id || "",
        label: safeVariant.label || "",
        price: Number(safeVariant.price || 0),
        compare_at_price: Number(safeVariant.compare_at_price || 0),
        weight_oz: Number(safeVariant.weight_oz || 0),
        stock_quantity: Number(safeVariant.stock_quantity || 0),
        allow_backorder: safeVariant.allow_backorder === true,
        is_active: safeVariant.is_active !== false,
        sort_order:
          safeVariant.sort_order !== undefined && safeVariant.sort_order !== null
            ? Number(safeVariant.sort_order || 0)
            : index
      };
    });
  }

  function normalizeProduct(product) {
    const safeProduct = safeObject(product);

    return {
      id: safeProduct.id || "",
      slug: safeProduct.slug || "",
      name: safeProduct.name || "",
      badge: safeProduct.badge || "SALE",
      category: safeProduct.category || "",
      description: safeProduct.description || "",
      long_description: safeProduct.long_description || "",
      main_image: safeProduct.main_image || "",
      gallery_images: normalizeGalleryImages(safeProduct.gallery_images),
      is_active: safeProduct.is_active !== false,
      sort_order: Number(safeProduct.sort_order || 0),
      product_variants: normalizeVariants(safeProduct)
    };
  }

  function getMainImage(product) {
    const normalizedProduct = normalizeProduct(product);

    if (normalizedProduct.main_image) {
      return normalizeImagePath(normalizedProduct.main_image);
    }

    if (normalizedProduct.gallery_images.length) {
      return normalizeImagePath(normalizedProduct.gallery_images[0]);
    }

    return "";
  }

  function getSelectedProduct() {
    return state.products.find(function (product) {
      return product.id === state.selectedProductId;
    }) || null;
  }

  function setProducts(products) {
    state.products = safeArray(products).map(normalizeProduct);

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
      const variants = safeArray(product.product_variants);
      const image = getMainImage(product);
      const activeClass = product.id === state.selectedProductId ? " active" : "";
      const minPrice = variants.length
        ? Math.min.apply(
            null,
            variants.map(function (variant) {
              return Number(variant.price || 0);
            })
          )
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
              ${
                image
                  ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}" style="width:100%; height:100%; object-fit:contain;" onerror="this.onerror=null;this.src='../images/products/placeholder.PNG';" />`
                  : `<i class="fa-solid fa-image" style="color:#7b8ca7;"></i>`
              }
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
    const safeVariant = safeObject(variant);

    return `
      <div class="product-variant-card" data-variant-index="${index}" style="border:1px solid #dbe4ef; border-radius:18px; padding:16px; background:#f8fbff; display:grid; gap:12px;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
          <strong style="font-size:16px; color:#0f172a;">Variant ${index + 1}</strong>
          <button type="button" class="dashboard-btn dashboard-btn-secondary" data-remove-variant="${index}">Remove Variant</button>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <label>
            <div style="font-size:12px; font-weight:800; color:#6b7a90; margin-bottom:6px;">Variant ID</div>
            <input class="dashboard-search" data-field="variant_id" value="${escapeHtml(safeVariant.variant_id || "")}" />
          </label>

          <label>
            <div style="font-size:12px; font-weight:800; color:#6b7a90; margin-bottom:6px;">Label</div>
            <input class="dashboard-search" data-field="label" value="${escapeHtml(safeVariant.label || "")}" />
          </label>

          <label>
            <div style="font-size:12px; font-weight:800; color:#6b7a90; margin-bottom:6px;">Price</div>
            <input type="number" step="0.01" class="dashboard-search" data-field="price" value="${Number(safeVariant.price || 0)}" />
          </label>

          <label>
            <div style="font-size:12px; font-weight:800; color:#6b7a90; margin-bottom:6px;">Compare At Price</div>
            <input type="number" step="0.01" class="dashboard-search" data-field="compare_at_price" value="${Number(safeVariant.compare_at_price || 0)}" />
          </label>

          <label>
            <div style="font-size:12px; font-weight:800; color:#6b7a90; margin-bottom:6px;">Weight (oz)</div>
            <input type="number" step="0.01" class="dashboard-search" data-field="weight_oz" value="${Number(safeVariant.weight_oz || 0)}" />
          </label>

          <label>
            <div style="font-size:12px; font-weight:800; color:#6b7a90; margin-bottom:6px;">Stock Quantity</div>
            <input type="number" step="1" class="dashboard-search" data-field="stock_quantity" value="${Number(safeVariant.stock_quantity || 0)}" />
          </label>
        </div>

        <div style="display:flex; gap:16px; flex-wrap:wrap;">
          <label style="display:flex; gap:8px; align-items:center;">
            <input type="checkbox" data-field="allow_backorder" ${safeVariant.allow_backorder === true ? "checked" : ""} />
            <span style="font-size:13px; font-weight:700; color:#0f172a;">Allow Backorder</span>
          </label>

          <label style="display:flex; gap:8px; align-items:center;">
            <input type="checkbox" data-field="is_active" ${safeVariant.is_active !== false ? "checked" : ""} />
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

    const variants = safeArray(product.product_variants);

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
            <textarea id="productGalleryImagesInput" class="dashboard-search" style="min-height:120px; padding:14px;">${escapeHtml(safeArray(product.gallery_images).join("\n"))}</textarea>
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
              ${variants.length ? variants.map(variantCardHtml).join("") : `<div class="dashboard-loading">No variants yet.</div>`}
            </div>
          </div>
        </div>
      </div>
    `;

    const addVariantBtn = document.getElementById("addVariantBtn");
    const deleteProductBtn = document.getElementById("deleteProductBtn");
    const saveProductBtn = document.getElementById("saveProductBtn");

    if (addVariantBtn) {
      addVariantBtn.addEventListener("click", function () {
        if (!Array.isArray(product.product_variants)) {
          product.product_variants = [];
        }

        product.product_variants.push({
          id: null,
          product_id: product.id || null,
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
    }

    if (deleteProductBtn) {
      deleteProductBtn.addEventListener("click", async function () {
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
    }

    if (saveProductBtn) {
      saveProductBtn.addEventListener("click", async function () {
        try {
          const variants = Array.from(document.querySelectorAll(".product-variant-card")).map(function (card, index) {
            const original = safeObject(product.product_variants[index]);

            return {
              id: original.id || null,
              product_id: product.id || null,
              variant_id: String(card.querySelector('[data-field="variant_id"]')?.value || "").trim(),
              label: String(card.querySelector('[data-field="label"]')?.value || "").trim(),
              price: Number(card.querySelector('[data-field="price"]')?.value || 0),
              compare_at_price: Number(card.querySelector('[data-field="compare_at_price"]')?.value || 0),
              weight_oz: Number(card.querySelector('[data-field="weight_oz"]')?.value || 0),
              stock_quantity: Number(card.querySelector('[data-field="stock_quantity"]')?.value || 0),
              allow_backorder: !!card.querySelector('[data-field="allow_backorder"]')?.checked,
              is_active: !!card.querySelector('[data-field="is_active"]')?.checked,
              sort_order: index
            };
          });

          const payload = {
            id: product.id,
            slug: String(document.getElementById("productSlugInput")?.value || "").trim(),
            name: String(document.getElementById("productNameInput")?.value || "").trim(),
            badge: String(document.getElementById("productBadgeInput")?.value || "").trim(),
            category: String(document.getElementById("productCategoryInput")?.value || "").trim(),
            main_image: String(document.getElementById("productMainImageInput")?.value || "").trim(),
            gallery_images: normalizeGalleryImages(document.getElementById("productGalleryImagesInput")?.value || ""),
            description: String(document.getElementById("productDescriptionInput")?.value || "").trim(),
            long_description: String(document.getElementById("productLongDescriptionInput")?.value || "").trim(),
            is_active: !!document.getElementById("productIsActiveInput")?.checked,
            product_variants: variants
          };

          if (window.AXIOM_PRODUCTS_API && typeof window.AXIOM_PRODUCTS_API.saveProduct === "function") {
            await window.AXIOM_PRODUCTS_API.saveProduct(payload);
          } else {
            throw new Error("AXIOM_PRODUCTS_API.saveProduct is missing.");
          }

          await window.AXIOM_PRODUCTS.init();
        } catch (error) {
          console.error(error);
          alert(error.message || "Could not save product.");
        }
      });
    }

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
    if (els.refreshSidebarBtn && !els.refreshSidebarBtn.dataset.productsBound) {
      els.refreshSidebarBtn.addEventListener("click", function () {
        if (window.AXIOM_PRODUCTS && typeof window.AXIOM_PRODUCTS.init === "function") {
          window.AXIOM_PRODUCTS.init();
        }
      });
      els.refreshSidebarBtn.dataset.productsBound = "true";
    }

    if (els.refreshTopBtn && !els.refreshTopBtn.dataset.productsBound) {
      els.refreshTopBtn.addEventListener("click", function () {
        if (window.AXIOM_PRODUCTS && typeof window.AXIOM_PRODUCTS.init === "function") {
          window.AXIOM_PRODUCTS.init();
        }
      });
      els.refreshTopBtn.dataset.productsBound = "true";
    }

    if (els.createBtn && !els.createBtn.dataset.productsBound) {
      els.createBtn.addEventListener("click", async function () {
        try {
          const payload = {
            slug: `new-product-${Date.now()}`,
            name: "New Product",
            badge: "SALE",
            category: "",
            description: "",
            long_description: "",
            main_image: "",
            gallery_images: [],
            is_active: true,
            product_variants: [
              {
                variant_id: `variant-${Date.now()}`,
                label: "Default",
                price: 0,
                compare_at_price: 0,
                weight_oz: 0,
                stock_quantity: 0,
                allow_backorder: false,
                is_active: true,
                sort_order: 0
              }
            ]
          };

          if (window.AXIOM_PRODUCTS_API && typeof window.AXIOM_PRODUCTS_API.createProduct === "function") {
            await window.AXIOM_PRODUCTS_API.createProduct(payload);
          } else {
            throw new Error("AXIOM_PRODUCTS_API.createProduct is missing.");
          }

          if (window.AXIOM_PRODUCTS && typeof window.AXIOM_PRODUCTS.init === "function") {
            await window.AXIOM_PRODUCTS.init();
          }
        } catch (error) {
          console.error(error);
          alert(error.message || "Could not create product.");
        }
      });
      els.createBtn.dataset.productsBound = "true";
    }
  }

  function mount(options) {
    const safeOptions = safeObject(options);

    els.listWrap = safeOptions.listWrap || null;
    els.detailMount = safeOptions.detailMount || null;
    els.refreshSidebarBtn = safeOptions.refreshSidebarBtn || null;
    els.refreshTopBtn = safeOptions.refreshTopBtn || null;
    els.createBtn = safeOptions.createBtn || null;

    bindRootButtons();
  }

  return {
    mount,
    setProducts,
    renderProductsList,
    renderProductDetail
  };
})();
