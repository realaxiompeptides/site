document.addEventListener("DOMContentLoaded", async function () {
  const productData = Array.isArray(window.AXIOM_PRODUCTS) ? window.AXIOM_PRODUCTS : [];

  const purchaseMount = document.getElementById("productPurchaseBoxMount");
  const descriptionMount = document.getElementById("productDescriptionMount");

  async function loadPartial(url, mountEl) {
    if (!mountEl) return;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to load ${url}`);
      mountEl.innerHTML = await response.text();
    } catch (error) {
      console.error(error);
    }
  }

  await Promise.all([
    loadPartial("product-purchase-box.html", purchaseMount),
    loadPartial("product-description.html", descriptionMount)
  ]);

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");

  const product = productData.find(item => item.slug === slug);

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

  function formatMoney(value) {
    return `$${Number(value).toFixed(2)}`;
  }

  function getImageForVariant(productObj, variantIndex) {
    if (!productObj || !Array.isArray(productObj.images) || !productObj.images.length) {
      return "../images/products/placeholder.PNG";
    }

    return productObj.images[variantIndex] || productObj.images[0];
  }

  if (!product) {
    if (productName) productName.textContent = "Product not found";
    if (breadcrumbName) breadcrumbName.textContent = "Product";
    if (productShortDescription) {
      productShortDescription.textContent = "The product slug in the URL does not match your product data file.";
    }
    if (productLongDescription) {
      productLongDescription.textContent = "Check that the product link uses product-page/product.html?slug=your-product-slug and that the slug exists in ../js/product-data.js.";
    }
    if (productMainImage) {
      productMainImage.src = "../images/products/placeholder.PNG";
      productMainImage.alt = "Product not found";
    }
    if (variantSelect) {
      variantSelect.innerHTML = `<option value="">Unavailable</option>`;
      variantSelect.disabled = true;
    }
    if (addToCartBtn) addToCartBtn.disabled = true;
    return;
  }

  if (productBadge) productBadge.textContent = product.badge || "SALE";
  if (productName) productName.textContent = product.name;
  if (breadcrumbName) breadcrumbName.textContent = product.name;
  if (productShortDescription) productShortDescription.textContent = product.description || "";
  if (productLongDescription) productLongDescription.textContent = product.longDescription || "";

  if (variantSelect) {
    variantSelect.innerHTML = product.variants.map((variant, index) => {
      return `<option value="${index}">${variant.label}</option>`;
    }).join("");
  }

  function updateVariantDisplay() {
    if (!variantSelect) return;

    const selectedIndex = Number(variantSelect.value || 0);
    const variant = product.variants[selectedIndex] || product.variants[0];

    if (!variant) return;

    if (productPrice) {
      productPrice.textContent = formatMoney(variant.price);
    }

    if (productOldPrice) {
      if (variant.compareAtPrice && Number(variant.compareAtPrice) > Number(variant.price)) {
        productOldPrice.textContent = formatMoney(variant.compareAtPrice);
        productOldPrice.style.display = "inline-block";
      } else {
        productOldPrice.textContent = "";
        productOldPrice.style.display = "none";
      }
    }

    if (productMainImage) {
      productMainImage.src = getImageForVariant(product, selectedIndex);
      productMainImage.alt = `${product.name} ${variant.label}`;
    }
  }

  updateVariantDisplay();

  if (variantSelect) {
    variantSelect.addEventListener("change", updateVariantDisplay);
  }

  if (qtyMinus && qtyInput) {
    qtyMinus.addEventListener("click", function () {
      const current = Number(qtyInput.value) || 1;
      qtyInput.value = Math.max(1, current - 1);
    });
  }

  if (qtyPlus && qtyInput) {
    qtyPlus.addEventListener("click", function () {
      const current = Number(qtyInput.value) || 1;
      qtyInput.value = current + 1;
    });
  }

  if (addToCartBtn) {
    addToCartBtn.addEventListener("click", function () {
      const selectedIndex = Number(variantSelect ? variantSelect.value : 0);
      const variant = product.variants[selectedIndex] || product.variants[0];
      const quantity = Math.max(1, Number(qtyInput ? qtyInput.value : 1) || 1);
      const image = getImageForVariant(product, selectedIndex);

      const cartItem = {
        id: variant.id,
        slug: product.slug,
        name: product.name,
        variantLabel: variant.label,
        price: Number(variant.price),
        compareAtPrice: Number(variant.compareAtPrice) || null,
        quantity,
        image,
        weightOz: Number(variant.weightOz) || 0
      };

      let cart = [];
      try {
        cart = JSON.parse(localStorage.getItem("axiom_cart")) || [];
      } catch (e) {
        cart = [];
      }

      const existingIndex = cart.findIndex(item => item.id === cartItem.id);

      if (existingIndex > -1) {
        cart[existingIndex].quantity += quantity;
      } else {
        cart.push(cartItem);
      }

      localStorage.setItem("axiom_cart", JSON.stringify(cart));
      window.dispatchEvent(new Event("axiom-cart-updated"));

      if (typeof window.openCartDrawer === "function") {
        window.openCartDrawer();
      } else {
        alert("Added to cart");
      }
    });
  }
});
