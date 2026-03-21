window.AXIOM_PRODUCTS = window.AXIOM_PRODUCTS || {};

window.AXIOM_PRODUCTS = (function () {
  let products = [];
  let selectedProductId = null;

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function safeObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function formatMoney(value) {
    return `$${Number(value || 0).toFixed(2)}`;
  }

  function getWrap() {
    return document.getElementById("productsListWrap");
  }

  function getEditorWrap() {
    return document.getElementById("productEditorWrap");
  }

  function getSearchInput() {
    return document.getElementById("productsSearch");
  }

  async function fetchProducts() {
    if (!window.axiomSupabase) {
      throw new Error("Supabase client missing.");
    }

    const { data, error } = await window.axiomSupabase
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return safeArray(data);
  }

  function getFilteredProducts() {
    const search = (getSearchInput()?.value || "").trim().toLowerCase();

    return products.filter((product) => {
      if (!search) return true;

      const haystack = [
        product.name,
        product.slug,
        product.category,
        product.description,
        product.short_description
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });
  }

  function renderList() {
    const wrap = getWrap();
    if (!wrap) return;

    const filtered = getFilteredProducts();

    if (!filtered.length) {
      wrap.innerHTML = `<div class="dashboard-empty">No products found.</div>`;
      return;
    }

    wrap.innerHTML = filtered.map((product) => {
      const isActive = selectedProductId === product.id;
      const image = product.image || "../images/products/placeholder.PNG";

      return `
        <div class="dashboard-session-card ${isActive ? "active" : ""}" data-product-id="${product.id}">
          <div style="display:flex; gap:12px; align-items:center;">
            <img
              src="${image}"
              alt="${product.name || "Product"}"
              style="width:60px;height:60px;object-fit:cover;border-radius:12px;border:1px solid #dbe3ee;background:#fff;"
              onerror="this.onerror=null;this.src='../images/products/placeholder.PNG';"
            />
            <div>
              <h4>${product.name || "Untitled Product"}</h4>
              <p>${product.slug || "—"}</p>
              <p>${product.category || "—"} • ${formatMoney(product.price)}</p>
              <p>${product.in_stock ? "In stock" : "Out of stock"} • Qty: ${Number(product.stock_quantity || 0)}</p>
            </div>
          </div>
        </div>
      `;
    }).join("");

    wrap.querySelectorAll("[data-product-id]").forEach((card) => {
      card.addEventListener("click", function () {
        selectedProductId = card.getAttribute("data-product-id");
        renderList();
        renderEditor();
      });
    });
  }

  function renderEditor() {
    const wrap = getEditorWrap();
    if (!wrap) return;

    const product = products.find((entry) => entry.id === selectedProductId);

    if (!product) {
      wrap.innerHTML = `<div class="dashboard-empty">Select a product to edit.</div>`;
      return;
    }

    const variants = safeArray(product.variants);

    wrap.innerHTML = `
      <div class="dashboard-card">
        <h3>Edit Product</h3>

        <div class="dashboard-form-grid" style="display:grid; gap:14px;">
          <label>
            <div>Name</div>
            <input id="editProductName" value="${escapeHtml(product.name || "")}" />
          </label>

          <label>
            <div>Slug</div>
            <input id="editProductSlug" value="${escapeHtml(product.slug || "")}" />
          </label>

          <label>
            <div>Category</div>
            <input id="editProductCategory" value="${escapeHtml(product.category || "")}" />
          </label>

          <label>
            <div>Price</div>
            <input id="editProductPrice" type="number" step="0.01" value="${Number(product.price || 0)}" />
          </label>

          <label>
            <div>Compare at Price</div>
            <input id="editProductComparePrice" type="number" step="0.01" value="${Number(product.compare_at_price || 0)}" />
          </label>

          <label>
            <div>Stock Quantity</div>
            <input id="editProductStockQuantity" type="number" step="1" value="${Number(product.stock_quantity || 0)}" />
          </label>

          <label>
            <div>Image URL / Path</div>
            <input id="editProductImage" value="${escapeHtml(product.image || "")}" />
          </label>

          <label>
            <div>Badge</div>
            <input id="editProductBadge" value="${escapeHtml(product.badge || "")}" />
          </label>

          <label style="display:flex; gap:8px; align-items:center;">
            <input id="editProductInStock" type="checkbox" ${product.in_stock ? "checked" : ""} />
            <span>In Stock</span>
          </label>

          <label>
            <div>Short Description</div>
            <textarea id="editProductShortDescription" rows="3">${escapeHtml(product.short_description || "")}</textarea>
          </label>

          <label>
            <div>Full Description</div>
            <textarea id="editProductDescription" rows="6">${escapeHtml(product.description || "")}</textarea>
          </label>

          <label>
            <div>Variants (JSON)</div>
            <textarea id="editProductVariants" rows="10">${escapeHtml(JSON.stringify(variants, null, 2))}</textarea>
          </label>
        </div>

        <div style="display:flex; gap:12px; margin-top:16px; flex-wrap:wrap;">
          <button id="saveProductBtn" class="dashboard-btn">Save Product</button>
          <button id="deleteProductBtn" class="dashboard-btn dashboard-btn-danger">Delete Product</button>
        </div>
      </div>
    `;

    document.getElementById("saveProductBtn")?.addEventListener("click", saveSelectedProduct);
    document.getElementById("deleteProductBtn")?.addEventListener("click", deleteSelectedProduct);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  async function saveSelectedProduct() {
    const product = products.find((entry) => entry.id === selectedProductId);
    if (!product || !window.axiomSupabase) return;

    let parsedVariants = [];
    try {
      parsedVariants = JSON.parse(document.getElementById("editProductVariants")?.value || "[]");
      if (!Array.isArray(parsedVariants)) parsedVariants = [];
    } catch (error) {
      alert("Variants JSON is invalid.");
      return;
    }

    const payload = {
      name: document.getElementById("editProductName")?.value?.trim() || "",
      slug: document.getElementById("editProductSlug")?.value?.trim() || "",
      category: document.getElementById("editProductCategory")?.value?.trim() || "",
      price: Number(document.getElementById("editProductPrice")?.value || 0),
      compare_at_price: Number(document.getElementById("editProductComparePrice")?.value || 0),
      stock_quantity: Number(document.getElementById("editProductStockQuantity")?.value || 0),
      image: document.getElementById("editProductImage")?.value?.trim() || "",
      badge: document.getElementById("editProductBadge")?.value?.trim() || "",
      in_stock: !!document.getElementById("editProductInStock")?.checked,
      short_description: document.getElementById("editProductShortDescription")?.value || "",
      description: document.getElementById("editProductDescription")?.value || "",
      variants: parsedVariants
    };

    const { error } = await window.axiomSupabase
      .from("products")
      .update(payload)
      .eq("id", product.id);

    if (error) {
      console.error(error);
      alert("Failed to save product: " + (error.message || "Unknown error"));
      return;
    }

    await init();
    alert("Product saved.");
  }

  async function deleteSelectedProduct() {
    const product = products.find((entry) => entry.id === selectedProductId);
    if (!product || !window.axiomSupabase) return;

    const confirmed = window.confirm(`Delete "${product.name}"?`);
    if (!confirmed) return;

    const { error } = await window.axiomSupabase
      .from("products")
      .delete()
      .eq("id", product.id);

    if (error) {
      console.error(error);
      alert("Failed to delete product: " + (error.message || "Unknown error"));
      return;
    }

    selectedProductId = null;
    await init();
    alert("Product deleted.");
  }

  async function createBlankProduct() {
    if (!window.axiomSupabase) return;

    const now = Date.now();

    const payload = {
      product_id: `product-${now}`,
      name: "New Product",
      slug: `new-product-${now}`,
      description: "",
      short_description: "",
      image: "",
      images: [],
      category: "",
      price: 0,
      compare_at_price: null,
      in_stock: true,
      stock_quantity: 0,
      badge: "",
      variants: [],
      sort_order: 0,
      is_active: true
    };

    const { data, error } = await window.axiomSupabase
      .from("products")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error(error);
      alert("Failed to create product: " + (error.message || "Unknown error"));
      return;
    }

    await init();
    selectedProductId = data.id;
    renderList();
    renderEditor();
  }

  async function init() {
    const wrap = getWrap();
    const editorWrap = getEditorWrap();

    if (wrap) {
      wrap.innerHTML = `<div class="dashboard-loading">Loading products...</div>`;
    }

    if (editorWrap) {
      editorWrap.innerHTML = `<div class="dashboard-empty">Select a product to edit.</div>`;
    }

    try {
      products = await fetchProducts();
      renderList();
      renderEditor();
    } catch (error) {
      console.error("Failed to load products:", error);
      if (wrap) {
        wrap.innerHTML = `<div class="dashboard-empty">Failed to load products.</div>`;
      }
    }
  }

  function bind() {
    getSearchInput()?.addEventListener("input", renderList);
    document.getElementById("createProductBtn")?.addEventListener("click", createBlankProduct);
  }

  return {
    init,
    bind,
    refresh: init
  };
})();
