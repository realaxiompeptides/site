document.addEventListener("DOMContentLoaded", async function () {
  const productData = Array.isArray(window.AXIOM_PRODUCTS) ? window.AXIOM_PRODUCTS : [];

  const purchaseMount = document.getElementById("productPurchaseBoxMount");
  const descriptionMount = document.getElementById("productDescriptionMount");
  const iconBenefitsMount = document.getElementById("productIconBenefitsMount");
  const whyChooseUsMount = document.getElementById("productWhyChooseUsMount");

  async function loadPartial(url, mountEl) {
    if (!mountEl) return false;

    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`);
      mountEl.innerHTML = await response.text();
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  await Promise.all([
    loadPartial("product-purchase-box.html", purchaseMount),
    loadPartial("product-description.html", descriptionMount),
    loadPartial("icon-benefits.html", iconBenefitsMount),
    loadPartial("why-choose-us.html", whyChooseUsMount)
  ]);

  const params = new URLSearchParams(window.location.search);
  const slug = (params.get("slug") || "").trim().toLowerCase();

  const product = productData.find(item => String(item.slug || "").trim().toLowerCase() === slug);

  const breadcrumbName = document.getElementById("productBreadcrumbName");
  const productBadge = document.getElementById("productBadge");
  const productName = document.getElementById("productName");
  const productOldPrice = document.getElementById("productOldPrice");
  const productPrice = document.getElementById("productPrice");
  const productShortDescription = document.getElementById("productShortDescription");
  const productLongDescription = document.getElementById("productLongDescription");
  const productMainImage = document.getElementById("productMainImage");

  const variantSelect = document.getElementById("productVariantSelect");
  const qtyInput = document.getElementById("productQty");
  const qtyMinus = document.getElementById("qtyMinus");
  const qtyPlus = document.getElementById("qtyPlus");
  const addToCartBtn = document.getElementById("productAddToCart");
  const cartCount = document.getElementById("cartCount");

  function formatMoney(value) {
    return `$${Number(value || 0).toFixed(2)}`;
  }

  function getVariants(productObj) {
    return Array.isArray(productObj?.variants) ? productObj.variants : [];
  }

  function normalizeImagePath(path) {
    if (!path || typeof path !== "string") {
      return "../images/products/placeholder.PNG";
    }

    const cleanPath = path.trim();

    if (
      cleanPath.startsWith("../") ||
      cleanPath.startsWith("./") ||
      cleanPath.startsWith("/") ||
      cleanPath.startsWith("http://") ||
      cleanPath.startsWith("https://")
    ) {
      return cleanPath;
    }

    return `../${cleanPath}`;
  }

  function getImageForVariant(productObj, variantIndex) {
    const variants = Array.isArray(productObj?.variants) ? productObj.variants : [];
    const selectedVariant = variants[variantIndex] || variants[0] || null;

    if (selectedVariant?.image) {
      return normalizeImagePath(selectedVariant.image);
    }

    const images = Array.isArray(productObj?.images) ? productObj.images : [];
    if (images.length) {
      return normalizeImagePath(images[variantIndex] || images[0]);
    }

    if (productObj?.image) {
      return normalizeImagePath(productObj.image);
    }

    return "../images/products/placeholder.PNG";
  }

  function setMainImage(src, alt) {
    if (!productMainImage) return;
    productMainImage.src = src;
    productMainImage.alt = alt || "Product image";
    productMainImage.onerror = function () {
      this.onerror = null;
      this.src = "../images/products/placeholder.PNG";
    };
  }

  function updateCartCountDisplay() {
    if (!cartCount) return;

    let cart = [];
    try {
      cart = JSON.parse(localStorage.getItem("axiom_cart")) || [];
    } catch (error) {
      console.error("Failed to read cart from localStorage", error);
      cart = [];
    }

    const totalItems = cart.reduce(function (sum, item) {
      return sum + (Number(item.quantity) || 0);
    }, 0);

    cartCount.textContent = String(totalItems);
  }

  function showNotFoundState() {
    if (productBadge) productBadge.textContent = "SALE";
    if (productName) productName.textContent = "Product not found";
    if (breadcrumbName) breadcrumbName.textContent = "Product";
    if (productShortDescription) {
      productShortDescription.textContent =
        "The product slug in the URL does not match your product data file.";
    }
    if (productLongDescription) {
      productLongDescription.textContent =
        "Check that the product link uses product-page/product.html?slug=your-product-slug and that the slug exists in ../js/product-data.js.";
    }
    if (productPrice) productPrice.textContent = "";
    if (productOldPrice) {
      productOldPrice.textContent = "";
      productOldPrice.style.display = "none";
    }

    setMainImage("../images/products/placeholder.PNG", "Product not found");

    if (variantSelect) {
      variantSelect.innerHTML = `<option value="">Unavailable</option>`;
      variantSelect.disabled = true;
    }

    if (qtyInput) qtyInput.value = "1";
    if (qtyMinus) qtyMinus.disabled = true;
    if (qtyPlus) qtyPlus.disabled = true;
    if (addToCartBtn) addToCartBtn.disabled = true;
  }

  if (!product) {
    showNotFoundState();
    return;
  }

  const variants = getVariants(product);

  if (productBadge) productBadge.textContent = product.badge || "SALE";
  if (productName) productName.textContent = product.name || "Product";
  if (breadcrumbName) breadcrumbName.textContent = product.name || "Product";
  if (productShortDescription) productShortDescription.textContent = product.description || "";
  if (productLongDescription) productLongDescription.textContent = product.longDescription || "";

  if (!variants.length) {
    if (productPrice) productPrice.textContent = "";
    if (productOldPrice) {
      productOldPrice.textContent = "";
      productOldPrice.style.display = "none";
    }

    setMainImage(getImageForVariant(product, 0), product.name || "Product");

    if (variantSelect) {
      variantSelect.innerHTML = `<option value="">Unavailable</option>`;
      variantSelect.disabled = true;
    }

    if (qtyInput) qtyInput.value = "1";
    if (qtyMinus) qtyMinus.disabled = true;
    if (qtyPlus) qtyPlus.disabled = true;
    if (addToCartBtn) addToCartBtn.disabled = true;
    return;
  }

  if (variantSelect) {
    variantSelect.innerHTML = variants
      .map((variant, index) => {
        const soldOutText = variant.inStock === false ? " — Sold Out" : "";
        return `<option value="${index}">${variant.label}${soldOutText}</option>`;
      })
      .join("");
    variantSelect.disabled = false;
  }

  if (qtyInput) {
    qtyInput.value = "1";
    qtyInput.min = "1";
  }

  function getSelectedVariantIndex() {
    if (!variantSelect) return 0;
    const parsed = Number(variantSelect.value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }

  function getSelectedVariant() {
    return variants[getSelectedVariantIndex()] || variants[0];
  }

  function updateVariantDisplay() {
    const variant = getSelectedVariant();
    if (!variant) return;

    if (productPrice) {
      productPrice.textContent = formatMoney(variant.price);
    }

    if (productOldPrice) {
      if (
        variant.compareAtPrice !== undefined &&
        variant.compareAtPrice !== null &&
        Number(variant.compareAtPrice) > Number(variant.price)
      ) {
        productOldPrice.textContent = formatMoney(variant.compareAtPrice);
        productOldPrice.style.display = "inline-block";
      } else {
        productOldPrice.textContent = "";
        productOldPrice.style.display = "none";
      }
    }

    const imageSrc = getImageForVariant(product, getSelectedVariantIndex());
    setMainImage(imageSrc, `${product.name} ${variant.label}`);

    if (addToCartBtn) {
      const inStock = variant.inStock !== false;
      addToCartBtn.disabled = !inStock;
      addToCartBtn.textContent = inStock ? "Add To Cart" : "Out Of Stock";
    }
  }

  updateVariantDisplay();
  updateCartCountDisplay();

  if (variantSelect) {
    variantSelect.addEventListener("change", updateVariantDisplay);
  }

  if (qtyMinus && qtyInput) {
    qtyMinus.disabled = false;
    qtyMinus.addEventListener("click", function () {
      const current = Number(qtyInput.value) || 1;
      qtyInput.value = String(Math.max(1, current - 1));
    });
  }

  if (qtyPlus && qtyInput) {
    qtyPlus.disabled = false;
    qtyPlus.addEventListener("click", function () {
      const current = Number(qtyInput.value) || 1;
      qtyInput.value = String(current + 1);
    });
  }

  if (qtyInput) {
    qtyInput.addEventListener("input", function () {
      const current = Number(qtyInput.value) || 1;
      qtyInput.value = String(Math.max(1, current));
    });
  }

  if (addToCartBtn) {
    addToCartBtn.addEventListener("click", function () {
      const variant = getSelectedVariant();
      if (!variant || variant.inStock === false) return;

      const quantity = Math.max(1, Number(qtyInput ? qtyInput.value : 1) || 1);
      const selectedIndex = getSelectedVariantIndex();
      const image = getImageForVariant(product, selectedIndex);

      const cartItem = {
        id: variant.id,
        slug: product.slug,
        name: product.name,
        variantLabel: variant.label,
        price: Number(variant.price) || 0,
        compareAtPrice:
          variant.compareAtPrice !== undefined && variant.compareAtPrice !== null
            ? Number(variant.compareAtPrice) || null
            : null,
        quantity,
        image,
        weightOz: Number(variant.weightOz) || 0,
        inStock: variant.inStock !== false
      };

      let cart = [];
      try {
        cart = JSON.parse(localStorage.getItem("axiom_cart")) || [];
      } catch (error) {
        console.error("Failed to read cart from localStorage", error);
        cart = [];
      }

      const existingIndex = cart.findIndex(item => item.id === cartItem.id);

      if (existingIndex > -1) {
        cart[existingIndex].quantity += quantity;
      } else {
        cart.push(cartItem);
      }

      localStorage.setItem("axiom_cart", JSON.stringify(cart));

      updateCartCountDisplay();

      window.dispatchEvent(new Event("axiom-cart-updated"));
      document.dispatchEvent(new CustomEvent("axiom-cart-updated"));

      if (typeof window.openCartDrawer === "function") {
        window.openCartDrawer();
      } else {
        addToCartBtn.textContent = "Added To Cart";
        setTimeout(function () {
          const currentVariant = getSelectedVariant();
          if (!currentVariant || currentVariant.inStock === false) return;
          addToCartBtn.textContent = "Add To Cart";
        }, 1200);
      }
    });
  }
});
