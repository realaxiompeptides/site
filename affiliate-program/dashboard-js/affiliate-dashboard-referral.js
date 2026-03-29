Object.assign(window.AXIOM_AFFILIATE_DASHBOARD, {
  syncAffiliateLinkTargetPath() {
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
      finalPath = slug ? "/product-page/product.html?slug=" + encodeURIComponent(slug) : "";
    } else if (linkType === "custom") {
      finalPath = customPathInput ? String(customPathInput.value || "").trim() : "";
    }

    targetPathInput.value = finalPath;
    return finalPath;
  },

  generateTrackingLink() {
    const output = document.getElementById("affiliateGeneratedLink");
    const copyBtn = document.getElementById("affiliateCopyGeneratedLinkBtn");
    const code = (this.affiliateProfile && this.affiliateProfile.referral_code) || "";

    this.syncAffiliateLinkTargetPath();

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
      this.generateTrackingLink();
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
