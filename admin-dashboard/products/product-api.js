window.AXIOM_PRODUCTS_API = window.AXIOM_PRODUCTS_API || {};

(function () {
  function getSupabase() {
    if (!window.axiomSupabase) {
      throw new Error("Supabase client is missing.");
    }
    return window.axiomSupabase;
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  async function listProducts() {
    const supabase = getSupabase();

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (productsError) {
      throw new Error(productsError.message || "Failed to load products.");
    }

    const { data: variants, error: variantsError } = await supabase
      .from("product_variants")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (variantsError) {
      throw new Error(variantsError.message || "Failed to load product variants.");
    }

    const variantsByProductId = {};
    safeArray(variants).forEach(function (variant) {
      if (!variant.product_id) return;
      if (!variantsByProductId[variant.product_id]) {
        variantsByProductId[variant.product_id] = [];
      }
      variantsByProductId[variant.product_id].push(variant);
    });

    return safeArray(products).map(function (product) {
      return {
        ...product,
        variants: variantsByProductId[product.id] || []
      };
    });
  }

  async function getProduct(productId) {
    if (!productId) {
      throw new Error("Product ID is required.");
    }

    const supabase = getSupabase();

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (productError) {
      throw new Error(productError.message || "Failed to load product.");
    }

    const { data: variants, error: variantsError } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (variantsError) {
      throw new Error(variantsError.message || "Failed to load product variants.");
    }

    return {
      ...product,
      variants: safeArray(variants)
    };
  }

  async function createProduct(productData) {
    const supabase = getSupabase();

    const safeProductData = productData && typeof productData === "object" ? productData : {};

    const payload = {
      slug: String(safeProductData.slug || "").trim(),
      name: String(safeProductData.name || "New Product").trim(),
      badge: String(safeProductData.badge ?? "SALE"),
      category: String(safeProductData.category ?? ""),
      description: String(safeProductData.description ?? ""),
      long_description: String(safeProductData.long_description ?? ""),
      main_image: String(safeProductData.main_image ?? ""),
      gallery_images: Array.isArray(safeProductData.gallery_images) ? safeProductData.gallery_images : [],
      is_active: safeProductData.is_active !== false,
      sort_order: Number(safeProductData.sort_order || 0),
      updated_at: new Date().toISOString()
    };

    if (!payload.slug) {
      throw new Error("Product slug is required.");
    }

    if (!payload.name) {
      throw new Error("Product name is required.");
    }

    const { data, error } = await supabase
      .from("products")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || "Failed to create product.");
    }

    return data;
  }

  async function updateProduct(productId, updates) {
    if (!productId) {
      throw new Error("Product ID is required.");
    }

    const supabase = getSupabase();
    const safeUpdates = updates && typeof updates === "object" ? updates : {};

    const payload = {
      ...safeUpdates,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("products")
      .update(payload)
      .eq("id", productId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || "Failed to update product.");
    }

    return data;
  }

  async function deleteProduct(productId) {
    if (!productId) {
      throw new Error("Product ID is required.");
    }

    const supabase = getSupabase();

    const { error: variantsError } = await supabase
      .from("product_variants")
      .delete()
      .eq("product_id", productId);

    if (variantsError) {
      throw new Error(variantsError.message || "Failed to delete product variants.");
    }

    const { error: productError } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (productError) {
      throw new Error(productError.message || "Failed to delete product.");
    }

    return true;
  }

  async function createVariant(productId, variantData) {
    if (!productId) {
      throw new Error("Product ID is required.");
    }

    const supabase = getSupabase();
    const safeVariantData = variantData && typeof variantData === "object" ? variantData : {};

    const payload = {
      product_id: productId,
      variant_id: String(safeVariantData.variant_id || crypto.randomUUID()),
      label: String(safeVariantData.label || "Default"),
      price: Number(safeVariantData.price || 0),
      compare_at_price: Number(safeVariantData.compare_at_price || 0),
      weight_oz: Number(safeVariantData.weight_oz || 0),
      stock_quantity: Number(safeVariantData.stock_quantity || 0),
      allow_backorder: safeVariantData.allow_backorder === true,
      is_active: safeVariantData.is_active !== false,
      sort_order: Number(safeVariantData.sort_order || 0),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("product_variants")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || "Failed to create variant.");
    }

    return data;
  }

  async function updateVariant(variantRowId, updates) {
    if (!variantRowId) {
      throw new Error("Variant ID is required.");
    }

    const supabase = getSupabase();
    const safeUpdates = updates && typeof updates === "object" ? updates : {};

    const payload = {
      ...safeUpdates,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("product_variants")
      .update(payload)
      .eq("id", variantRowId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || "Failed to update variant.");
    }

    return data;
  }

  async function deleteVariant(variantRowId) {
    if (!variantRowId) {
      throw new Error("Variant ID is required.");
    }

    const supabase = getSupabase();

    const { error } = await supabase
      .from("product_variants")
      .delete()
      .eq("id", variantRowId);

    if (error) {
      throw new Error(error.message || "Failed to delete variant.");
    }

    return true;
  }

  window.AXIOM_PRODUCTS_API.listProducts = listProducts;
  window.AXIOM_PRODUCTS_API.getProduct = getProduct;
  window.AXIOM_PRODUCTS_API.createProduct = createProduct;
  window.AXIOM_PRODUCTS_API.updateProduct = updateProduct;
  window.AXIOM_PRODUCTS_API.deleteProduct = deleteProduct;
  window.AXIOM_PRODUCTS_API.createVariant = createVariant;
  window.AXIOM_PRODUCTS_API.updateVariant = updateVariant;
  window.AXIOM_PRODUCTS_API.deleteVariant = deleteVariant;
})();
