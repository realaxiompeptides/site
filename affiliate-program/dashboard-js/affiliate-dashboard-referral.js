Object.assign(window.AXIOM_AFFILIATE_DASHBOARD, {
  async updateOwnReferralCode() {
    const supabase = this.getSupabase();

    if (!supabase) {
      this.setReferralCodeStatus("Supabase is not available.", "error");
      return;
    }

    if (!this.currentUser || !this.currentUser.id) {
      this.setReferralCodeStatus("You must be signed in.", "error");
      return;
    }

    if (!this.affiliateProfile || !this.affiliateProfile.id) {
      this.setReferralCodeStatus("Affiliate profile not found.", "error");
      return;
    }

    const input = this.getReferralCodeInput();
    const saveBtn = this.getReferralCodeSaveButton();

    if (!input) {
      this.setReferralCodeStatus("Referral code input was not found.", "error");
      return;
    }

    const newCode = this.normalizeCode(input.value);
    const currentCode = this.normalizeCode(this.affiliateProfile.referral_code || "");

    if (!newCode) {
      this.setReferralCodeStatus("Enter a referral code.", "error");
      return;
    }

    if (newCode.length < 4) {
      this.setReferralCodeStatus("Code must be at least 4 characters.", "error");
      return;
    }

    if (newCode.length > 12) {
      this.setReferralCodeStatus("Code must be 12 characters or less.", "error");
      return;
    }

    if (!/^[A-Z0-9_-]+$/.test(newCode)) {
      this.setReferralCodeStatus("Use only letters, numbers, hyphens, and underscores.", "error");
      return;
    }

    if (newCode === currentCode) {
      this.setReferralCodeStatus("That is already your current code.", "error");
      return;
    }

    const originalButtonText = saveBtn ? saveBtn.textContent : "";

    try {
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";
      }

      let rpcResult = null;
      let rpcError = null;

      const ownRpcResponse = await supabase.rpc("affiliate_update_own_referral_code", {
        p_new_referral_code: newCode
      });

      if (ownRpcResponse && !ownRpcResponse.error) {
        rpcResult = ownRpcResponse.data || null;
      } else {
        const fallbackResponse = await supabase.rpc("admin_update_affiliate_referral_code", {
          p_affiliate_id: this.affiliateProfile.id,
          p_new_referral_code: newCode
        });

        if (fallbackResponse.error) {
          rpcError = fallbackResponse.error;
        } else {
          rpcResult = fallbackResponse.data || null;
        }
      }

      if (rpcError) {
        throw rpcError;
      }

      await this.loadAffiliateProfile();

      const updatedCode = this.normalizeCode(
        (Array.isArray(rpcResult) && rpcResult[0] && rpcResult[0].referral_code) ||
          (rpcResult && rpcResult.referral_code) ||
          (this.affiliateProfile && this.affiliateProfile.referral_code) ||
          newCode
      );

      if (this.affiliateProfile) {
        this.affiliateProfile.referral_code = updatedCode;
      }

      this.syncReferralCodeUi(updatedCode);
      this.setReferralCodeStatus("Code updated successfully.", "success");
      this.setMessage("Referral / discount code updated successfully.", "success");
    } catch (error) {
      console.error("[Affiliate Dashboard] Update referral code failed:", error);

      const rawMessage = String(error && error.message ? error.message : "Code update failed.");
      let friendlyMessage = rawMessage;

      if (/already taken/i.test(rawMessage)) {
        friendlyMessage = "Code already taken.";
      } else if (/duplicate/i.test(rawMessage)) {
        friendlyMessage = "Code already taken.";
      } else if (/12/i.test(rawMessage) && /character/i.test(rawMessage)) {
        friendlyMessage = "Code must be 12 characters or less.";
      } else if (/at least 4/i.test(rawMessage)) {
        friendlyMessage = "Code must be at least 4 characters.";
      }

      this.setReferralCodeStatus(friendlyMessage, "error");
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = originalButtonText || "Save Code";
      }
    }
  }
});
