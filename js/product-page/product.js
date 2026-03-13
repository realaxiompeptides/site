document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");

  if (!slug) {
    document.getElementById("productTitle").textContent = "Product not found";
    return;
  }

  try {
    const response = await fetch(`products/${slug}.json`);
    if (!response.ok) throw new Error("Product file not found");

    const product = await response.json();

    document.title = `Axiom Peptides | ${product.name}`;

    const title = document.getElementById("productTitle");
    const subtitle = document.getElementById("productSubtitle");
    const badge = document.getElementById("productBadge");
    const description = document.getElementById("productDescription");
    const mainImage = document.getElementById("productMainImage");
    const thumbs = document.getElementById("productThumbs");
    const variantSelect = document.getElementById("productVariant");
    const price = document.getElementById("productPrice");
    const oldPrice = document.getElementById("productOldPrice");
    const metaGrid = document.getElementById("productMetaGrid");

    title.textContent = product.name || "";
    subtitle.textContent = product.subtitle || "";
    badge.textContent = product.badge || "SALE";
    description.textContent = product.description || "";

    mainImage.src = product.mainImage || "";
    mainImage.alt = product.name || "";

    if (Array.isArray(product.gallery)) {
      thumbs.innerHTML = product.gallery.map((img, index) => `
        <button class="product-thumb ${index === 0 ? "active" : ""}" type="button" data-image="${img}">
          <img src="${img}" alt="${product.name} thumbnail ${index + 1}">
        </button>
      `).join("");

      thumbs.querySelectorAll(".product-thumb").forEach(btn => {
        btn.addEventListener("click", () => {
          thumbs.querySelectorAll(".product-thumb").forEach(t => t.classList.remove("active"));
          btn.classList.add("active");
          mainImage.src = btn.dataset.image;
        });
      });
    }

    if (Array.isArray(product.variants) && product.variants.length) {
      variantSelect.innerHTML = product.variants.map((variant, index) => `
        <option value="${index}">
          ${variant.name} - $${Number(variant.price).toFixed(2)}
        </option>
      `).join("");

      function updateVariant(index) {
        const selected = product.variants[index];
        price.textContent = `$${Number(selected.price).toFixed(2)}`;

        if (selected.oldPrice) {
          oldPrice.textContent = `$${Number(selected.oldPrice).toFixed(2)}`;
          oldPrice.style.display = "block";
        } else {
          oldPrice.textContent = "";
          oldPrice.style.display = "none";
        }
      }

      updateVariant(0);

      variantSelect.addEventListener("change", () => {
        updateVariant(Number(variantSelect.value));
      });
    } else {
      price.textContent = `$${Number(product.price || 0).toFixed(2)}`;

      if (product.oldPrice) {
        oldPrice.textContent = `$${Number(product.oldPrice).toFixed(2)}`;
      } else {
        oldPrice.style.display = "none";
      }

      variantSelect.innerHTML = `<option value="0">Default</option>`;
    }

    const details = product.details || {};
    metaGrid.innerHTML = `
      <div class="product-meta-card"><strong>Purity</strong><span>${details.purity || "-"}</span></div>
      <div class="product-meta-card"><strong>Usage</strong><span>${details.usage || "-"}</span></div>
      <div class="product-meta-card"><strong>Shipping</strong><span>${details.shipping || "-"}</span></div>
      <div class="product-meta-card"><strong>Origin</strong><span>${details.origin || "-"}</span></div>
    `;
  } catch (error) {
    document.getElementById("productTitle").textContent = "Product not found";
    console.error(error);
  }
});
