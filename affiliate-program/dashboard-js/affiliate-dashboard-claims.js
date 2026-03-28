Object.assign(window.AXIOM_AFFILIATE_DASHBOARD, {
  async submitClaimRequest(payload) {
    const supabase = this.getSupabase();

    if (!supabase) {
      throw new Error("Supabase is not available.");
    }

    const affiliateId = this.getSafeAffiliateId();
    if (!affiliateId) {
      throw new Error("Affiliate profile not found.");
    }

    const amount = this.toNumber(payload && payload.amount, 0);
    const note = payload && payload.note ? String(payload.note).trim() : "";
    const payoutMethod = payload && payload.payoutMethod ? String(payload.payoutMethod).trim() : "";
    const payoutNetwork = payload && payload.payoutNetwork ? String(payload.payoutNetwork).trim() : "";
    const payoutAddress = payload && payload.payoutAddress ? String(payload.payoutAddress).trim() : "";
    const backupContact = payload && payload.backupContact ? String(payload.backupContact).trim() : "";

    if (!amount || amount <= 0) {
      throw new Error("Enter a valid claim amount.");
    }

    try {
      const rpcResponseExtended = await supabase.rpc("affiliate_submit_claim_request", {
        p_amount: amount,
        p_message: note || null,
        p_payout_method: payoutMethod || null,
        p_payout_network: payoutNetwork || null,
        p_payout_address: payoutAddress || null,
        p_payout_contact: backupContact || null
      });

      if (!rpcResponseExtended.error) {
        return true;
      }

      console.error(
        "[Affiliate Dashboard] Extended claim RPC failed, trying base RPC:",
        rpcResponseExtended.error
      );
    } catch (error) {
      console.error("[Affiliate Dashboard] Extended claim RPC exception:", error);
    }

    try {
      const rpcResponseBase = await supabase.rpc("affiliate_submit_claim_request", {
        p_amount: amount,
        p_message: note || null
      });

      if (!rpcResponseBase.error) {
        try {
          const latestClaimResult = await supabase
            .from("affiliate_claim_requests")
            .select("id")
            .eq("affiliate_id", affiliateId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!latestClaimResult.error && latestClaimResult.data && latestClaimResult.data.id) {
            await supabase
              .from("affiliate_claim_requests")
              .update({
                payout_method: payoutMethod || null,
                payout_network: payoutNetwork || null,
                payout_address: payoutAddress || null,
                payout_contact: backupContact || null,
                updated_at: new Date().toISOString()
              })
              .eq("id", latestClaimResult.data.id);
          }
        } catch (patchError) {
          console.error("[Affiliate Dashboard] Claim payout patch failed:", patchError);
        }

        return true;
      }

      console.error(
        "[Affiliate Dashboard] Base claim RPC failed, trying direct insert:",
        rpcResponseBase.error
      );
    } catch (error) {
      console.error("[Affiliate Dashboard] Base claim RPC exception:", error);
    }

    try {
      const insertExtended = await supabase
        .from("affiliate_claim_requests")
        .insert({
          affiliate_id: affiliateId,
          amount: amount,
          message: note || null,
          discord_contact: this.getSafeDiscordContact() || null,
          payout_method: payoutMethod || null,
          payout_network: payoutNetwork || null,
          payout_address: payoutAddress || null,
          payout_contact: backupContact || null,
          status: "pending"
        });

      if (!insertExtended.error) {
        return true;
      }

      console.error(
        "[Affiliate Dashboard] Extended direct insert failed, trying plain insert:",
        insertExtended.error
      );
    } catch (error) {
      console.error("[Affiliate Dashboard] Extended direct insert exception:", error);
    }

    const insertPlain = await supabase
      .from("affiliate_claim_requests")
      .insert({
        affiliate_id: affiliateId,
        amount: amount,
        message: note || null,
        discord_contact: this.getSafeDiscordContact() || null,
        status: "pending"
      });

    if (insertPlain.error) {
      throw insertPlain.error;
    }

    return true;
  },

  async submitClaim() {
    if (!this.affiliateProfile || !this.affiliateProfile.id) return;

    const amountInput = this.getClaimAmountInput();
    const noteInput = this.getClaimNoteInput();

    const amount = this.toNumber(amountInput ? amountInput.value : 0, 0);
    const note = noteInput ? noteInput.value.trim() : "";

    if (!amount || amount <= 0) {
      this.setMessage("Enter a valid claim amount.", "error");
      return;
    }

    const payoutValidationError = this.validateClaimPayoutDetails();
    if (payoutValidationError) {
      this.setMessage(payoutValidationError, "error");
      return;
    }

    try {
      this.setClaimButtonState("loading");

      const stats = await this.fetchStats();
      const maxClaimable = this.toNumber(stats.availableToClaim, 0);

      if (maxClaimable <= 0) {
        this.setMessage("You do not have any claimable balance available right now.", "error");
        return;
      }

      if (amount > maxClaimable) {
        this.setMessage(
          "You can only claim up to " + this.formatMoney(maxClaimable) + " right now.",
          "error"
        );
        if (amountInput) {
          amountInput.value = maxClaimable.toFixed(2);
        }
        return;
      }

      const payoutDetails = this.getClaimPayoutDetails();

      await this.submitClaimRequest({
        amount: amount,
        note: note,
        payoutMethod: payoutDetails.payoutMethod,
        payoutNetwork: payoutDetails.payoutNetwork,
        payoutAddress: payoutDetails.payoutAddress,
        backupContact: payoutDetails.backupContact
      });

      this.setMessage(
        "Claim request submitted successfully. It is now waiting in the admin dashboard for review.",
        "success"
      );

      if (amountInput) amountInput.value = "";
      if (noteInput) noteInput.value = "";
      if (this.getClaimPayoutMethodInput()) this.getClaimPayoutMethodInput().value = "";
      if (this.getClaimPayoutNetworkInput()) this.getClaimPayoutNetworkInput().value = "";
      if (this.getClaimPayoutAddressInput()) this.getClaimPayoutAddressInput().value = "";
      if (this.getClaimBackupContactInput()) this.getClaimBackupContactInput().value = "";

      await this.loadAffiliateProfile();
      await this.renderDashboard();
    } catch (error) {
      console.error("[Affiliate Dashboard] Submit claim failed:", error);

      const rawMessage = String(error && error.message ? error.message : "Claim request failed.");
      let friendlyMessage = rawMessage;

      if (/only claim up to/i.test(rawMessage) || /exceeds available balance/i.test(rawMessage)) {
        friendlyMessage = "You can only submit up to your currently available claimable balance.";
      } else if (/not approved/i.test(rawMessage)) {
        friendlyMessage = "Your affiliate account must be approved before you can submit claims.";
      } else if (/signed in/i.test(rawMessage)) {
        friendlyMessage = "You must be signed in to submit a claim.";
      }

      this.setMessage(friendlyMessage, "error");
    } finally {
      const refreshedStats = await this.fetchStats();
      if (this.toNumber(refreshedStats.availableToClaim, 0) <= 0) {
        this.setClaimButtonState("disabled");
      } else {
        this.setClaimButtonState("ready");
      }
    }
  }
});
