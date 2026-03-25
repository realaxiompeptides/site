window.AXIOM_PRODUCTS_API = (function () {
  function getSupabase() {
    if (!window.axiomSupabase) {
      throw new Error("Supabase client is not available.");
    }
    return window.axiomSupabase;
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function safeString(value) {
    return String(value || "").trim();
  }

  function safeNumber(value, fallback) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function normalizeGalleryImages(value) {
    if (Array.isArray(value)) {
      return value
        .map(function (item) {
          return safeString(item);
        })
        .filter(Boolean);
    }

    if (typeof value === "string") {
      return value
        .split("\n")
        .map(function (line) {
          return safeString(line);
        })
        .filter(Boolean);
    }

    return [];
  }

  function normalizeVariant(variant, productId, index) {
    return {
      id: variant && variant.id ? variant.id : "",
      product_id: productId,
      variant_id: safeString(variant && variant.variant_id),
      label: safeString(variant && variant.label),
      price: safeNumber(variant && variant.price, 0),
      compare_at_price: safeNumber(variant && variant.compare_at_price, 0),
      weight_oz: safeNumber(variant && variant.weight_oz, 0),
      stock_quantity: safeNumber(variant && variant.stock_quantity, 0),
      image: safeString(variant && variant.image),
      coa_image_url: safeString(variant && variant.coa_image_url),
      coa_title: safeString(variant && variant.coa_title),
      coa_lot_number: safeString(variant && variant.coa_lot_number),
      coa_tested_at: safeString(variant && variant.coa_tested_at),
      coa_verified: !!(variant && variant.coa_verified),
      allow_backorder: !!(variant && variant.allow_backorder),
      is_active: variant && variant.is_active === false ? false : true,
      sort_order: safeNumber(variant && variant.sort_order, index)
    };
  }

  function normalizeProduct(product) {
    return {
      ...product,
      gallery_images: normalizeGalleryImages(product.gallery_images),
      main_coa_image: safeString(product.main_coa_image),
      product_variants: safeArray(product.product_variants).sort(function (a, b) {
        return safeNumber(a.sort_order, 0) - safeNumber(b.sort_order, 0);
      })
    };
  }

  async function listProducts() {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("products")
      .select(`
        id,
        slug,
        name,
        badge,
        category,
        description,
        long_description,
        main_image,
        main_coa_image,
        gallery_images,
        is_active,
        sort_order,
        created_at,
        updated_at,
        product_variants (
          id,
          product_id,
          variant_id,
          label,
          price,
          compare_at_price,
          weight_oz,
          stock_quantity,
          image,
          coa_image_url,
          coa_title,
          coa_lot_number,
          coa_tested_at,
          coa_verified,
          allow_backorder,
          is_active,
          sort_order,
          created_at,
          updated_at
        )
      `)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message || "Failed to load products.");
    }

    return safeArray(data).map(normalizeProduct);
  }

  async function createProduct() {
    const supabase = getSupabase();

    const timestamp = Date.now();
    const defaultSlug = `new-product-${timestamp}`;

    const insertPayload = {
      slug: defaultSlug,
      name: "New Product",
      badge: "SALE",
      category: "",
      description: "",
      long_description: "",
      main_image: "",
      main_coa_image: "",
      gallery_images: [],
      is_active: true,
      sort_order: 9999
    };

    const { data, error } = await supabase
      .from("products")
      .insert(insertPayload)
      .select(`
        id,
        slug,
        name,
        badge,
        category,
        description,
        long_description,
        main_image,
        main_coa_image,
        gallery_images,
        is_active,
        sort_order,
        created_at,
        updated_at,
        product_variants (
          id,
          product_id,
          variant_id,
          label,
          price,
          compare_at_price,
          weight_oz,
          stock_quantity,
          image,
          coa_image_url,
          coa_title,
          coa_lot_number,
          coa_tested_at,
          coa_verified,
          allow_backorder,
          is_active,
          sort_order,
          created_at,
          updated_at
        )
      `)
      .single();

    if (error) {
      throw new Error(error.message || "Failed to create product.");
    }

    return normalizeProduct(data);
  }

  async function saveProduct(product) {
    const supabase = getSupabase();

    if (!product || !safeString(product.name)) {
      throw new Error("Product name is required.");
    }

    if (!safeString(product.slug)) {
      throw new Error("Product slug is required.");
    }

    const productPayload = {
      slug: safeString(product.slug),
      name: safeString(product.name),
      badge: safeString(product.badge),
      category: safeString(product.category),
      description: safeString(product.description),
      long_description: safeString(product.long_description),
      main_image: safeString(product.main_image),
      main_coa_image: safeString(product.main_coa_image),
      gallery_images: normalizeGalleryImages(product.gallery_images),
      is_active: product.is_active === false ? false : true,
      updated_at: new Date().toISOString()
    };

    let savedProduct;

    if (product.id) {
      const { data, error } = await supabase
        .from("products")
        .update(productPayload)
        .eq("id", product.id)
        .select(`
          id,
          slug,
          name,
          badge,
          category,
          description,
          long_description,
          main_image,
          main_coa_image,
          gallery_images,
          is_active,
          sort_order,
          created_at,
          updated_at
        `)
        .single();

      if (error) {
        throw new Error(error.message || "Failed to update product.");
      }

      savedProduct = data;
    } else {
      const { data, error } = await supabase
        .from("products")
        .insert(productPayload)
        .select(`
          id,
          slug,
          name,
          badge,
          category,
          description,
          long_description,
          main_image,
          main_coa_image,
          gallery_images,
          is_active,
          sort_order,
          created_at,
          updated_at
        `)
        .single();

      if (error) {
        throw new Error(error.message || "Failed to create product.");
      }

      savedProduct = data;
    }

    const productId = savedProduct.id;

    const incomingVariants = safeArray(product.product_variants)
      .map(function (variant, index) {
        return normalizeVariant(variant, productId, index);
      })
      .filter(function (variant) {
        return variant.variant_id || variant.label;
      });

    const { data: existingVariants, error: existingError } = await supabase
      .from("product_variants")
      .select("id")
      .eq("product_id", productId);

    if (existingError) {
      throw new Error(existingError.message || "Failed to load existing variants.");
    }

    const existingIds = safeArray(existingVariants)
      .map(function (row) {
        return row.id;
      })
      .filter(Boolean);

    const incomingIds = incomingVariants
      .map(function (variant) {
        return variant.id;
      })
      .filter(Boolean);

    const idsToDelete = existingIds.filter(function (id) {
      return !incomingIds.includes(id);
    });

    if (idsToDelete.length) {
      const { error: deleteError } = await supabase
        .from("product_variants")
        .delete()
        .in("id", idsToDelete);

      if (deleteError) {
        throw new Error(deleteError.message || "Failed to delete removed variants.");
      }
    }

    if (incomingVariants.length) {
      const upsertPayload = incomingVariants.map(function (variant) {
        const row = {
          product_id: variant.product_id,
          variant_id: variant.variant_id,
          label: variant.label,
          price: variant.price,
          compare_at_price: variant.compare_at_price,
          weight_oz: variant.weight_oz,
          stock_quantity: variant.stock_quantity,
          image: variant.image,
          coa_image_url: variant.coa_image_url,
          coa_title: variant.coa_title,
          coa_lot_number: variant.coa_lot_number,
          coa_tested_at: variant.coa_tested_at || null,
          coa_verified: variant.coa_verified,
          allow_backorder: variant.allow_backorder,
          is_active: variant.is_active,
          sort_order: variant.sort_order,
          updated_at: new Date().toISOString()
        };

        if (variant.id) {
          row.id = variant.id;
        }

        return row;
      });

      const existingRows = upsertPayload.filter(function (row) {
        return !!row.id;
      });

      const newRows = upsertPayload.filter(function (row) {
        return !row.id;
      });

      if (existingRows.length) {
        const { error: updateError } = await supabase
          .from("product_variants")
          .upsert(existingRows, { onConflict: "id" });

        if (updateError) {
          throw new Error(updateError.message || "Failed to update variants.");
        }
      }

      if (newRows.length) {
        const { error: insertError } = await supabase
          .from("product_variants")
          .insert(newRows);

        if (insertError) {
          throw new Error(insertError.message || "Failed to create new variants.");
        }
      }
    }

    const { data: finalProduct, error: finalError } = await supabase
      .from("products")
      .select(`
        id,
        slug,
        name,
        badge,
        category,
        description,
        long_description,
        main_image,
        main_coa_image,
        gallery_images,
        is_active,
        sort_order,
        created_at,
        updated_at,
        product_variants (
          id,
          product_id,
          variant_id,
          label,
          price,
          compare_at_price,
          weight_oz,
          stock_quantity,
          image,
          coa_image_url,
          coa_title,
          coa_lot_number,
          coa_tested_at,
          coa_verified,
          allow_backorder,
          is_active,
          sort_order,
          created_at,
          updated_at
        )
      `)
      .eq("id", productId)
      .single();

    if (finalError) {
      throw new Error(finalError.message || "Product saved, but failed to reload it.");
    }

    return normalizeProduct(finalProduct);
  }

  async function deleteProduct(productId) {
    const supabase = getSupabase();

    if (!productId) {
      throw new Error("Product ID is required.");
    }

    const { error: variantDeleteError } = await supabase
      .from("product_variants")
      .delete()
      .eq("product_id", productId);

    if (variantDeleteError) {
      throw new Error(variantDeleteError.message || "Failed to delete product variants.");
    }

    const { error: productDeleteError } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (productDeleteError) {
      throw new Error(productDeleteError.message || "Failed to delete product.");
    }

    return true;
  }

  return {
    listProducts,
    createProduct,
    saveProduct,
    deleteProduct
  };
})();
