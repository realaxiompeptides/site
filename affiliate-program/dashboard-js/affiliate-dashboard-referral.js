Object.assign(window.AXIOM_AFFILIATE_DASHBOARD, {
  async loadAffiliateProductOptions() {
    const productSelect = document.getElementById("affiliateProductSlug");
    if (!productSelect) return [];

    if (productSelect.dataset.loaded === "true") {
      return Array.isArray(this.affiliateProductOptions)
        ? this.affiliateProductOptions
        : [];
    }

    const supabase = this.getSupabase();
    let products = [];

    try {
      if (supabase) {
        const result = await supabase
          .from("products")
          .select("slug, name, is_active, sort_order")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true });

        if (result.error) {
          throw result.error;
        }

        products = Array.isArray(result.data) ? result.data : [];
      }
    } catch (error) {
      console.error("[Affiliate Dashboard] Failed loading product options from Supabase:", error);
    }

    if (!products.length && Array.isArray(window.AXIOM_PRODUCTS)) {
      products = window.AXIOM_PRODUCTS
        .map(function (item) {
          return {
            slug: item && item.slug ? item.slug : "",
            name: item && item.name ? item.name : "",
            is_active: true,
            sort_order: item && typeof item.sort_order === "number" ? item.sort_order : 0
          };
        })
        .filter(function (item) {
          return item.slug && item.name;
        });
    }

    const deduped = [];
    const seen = new Set();

    products.forEach(function (item) {
      const slug = String(item && item.slug ? item.slug : "").trim();
      const name = String(item && item.name ? item.name : "").trim();

      if (!slug || !name) return;
      if (seen.has(slug)) return;

      seen.add(slug);
      deduped.push({
        slug: slug,
        name: name,
        sort_order:
          item && typeof item.sort_order === "number" ? item.sort_order : 0
      });
    });

    deduped.sort(function (a, b) {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order;
      }
      return a.name.localeCompare(b.name);
    });

    this.affiliateProductOptions = deduped;

    productSelect.innerHTML = "";

    const placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.textContent = deduped.length
      ? "Select product"
      : "No active products found";
    productSelect.appendChild(placeholderOption);

    deduped.forEach(function (product) {
      const option = document.createElement("option");
      option.value = product.slug;
      option.textContent = product.name;
      productSelect.appendChild(option);
    });

    productSelect.dataset.loaded = "true";

    return deduped;
  },

  async syncAffiliateLinkTargetPath() {
    const targetPathInput = document.getElementById("affiliateTargetPath");
    const linkTypeSelect = document.getElementById("affiliateLinkType");
    const productField = document.getElementById("affiliateProductField");
    const productSelect = document.getElementById("affiliateProductSlug");
    const customField = document.getElementById("affiliateCustomPathField");
    const customPathInput = document.getElementById("affiliateCustomPathInput");

    if (!targetPathInput || !linkTypeSelect) {
      return "";
    }

    const linkType = String(linkTypeSelect.value || "home").trim().toLowerCase();

    if (linkType === "product") {
      await this.loadAffiliateProductOptions();
    }

    if (productField) {
      productField.hidden = linkType !== "product";
      productField.style.display = linkType === "product" ? "" : "none";
    }

    if (customField) {
      customField.hidden = linkType !== "custom";
      customField.style.display = linkType === "custom" ? "" : "none";
    }

    let finalPath = "";

    if (linkType === "home") {
      finalPath = "";
    } else if (linkType === "catalog") {
      finalPath = "/catalog.html";
    } else if (linkType === "product") {
      const slug = productSelect ? String(productSelect.value || "").trim() : "";
      finalPath = slug
        ? "/product-page/product.html?slug=" + encodeURIComponent(slug)
        : "";
    } else if (linkType === "custom") {
      finalPath = customPathInput ? String(customPathInput.value || "").trim() : "";
    }

    targetPathInput.value = finalPath;
    return finalPath;
  },

  async generateTrackingLink() {
    const output = document.getElementById("affiliateGeneratedLink");
    const copyBtn = document.getElementById("affiliateCopyGeneratedLinkBtn");
    const code = (this.affiliateProfile && this.affiliateProfile.referral_code) || "";

    await this.syncAffiliateLinkTargetPath();

    const targetPathInput = document.getElementById("affiliateTargetPath");
    const finalPath = targetPathInput ? String(targetPathInput.value || "").trim() : "";
    const finalUrl = code ? this.buildAffiliateTrackingUrl(finalPath, code) : "";

    if (output) {
      output.value = finalUrl;
    }

    if (copyBtn) {
      copyBtn.dataset.affiliateCopy = finalUrl;
    }
  },

  buildAffiliateTrackingUrl(targetPath, referralCode) {
    const normalizedCode = this.normalizeCode(referralCode);
    const baseOrigin = window.location.origin;

    let resolvedPath = "";
    if (typeof targetPath === "string" && targetPath.trim()) {
      resolvedPath = targetPath.trim();
    }

    if (resolvedPath && !resolvedPath.startsWith("/")) {
      resolvedPath = "/" + resolvedPath.replace(/^\.?\//, "");
    }

    const url = new URL(resolvedPath || "/", baseOrigin);

    if (normalizedCode) {
      url.searchParams.set("ref", normalizedCode);
    }

    return url.toString();
  },

  async updateOwnReferralCode() {
    const supabase = this.getSupabase();
    const input = this.getReferralCodeInput();
    const saveBtn = this.getReferralCodeSaveButton();

    if (!supabase || !this.affiliateProfile || !this.affiliateProfile.id || !input) {
      this.setReferralCodeStatus("Unable to update code right now.", "error");
      return;
    }

    const nextCode = this.normalizeCode(input.value);

    if (!nextCode || nextCode.length < 4) {
      this.setReferralCodeStatus("Code must be at least 4 characters.", "error");
      return;
    }

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving...";
    }

    this.setReferralCodeStatus("Saving code...", "");

    try {
      const { error } = await supabase
        .from("affiliates")
        .update({
          referral_code: nextCode,
          updated_at: new Date().toISOString()
        })
        .eq("id", this.affiliateProfile.id);

      if (error) {
        throw error;
      }

      this.affiliateProfile.referral_code = nextCode;
      this.setText("affiliateDashboardCode", nextCode);
      this.syncReferralCodeUi(nextCode);
      await this.generateTrackingLink();
      this.setReferralCodeStatus("Code updated successfully.", "");
    } catch (error) {
      console.error("[Affiliate Dashboard] updateOwnReferralCode failed:", error);
      this.setReferralCodeStatus(
        error.message || "Unable to update referral code.",
        "error"
      );
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save Code";
      }
    }
  }
});
