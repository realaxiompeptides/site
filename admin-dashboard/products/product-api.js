window.AXIOM_PRODUCTS_API = (function () {
  function getSupabase() {
    return (
      window.supabaseClient ||
      window.AXIOM_SUPABASE ||
      window.axiomSupabase ||
      null
    );
  }

  function toGalleryArray(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value !== "string") return [];
    return value
      .split("\n")
      .map(function (item) {
        return item.trim();
      })
      .filter(Boolean);
  }

  async function listProducts() {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client not found.");

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
      .order("created_at", { ascending: true });

    if (error) throw error;

    return (data || []).map(function (product) {
      return {
        ...product,
        gallery_images: Array.isArray(product.gallery_images) ? product.gallery_images : [],
        product_variants: Array.isArray(product.product_variants)
          ? product.product_variants.sort(function (a, b) {
              return Number(a.sort_order || 0) - Number(b.sort_order || 0);
            })
          : []
      };
    });
  }

  async function createProduct() {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client not found.");

    const timestamp = Date.now();

    const { data, error } = await supabase
      .from("products")
      .insert({
        slug: `new-product-${timestamp}`,
        name: "New Product",
        badge: "SALE",
        category: "",
        description: "",
        long_description: "",
        main_image: "",
        gallery_images: [],
        is_active: true,
        sort_order: 0
      })
      .select("*")
      .single();

    if (error) throw error;

    return data;
  }

  async function saveProduct(product) {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client not found.");

    const productPayload = {
      id: product.id,
      slug: String(product.slug || "").trim(),
      name: String(product.name || "").trim(),
      badge: String(product.badge || "").trim(),
      category: String(product.category || "").trim(),
      description: String(product.description || "").trim(),
      long_description: String(product.long_description || "").trim(),
      main_image: String(product.main_image || "").trim(),
      gallery_images: toGalleryArray(product.gallery_images),
      is_active: product.is_active !== false,
      sort_order: Number(product.sort_order || 0)
    };

    const { data: savedProduct, error: productError } = await supabase
      .from("products")
      .upsert(productPayload)
      .select("*")
      .single();

    if (productError) throw productError;

    const existingVariantIds = Array.isArray(product.product_variants)
      ? product.product_variants
          .map(function (variant) {
            return variant.id || null;
          })
          .filter(Boolean)
      : [];

    const { data: currentDbVariants, error: currentDbVariantsError } = await supabase
      .from("product_variants")
      .select("id")
      .eq("product_id", savedProduct.id);

    if (currentDbVariantsError) throw currentDbVariantsError;

    const dbVariantIds = (currentDbVariants || []).map(function (variant) {
      return variant.id;
    });

    const variantIdsToDelete = dbVariantIds.filter(function (id) {
      return !existingVariantIds.includes(id);
    });

    if (variantIdsToDelete.length) {
      const { error: deleteError } = await supabase
        .from("product_variants")
        .delete()
        .in("id", variantIdsToDelete);

      if (deleteError) throw deleteError;
    }

    const variantsPayload = (product.product_variants || []).map(function (variant, index) {
      return {
        id: variant.id || undefined,
        product_id: savedProduct.id,
        variant_id: String(variant.variant_id || "").trim(),
        label: String(variant.label || "").trim(),
        price: Number(variant.price || 0),
        compare_at_price: Number(variant.compare_at_price || 0),
        weight_oz: Number(variant.weight_oz || 0),
        stock_quantity: Math.max(0, Number(variant.stock_quantity || 0)),
        allow_backorder: variant.allow_backorder === true,
        is_active: variant.is_active !== false,
        sort_order: Number.isFinite(Number(variant.sort_order))
          ? Number(variant.sort_order)
          : index
      };
    });

    if (variantsPayload.length) {
      const { error: variantsError } = await supabase
        .from("product_variants")
        .upsert(variantsPayload, { onConflict: "variant_id" });

      if (variantsError) throw variantsError;
    }

    return savedProduct;
  }

  async function deleteProduct(productId) {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client not found.");

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (error) throw error;
  }

  return {
    listProducts,
    createProduct,
    saveProduct,
    deleteProduct
  };
})();
