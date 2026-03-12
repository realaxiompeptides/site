document.addEventListener("DOMContentLoaded", () => {
  const products = window.AXIOM_PRODUCTS || [];
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");

  const product = products.find(item => item.slug === slug);

  const productName = document.getElementById("productName");
  const productBreadcrumbName = document.getElementById("productBreadcrumbName");
  const productBadge = document.getElementById("productBadge");
  const productMainImage = document.getElementById("productMainImage");
  const productShortDescription = document.getElementById("productShortDescription");
  const productLongDescription = document.getElementById("productLongDescription");
  const productVariantSelect = document.getElementById("productVariantSelect");
  const productOldPrice = document.getElementById("productOldPrice");
  const productPrice = document.getElementById("productPrice");
  const addToCartBtn = document.getElementById("productAddToCart");

  if (!product) {
    if (productName) productName.textContent = "Product not found";
    if (productShortDescription) {
      productShortDescription.textContent = "The product slug in the URL does not match your products-data.js file.";
    }
    if (productLongDescription) {
      productLongDescription.textContent = "Check that the product link uses product.html?slug=your-product-slug and that the slug exists in js/products-data.js.";
    }
    return;
  }

  function formatMoney(value) {
    return `$${Number(value).toFixed(2)}`;
  }

  function updateVariantDisplay() {
    const variantIndex = Number(productVariantSelect.value || 0);
    const variant = product.variants[variantIndex];

    productOldPrice.textContent = variant.compareAtPrice ? formatMoney(variant.compareAtPrice) : "";
    productPrice.textContent = formatMoney(variant.price);
  }

  document.title = `${product.name} | Axiom Peptides`;

  productName.textContent = product.name;
  productBreadcrumbName.textContent = product.name;
  productBadge.textContent = product.badge || "SALE";
  productShortDescription.textContent = product.description || "";
  productLongDescription.textContent = product.longDescription || "";

  productMainImage.src = product.images?.[0] || "";
  productMainImage.alt = product.name;

  productVariantSelect.innerHTML = product.variants
    .map((variant, index) => {
      return `<option value="${index}">${variant.label} — ${formatMoney(variant.price)}</option>`;
    })
    .join("");

  updateVariantDisplay();
  productVariantSelect.addEventListener("change", updateVariantDisplay);

  addToCartBtn.addEventListener("click", () => {
    const variantIndex = Number(productVariantSelect.value || 0);
    const variant = product.variants[variantIndex];

    const cart = JSON.parse(localStorage.getItem("axiomCart") || "[]");
    const cartId = `${product.slug}-${variant.id}`;

    const existing = cart.find(item => item.cartId === cartId);

    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({
        cartId,
        id: product.slug,
        name: product.name,
        variant: variant.label,
        price: variant.price,
        oldPrice: variant.compareAtPrice || null,
        image: product.images?.[0] || "",
        qty: 1,
        weightOz: variant.weightOz || 1
      });
    }

    localStorage.setItem("axiomCart", JSON.stringify(cart));

    if (typeof window.renderCartDrawer === "function") {
      window.renderCartDrawer();
    }

    if (typeof window.openCartDrawer === "function") {
      window.openCartDrawer();
    } else {
      alert("Added to cart");
    }
  });
});
