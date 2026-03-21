window.AXIOM_PRODUCTS_API = (function () {
  function getSupabase() {
    if (!window.axiomSupabase) {
      throw new Error("Supabase client is missing.");
    }
    return window.axiomSupabase;
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

  async function listProducts() {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        product_variants (
          id,
          product_id,
          variant_id,
          label,
          price,
          compare_at_price,
          weight_oz,
          stock_quantity,
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

    return Array.isArray(data) ? data.map(function (product) {
      return {
        ...product,
        gallery_images: Array.isArray(product.gallery_images) ? product.gallery_images : [],
        product_variants: Array.isArray(product.product_variants)
          ? product.product_variants.sort(function (a, b) {
              return Number(a.sort_order || 0) - Number(b.sort_order || 0);
            })
          : []
      };
    }) : [];
  }

  async function createProduct() {
    const supabase = getSupabase();

    const timestamp = Date.now();
    const slug = `new-product-${timestamp}`;

    const { data, error } = await supabase
      .from("products")
      .insert([
        {
          slug: slug,
          name: "New Product",
          badge: "SALE",
          category: "",
          description: "",
          long_description: "",
          main_image: "",
          gallery_images: [],
          is_active: true,
          sort_order: 0
        }
      ])
      .select()
      .single();

    if (error) {
      throw new Error(error.message || "Failed to create product.");
    }

    return data;
  }

  async function deleteProduct(productId) {
    const supabase = getSupabase();

    const { error: variantsError } = await supabase
      .from("product_variants")
      .delete()
      .eq("product_id", productId);

    if (variantsError) {
      throw new Error(variantsError.message || "Failed to delete product variants.");
    }

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (error) {
      throw new Error(error.message || "Failed to delete product.");
    }

    return true;
  }

  async function saveProduct(payload) {
    const supabase = getSupabase();

    if (!payload || !payload.id) {
      throw new Error("Product payload is missing an id.");
    }

    const productUpdate = {
      name: String(payload.name || "").trim(),
      slug: String(payload.slug || "").trim(),
      badge: String(payload.badge || "").trim(),
      category: String(payload.category || "").trim(),
      description: String(payload.description || "").trim(),
      long_description: String(payload.long_description || "").trim(),
      main_image: String(payload.main_image || "").trim(),
      gallery_images: normalizeGalleryImages(payload.gallery_images),
      is_active: payload.is_active !== false,
      updated_at: new Date().toISOString()
    };

    const { error: productError } = await supabase
      .from("products")
      .update(productUpdate)
      .eq("id", payload.id);

    if (productError) {
      throw new Error(productError.message || "Failed to save product.");
    }

    const variants = Array.isArray(payload.product_variants) ? payload.product_variants : [];
    const incomingIds = variants
      .map(function (variant) { return variant.id; })
      .filter(Boolean);

    const { data: existingVariants, error: existingError } = await supabase
      .from("product_variants")
      .select("id")
      .eq("product_id", payload.id);

    if (existingError) {
      throw new Error(existingError.message || "Failed to load existing variants.");
    }

    const existingIds = Array.isArray(existingVariants)
      ? existingVariants.map(function (variant) { return variant.id; })
      : [];

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

    for (let index = 0; index < variants.length; index += 1) {
      const variant = variants[index];

      const variantPayload = {
        product_id: payload.id,
        variant_id: String(variant.variant_id || "").trim(),
        label: String(variant.label || "").trim(),
        price: Number(variant.price || 0),
        compare_at_price: Number(variant.compare_at_price || 0),
        weight_oz: Number(variant.weight_oz || 0),
        stock_quantity: Number(variant.stock_quantity || 0),
        allow_backorder: variant.allow_backorder === true,
        is_active: variant.is_active !== false,
        sort_order: Number.isFinite(Number(variant.sort_order))
          ? Number(variant.sort_order)
          : index,
        updated_at: new Date().toISOString()
      };

      if (!variantPayload.variant_id) {
        throw new Error(`Variant ${index + 1} is missing a variant ID.`);
      }

      if (!variantPayload.label) {
        throw new Error(`Variant ${index + 1} is missing a label.`);
      }

      if (variant.id) {
        const { error: updateVariantError } = await supabase
          .from("product_variants")
          .update(variantPayload)
          .eq("id", variant.id);

        if (updateVariantError) {
          throw new Error(updateVariantError.message || `Failed to update variant ${index + 1}.`);
        }
      } else {
        const { error: insertVariantError } = await supabase
          .from("product_variants")
          .insert([
            {
              ...variantPayload,
              created_at: new Date().toISOString()
            }
          ]);

        if (insertVariantError) {
          throw new Error(insertVariantError.message || `Failed to create variant ${index + 1}.`);
        }
      }
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
