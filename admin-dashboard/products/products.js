window.AXIOM_PRODUCTS = (function () {
  let mounted = false;
  let loading = false;

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function safeObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function safeString(value) {
    return String(value || "").trim();
  }

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

  function setLoadingState() {
    const listWrap = getListWrap();
    const detailMount = getDetailMount();

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
  }

  function setErrorState(message) {
    const listWrap = getListWrap();
    const detailMount = getDetailMount();

    if (listWrap) {
      listWrap.innerHTML = `
        <div class="dashboard-empty">
          Failed to load products: ${String(message || "Unknown error")}
        </div>
      `;
    }

    if (detailMount) {
      detailMount.innerHTML = `
        <div class="dashboard-card dashboard-span-2">
          <div class="dashboard-empty">Product editor unavailable until products load.</div>
        </div>
      `;
    }
  }

  async function fallbackListProductsFromSupabase() {
    if (!window.axiomSupabase) {
      throw new Error("Supabase client is missing.");
    }

    const productsResponse = await window.axiomSupabase
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (productsResponse.error) {
      throw new Error(productsResponse.error.message || "Failed to load products table.");
    }

    const products = safeArray(productsResponse.data);

    const variantsResponse = await window.axiomSupabase
      .from("product_variants")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (variantsResponse.error) {
      throw new Error(variantsResponse.error.message || "Failed to load product variants table.");
    }

    const variants = safeArray(variantsResponse.data);

    return products.map(function (product) {
      return {
        ...product,
        main_coa_image: safeString(product.main_coa_image),
        gallery_images: Array.isArray(product.gallery_images)
          ? product.gallery_images
          : typeof product.gallery_images === "string" && product.gallery_images.trim()
            ? [product.gallery_images.trim()]
            : [],
        product_variants: variants.filter(function (variant) {
          return String(variant.product_id) === String(product.id);
        })
      };
    });
  }

  async function fallbackCreateProductInSupabase(payload) {
    if (!window.axiomSupabase) {
      throw new Error("Supabase client is missing.");
    }

    const safePayload = safeObject(payload);
    const now = new Date().toISOString();

    const productInsert = {
      slug: safePayload.slug || `new-product-${Date.now()}`,
      name: safePayload.name || "New Product",
      badge: safePayload.badge || "SALE",
      category: safePayload.category || "",
      description: safePayload.description || "",
      long_description: safePayload.long_description || "",
      main_image: safePayload.main_image || "",
      main_coa_image: safePayload.main_coa_image || "",
      gallery_images: Array.isArray(safePayload.gallery_images) ? safePayload.gallery_images : [],
      is_active: safePayload.is_active !== false,
      sort_order: Number(safePayload.sort_order || 0),
      updated_at: now
    };

    const productResponse = await window.axiomSupabase
      .from("products")
      .insert(productInsert)
      .select("*")
      .single();

    if (productResponse.error) {
      throw new Error(productResponse.error.message || "Failed to create product.");
    }

    const createdProduct = productResponse.data;
    const variants = safeArray(safePayload.product_variants);

    if (variants.length) {
      const variantRows = variants.map(function (variant, index) {
        const safeVariant = safeObject(variant);

        return {
          product_id: createdProduct.id,
          variant_id: safeVariant.variant_id || `variant-${Date.now()}-${index}`,
          label: safeVariant.label || `Variant ${index + 1}`,
          price: Number(safeVariant.price || 0),
          compare_at_price: Number(safeVariant.compare_at_price || 0),
          weight_oz: Number(safeVariant.weight_oz || 0),
          stock_quantity: Number(safeVariant.stock_quantity || 0),
          image: safeVariant.image || "",
          coa_image_url: safeVariant.coa_image_url || "",
          coa_title: safeVariant.coa_title || "",
          coa_lot_number: safeVariant.coa_lot_number || "",
          coa_tested_at: safeVariant.coa_tested_at || null,
          coa_verified: safeVariant.coa_verified === true,
          allow_backorder: safeVariant.allow_backorder === true,
          is_active: safeVariant.is_active !== false,
          sort_order: Number(
            safeVariant.sort_order !== undefined && safeVariant.sort_order !== null
              ? safeVariant.sort_order
              : index
          ),
          updated_at: now
        };
      });

      const variantsInsertResponse = await window.axiomSupabase
        .from("product_variants")
        .insert(variantRows);

      if (variantsInsertResponse.error) {
        throw new Error(variantsInsertResponse.error.message || "Failed to create product variants.");
      }
    }

    return createdProduct;
  }

  async function fallbackSaveProductInSupabase(payload) {
    if (!window.axiomSupabase) {
      throw new Error("Supabase client is missing.");
    }

    const safePayload = safeObject(payload);
    const productId = safePayload.id;

    if (!productId) {
      throw new Error("Product ID is required to save.");
    }

    const now = new Date().toISOString();

    const productUpdate = {
      slug: safePayload.slug || "",
      name: safePayload.name || "",
      badge: safePayload.badge || "",
      category: safePayload.category || "",
      description: safePayload.description || "",
      long_description: safePayload.long_description || "",
      main_image: safePayload.main_image || "",
      main_coa_image: safePayload.main_coa_image || "",
      gallery_images: Array.isArray(safePayload.gallery_images) ? safePayload.gallery_images : [],
      is_active: safePayload.is_active !== false,
      updated_at: now
    };

    const updateResponse = await window.axiomSupabase
      .from("products")
      .update(productUpdate)
      .eq("id", productId);

    if (updateResponse.error) {
      throw new Error(updateResponse.error.message || "Failed to update product.");
    }

    const existingVariantsResponse = await window.axiomSupabase
      .from("product_variants")
      .select("id")
      .eq("product_id", productId);

    if (existingVariantsResponse.error) {
      throw new Error(existingVariantsResponse.error.message || "Failed to load existing variants.");
    }

    const existingVariantIds = safeArray(existingVariantsResponse.data).map(function (row) {
      return row.id;
    });

    const incomingVariants = safeArray(safePayload.product_variants);
    const incomingVariantIds = incomingVariants
      .map(function (variant) {
        return safeObject(variant).id || null;
      })
      .filter(Boolean);

    const variantIdsToDelete = existingVariantIds.filter(function (id) {
      return !incomingVariantIds.includes(id);
    });

    if (variantIdsToDelete.length) {
      const deleteResponse = await window.axiomSupabase
        .from("product_variants")
        .delete()
        .in("id", variantIdsToDelete);

      if (deleteResponse.error) {
        throw new Error(deleteResponse.error.message || "Failed to delete removed variants.");
      }
    }

    for (let i = 0; i < incomingVariants.length; i += 1) {
      const variant = safeObject(incomingVariants[i]);

      const row = {
        product_id: productId,
        variant_id: variant.variant_id || `variant-${Date.now()}-${i}`,
        label: variant.label || `Variant ${i + 1}`,
        price: Number(variant.price || 0),
        compare_at_price: Number(variant.compare_at_price || 0),
        weight_oz: Number(variant.weight_oz || 0),
        stock_quantity: Number(variant.stock_quantity || 0),
        image: variant.image || "",
        coa_image_url: variant.coa_image_url || "",
        coa_title: variant.coa_title || "",
        coa_lot_number: variant.coa_lot_number || "",
        coa_tested_at: variant.coa_tested_at || null,
        coa_verified: variant.coa_verified === true,
        allow_backorder: variant.allow_backorder === true,
        is_active: variant.is_active !== false,
        sort_order: Number(
          variant.sort_order !== undefined && variant.sort_order !== null
            ? variant.sort_order
            : i
        ),
        updated_at: now
      };

      if (variant.id) {
        const updateVariantResponse = await window.axiomSupabase
          .from("product_variants")
          .update(row)
          .eq("id", variant.id);

        if (updateVariantResponse.error) {
          throw new Error(updateVariantResponse.error.message || "Failed to update a variant.");
        }
      } else {
        const insertVariantResponse = await window.axiomSupabase
          .from("product_variants")
          .insert(row);

        if (insertVariantResponse.error) {
          throw new Error(insertVariantResponse.error.message || "Failed to create a variant.");
        }
      }
    }

    return true;
  }

  async function fallbackDeleteProductInSupabase(productId) {
    if (!window.axiomSupabase) {
      throw new Error("Supabase client is missing.");
    }

    if (!productId) {
      throw new Error("Product ID is required to delete.");
    }

    const deleteVariantsResponse = await window.axiomSupabase
      .from("product_variants")
      .delete()
      .eq("product_id", productId);

    if (deleteVariantsResponse.error) {
      throw new Error(deleteVariantsResponse.error.message || "Failed to delete product variants.");
    }

    const deleteProductResponse = await window.axiomSupabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (deleteProductResponse.error) {
      throw new Error(deleteProductResponse.error.message || "Failed to delete product.");
    }

    return true;
  }

  async function ensureApiMethods() {
    window.AXIOM_PRODUCTS_API = window.AXIOM_PRODUCTS_API || {};

    if (typeof window.AXIOM_PRODUCTS_API.listProducts !== "function") {
      window.AXIOM_PRODUCTS_API.listProducts = fallbackListProductsFromSupabase;
    }

    if (typeof window.AXIOM_PRODUCTS_API.createProduct !== "function") {
      window.AXIOM_PRODUCTS_API.createProduct = fallbackCreateProductInSupabase;
    }

    if (typeof window.AXIOM_PRODUCTS_API.saveProduct !== "function") {
      window.AXIOM_PRODUCTS_API.saveProduct = fallbackSaveProductInSupabase;
    }

    if (typeof window.AXIOM_PRODUCTS_API.deleteProduct !== "function") {
      window.AXIOM_PRODUCTS_API.deleteProduct = fallbackDeleteProductInSupabase;
    }
  }

  function mountUiIfNeeded() {
    if (mounted) return;

    if (!window.AXIOM_PRODUCTS_UI || typeof window.AXIOM_PRODUCTS_UI.mount !== "function") {
      throw new Error("AXIOM_PRODUCTS_UI.mount is missing.");
    }

    window.AXIOM_PRODUCTS_UI.mount({
      listWrap: getListWrap(),
      detailMount: getDetailMount(),
      refreshSidebarBtn: getRefreshSidebarBtn(),
      refreshTopBtn: getRefreshTopBtn(),
      createBtn: getCreateBtn()
    });

    mounted = true;
  }

  async function init() {
    if (loading) return;
    loading = true;

    try {
      mountUiIfNeeded();
      setLoadingState();
      await ensureApiMethods();

      const products = await window.AXIOM_PRODUCTS_API.listProducts();

      if (!window.AXIOM_PRODUCTS_UI || typeof window.AXIOM_PRODUCTS_UI.setProducts !== "function") {
        throw new Error("AXIOM_PRODUCTS_UI.setProducts is missing.");
      }

      window.AXIOM_PRODUCTS_UI.setProducts(products);

      if (typeof window.AXIOM_PRODUCTS_UI.renderProductsList === "function") {
        window.AXIOM_PRODUCTS_UI.renderProductsList();
      }

      if (typeof window.AXIOM_PRODUCTS_UI.renderProductDetail === "function") {
        window.AXIOM_PRODUCTS_UI.renderProductDetail();
      }
    } catch (error) {
      console.error("Products init failed:", error);
      setErrorState(error.message || "Unknown error");
    } finally {
      loading = false;
    }
  }

  return {
    init: init
  };
})();
