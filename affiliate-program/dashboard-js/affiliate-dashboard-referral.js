Object.assign(window.AXIOM_AFFILIATE_DASHBOARD, {
  buildAffiliateTrackingUrl(targetPath, referralCode) {
    const normalizedCode = this.normalizeCode(referralCode);
    const rawPath = String(targetPath || "").trim();
    const baseOrigin = window.location.origin;

    let resolvedUrl;

    try {
      if (!rawPath) {
        resolvedUrl = new URL("../index.html", window.location.href);
      } else if (/^https?:\/\//i.test(rawPath)) {
        resolvedUrl = new URL(rawPath);
      } else {
        const prefixedPath = rawPath.startsWith("/") ? rawPath : "/" + rawPath.replace(/^\.\//, "");
        resolvedUrl = new URL(prefixedPath, baseOrigin);
      }
    } catch (error) {
      resolvedUrl = new URL("../index.html", window.location.href);
    }

    if (normalizedCode) {
      resolvedUrl.searchParams.set("ref", normalizedCode);
    }

    return resolvedUrl.toString();
  },

  generateTrackingLink() {
    const targetInput = document.getElementById("affiliateTargetPath");
    const outputInput = document.getElementById("affiliateGeneratedLink");
    const referralCode =
      (this.affiliateProfile && this.affiliateProfile.referral_code) ||
      (this.getReferralCodeInput() && this.getReferralCodeInput().value) ||
      "";

    if (!outputInput) {
      return;
    }

    const url = this.buildAffiliateTrackingUrl(
      targetInput ? targetInput.value : "",
      referralCode
    );

    outputInput.value = url;

    const copyBtn = document.getElementById("affiliateCopyGeneratedLinkBtn");
    if (copyBtn) {
      copyBtn.setAttribute("data-affiliate-copy", url);
    }
  },

  async updateOwnReferralCode() {
    const supabase = this.getSupabase();
    const input = this.getReferralCodeInput();
    const saveBtn = this.getReferralCodeSaveButton();

    if (!supabase) {
      this.setReferralCodeStatus("Supabase is not available.", "error");
      return false;
    }

    if (!this.affiliateProfile || !this.affiliateProfile.id) {
      this.setReferralCodeStatus("Affiliate profile not found.", "error");
      return false;
    }

    const nextCode = this.normalizeCode(input ? input.value : "");

    if (!nextCode || nextCode.length < 4 || nextCode.length > 12) {
      this.setReferralCodeStatus("Code must be 4 to 12 characters.", "error");
      return false;
    }

    if (saveBtn) {
      saveBtn.disabled = true;
    }

    this.setReferralCodeStatus("Saving code...", "info");

    const rpcAttempts = [
      {
        name: "affiliate_update_own_referral_code",
        args: { p_referral_code: nextCode }
      },
      {
        name: "affiliate_update_own_referral_code",
        args: { new_referral_code: nextCode }
      },
      {
        name: "admin_update_affiliate_referral_code",
        args: {
          p_affiliate_id: this.affiliateProfile.id,
          p_referral_code: nextCode
        }
      },
      {
        name: "admin_update_affiliate_referral_code",
        args: {
          affiliate_id_input: this.affiliateProfile.id,
          new_referral_code: nextCode
        }
      }
    ];

    let saved = false;

    for (const attempt of rpcAttempts) {
      try {
        const rpcResult = await supabase.rpc(attempt.name, attempt.args);
        if (!rpcResult.error) {
          saved = true;
          break;
        }

        console.warn(
          "[Affiliate Dashboard] Referral code RPC failed:",
          attempt.name,
          rpcResult.error
        );
      } catch (error) {
        console.warn(
          "[Affiliate Dashboard] Referral code RPC exception:",
          attempt.name,
          error
        );
      }
    }

    if (!saved) {
      try {
        const updateResult = await supabase
          .from("affiliates")
          .update({
            referral_code: nextCode,
            updated_at: new Date().toISOString()
          })
          .eq("id", this.affiliateProfile.id)
          .select("*")
          .maybeSingle();

        if (!updateResult.error && updateResult.data) {
          saved = true;
          this.affiliateProfile = updateResult.data;
        } else if (updateResult.error) {
          console.error(
            "[Affiliate Dashboard] Direct referral code update failed:",
            updateResult.error
          );
        }
      } catch (error) {
        console.error("[Affiliate Dashboard] Direct referral code update exception:", error);
      }
    }

    if (saved) {
      if (!this.affiliateProfile) {
        await this.loadAffiliateProfile();
      } else {
        this.affiliateProfile.referral_code = nextCode;
      }

      const profileCodeEl = document.getElementById("affiliateDashboardCode");
      if (profileCodeEl) {
        profileCodeEl.textContent = nextCode;
      }

      if (input) {
        input.value = nextCode;
      }

      this.setReferralCodeStatus("Referral code updated.", "success");
      this.generateTrackingLink();
    } else {
      this.setReferralCodeStatus(
        "Could not save the referral code. One of the RPC functions is probably missing in Supabase, or direct table updates are blocked by RLS.",
        "error"
      );
    }

    if (saveBtn) {
      saveBtn.disabled = false;
    }

    return saved;
  }
});
