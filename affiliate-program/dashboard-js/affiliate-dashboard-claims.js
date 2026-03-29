Object.assign(window.AXIOM_AFFILIATE_DASHBOARD, {
  bindClaimEvents() {
    const form = document.getElementById("affiliateClaimForm");
    const button = document.getElementById("submitAffiliateClaimBtn");

    if (form && !form.dataset.bound) {
      form.dataset.bound = "true";
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await this.submitClaim();
      });
    }

    if (button && !button.dataset.boundDirect) {
      button.dataset.boundDirect = "true";
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await this.submitClaim();
      });
    }
  },

  setClaimMessage(message, type) {
    const el =
      document.getElementById("affiliateClaimMessage") ||
      document.getElementById("affiliateClaimStatus") ||
      document.getElementById("affiliateClaimsMessage");

    if (!el) {
      this.setMessage(message, type);
      return;
    }

    const normalized = typeof message === "string" ? message.trim() : "";

    if (!normalized) {
      el.hidden = true;
      el.textContent = "";
      el.className = "affiliate-inline-message";
      return;
    }

    el.hidden = false;
    el.textContent = normalized;
    el.className = "affiliate-inline-message" + (type ? " is-" + type : "");
  },

  async submitClaim() {
    const supabase = this.getSupabase();

    if (!this.affiliateProfile || !this.affiliateProfile.id || !supabase) {
      this.setClaimMessage("Unable to submit claim right now.", "error");
      return false;
    }

    const amountInput = document.getElementById("affiliateClaimAmount");
    const noteInput = document.getElementById("affiliateClaimNote");
    const payoutMethodInput = this.getClaimPayoutMethodInput();
    const payoutNetworkInput = this.getClaimPayoutNetworkInput();
    const payoutAddressInput = this.getClaimPayoutAddressInput();
    const payoutContactInput = this.getClaimPayoutContactInput();
    const claimButton = document.getElementById("submitAffiliateClaimBtn");

    const rawAmount = amountInput ? String(amountInput.value || "").trim() : "";
    const amount = Number(rawAmount);

    const availableEl = document.getElementById("affiliateClaimAvailableAmount");
    const availableAmount = availableEl
      ? Number(String(availableEl.textContent || "").replace(/[^0-9.-]/g, "") || 0)
      : 0;

    if (!rawAmount || !Number.isFinite(amount) || amount <= 0) {
      this.setClaimMessage("Enter a valid claim amount.", "error");
      return false;
    }

    if (availableAmount > 0 && amount > availableAmount) {
      this.setClaimMessage("Claim amount exceeds available balance.", "error");
      return false;
    }

    const payoutMethod = payoutMethodInput ? String(payoutMethodInput.value || "").trim() : "";
    const payoutNetwork = payoutNetworkInput ? String(payoutNetworkInput.value || "").trim() : "";
    const payoutAddress = payoutAddressInput ? String(payoutAddressInput.value || "").trim() : "";
    const payoutContact = payoutContactInput ? String(payoutContactInput.value || "").trim() : "";

    if (!payoutMethod) {
      this.setClaimMessage("Select a payout method.", "error");
      return false;
    }

    if (payoutMethod.toLowerCase() === "crypto" && !payoutNetwork) {
      this.setClaimMessage("Enter the payout network.", "error");
      return false;
    }

    if (!payoutAddress) {
      this.setClaimMessage("Enter your payout address.", "error");
      return false;
    }

    if (claimButton) {
      claimButton.disabled = true;
      claimButton.textContent = "Submitting...";
    }

    this.setClaimMessage("Submitting claim...", "");

    try {
      const payload = {
        affiliate_id: this.affiliateProfile.id,
        amount: amount,
        message: noteInput ? String(noteInput.value || "").trim() : null,
        payout_method: payoutMethod || null,
        payout_network: payoutNetwork || null,
        payout_address: payoutAddress || null,
        payout_contact: payoutContact || null
      };

      const { error, data } = await supabase
        .from("affiliate_claim_requests")
        .insert(payload)
        .select("*")
        .maybeSingle();

      if (error) {
        throw error;
      }

      console.log("[Affiliate Dashboard] Claim submitted:", data);

      this.setClaimMessage("Claim request submitted.", "success");

      if (noteInput) noteInput.value = "";
      if (payoutNetworkInput) payoutNetworkInput.value = "";
      if (payoutAddressInput) payoutAddressInput.value = "";
      if (payoutContactInput) payoutContactInput.value = "";

      if (amountInput) {
        amountInput.value = "";
      }

      await this.renderDashboard();
      return true;
    } catch (error) {
      console.error("[Affiliate Dashboard] submitClaim failed:", error);

      if (
        error &&
        typeof error.message === "string" &&
        error.message.toLowerCase().includes("row-level security")
      ) {
        this.setClaimMessage(
          "Claim insert is blocked by Supabase RLS for affiliate_claim_requests.",
          "error"
        );
      } else {
        this.setClaimMessage(error.message || "Unable to submit claim.", "error");
      }

      return false;
    } finally {
      if (claimButton) {
        claimButton.disabled = false;
        claimButton.textContent = "Submit Claim";
      }
    }
  }
});
