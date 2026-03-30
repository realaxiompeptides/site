(function () {
  const state = window.AXIOM_ADMIN_AFFILIATES_STATE;
  const utils = window.AXIOM_ADMIN_AFFILIATES_UTILS;
  const domApi = window.AXIOM_ADMIN_AFFILIATES_DOM;
  const renderApi = window.AXIOM_ADMIN_AFFILIATES_RENDER;
  const dataApi = window.AXIOM_ADMIN_AFFILIATES_DATA;

  function toNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function cleanText(value) {
    return value == null ? "" : String(value).trim();
  }

  function findAffiliateById(affiliateId) {
    return (state.affiliates || []).find(function (item) {
      return String(item.id) === String(affiliateId);
    }) || null;
  }

  function findClaimRequestById(claimId) {
    return (state.payoutRequests || []).find(function (item) {
      return String(item.id) === String(claimId);
    }) || null;
  }

  async function refreshSelectedAffiliateDetails(actionsApi) {
    if (state.selectedAffiliateId) {
      await actionsApi.openAffiliateDetails(state.selectedAffiliateId);
    }
  }

  function getClaimPaymentSummary(claim) {
    const affiliate = claim?.affiliates || claim?.affiliate || {};

    const payoutMethod =
      cleanText(claim?.payout_method) ||
      cleanText(claim?.payoutMethod) ||
      "manual";

    const payoutNetwork =
      cleanText(claim?.payout_network) ||
      cleanText(claim?.payoutNetwork);

    const payoutAddress =
      cleanText(claim?.payout_address) ||
      cleanText(claim?.payoutAddress);

    const payoutContact =
      cleanText(claim?.payout_contact) ||
      cleanText(claim?.payoutContact) ||
      cleanText(claim?.backup_contact) ||
      cleanText(claim?.backupContact);

    const discordContact =
      cleanText(claim?.discord_contact) ||
      cleanText(affiliate?.discord_username);

    const claimNote =
      cleanText(claim?.message) ||
      cleanText(claim?.notes);

    const affiliateName =
      cleanText(affiliate?.full_name) ||
      cleanText(claim?.full_name) ||
      "—";

    const affiliateEmail =
      cleanText(affiliate?.email) ||
      cleanText(claim?.email) ||
      "—";

    const amount = toNumber(claim?.amount, 0);

    const lines = [
      "Affiliate: " + affiliateName,
      affiliateEmail ? "Email: " + affiliateEmail : "",
      "Amount: " + (window.AXIOM_ADMIN_AFFILIATES_UTILS?.formatCurrency
        ? window.AXIOM_ADMIN_AFFILIATES_UTILS.formatCurrency(amount)
        : "$" + amount.toFixed(2)),
      "Payout method: " + payoutMethod,
      payoutNetwork ? "Network: " + payoutNetwork : "",
      payoutAddress ? "Address: " + payoutAddress : "",
      payoutContact ? "Contact: " + payoutContact : "",
      discordContact ? "Discord: " + discordContact : "",
      claimNote ? "Claim note: " + claimNote : ""
    ].filter(Boolean);

    return {
      affiliateName: affiliateName,
      affiliateEmail: affiliateEmail,
      amount: amount,
      payoutMethod: payoutMethod,
      payoutNetwork: payoutNetwork,
      payoutAddress: payoutAddress,
      payoutContact: payoutContact,
      discordContact: discordContact,
      claimNote: claimNote,
      detailsText: lines.join("\n")
    };
  }

  const actions = {
    dom: null,
    pendingPayoutReviewClaimId: null,

    getPayoutReviewModalElements: function getPayoutReviewModalElements() {
      return {
        modal: document.getElementById("affiliatePayoutReviewModal"),
        affiliate: document.getElementById("affiliatePayoutReviewName"),
        email: document.getElementById("affiliatePayoutReviewEmail"),
        discord: document.getElementById("affiliatePayoutReviewDiscord"),
        amount: document.getElementById("affiliatePayoutReviewAmount"),
        method: document.getElementById("affiliatePayoutReviewMethod"),
        network: document.getElementById("affiliatePayoutReviewNetwork"),
        address: document.getElementById("affiliatePayoutReviewAddress"),
        contact: document.getElementById("affiliatePayoutReviewContact"),
        note: document.getElementById("affiliatePayoutReviewClaimNote"),
        txid: document.getElementById("affiliatePayoutReviewTxId"),
        notes: document.getElementById("affiliatePayoutReviewNotes"),
        copyAddressBtn: document.getElementById("affiliatePayoutCopyAddressBtn"),
        confirmBtn: document.getElementById("affiliatePayoutConfirmPaidBtn")
      };
    },

    setAffiliateCompMessage: function setAffiliateCompMessage(message, type) {
      const el = document.getElementById("affiliateCompSettingsMessage");
      if (!el) return;

      const normalized = cleanText(message);

      if (!normalized) {
        el.hidden = true;
        el.textContent = "";
        el.className = "affiliates-admin-inline-message";
        return;
      }

      el.hidden = false;
      el.textContent = normalized;
      el.className =
        "affiliates-admin-inline-message" + (type ? " is-" + type : "");
    },

    setAffiliateNotesMessage: function setAffiliateNotesMessage(message, type) {
      const el = document.getElementById("affiliateNotesMessage");
      if (!el) return;

      const normalized = cleanText(message);

      if (!normalized) {
        el.hidden = true;
        el.textContent = "";
        el.className = "affiliates-admin-inline-message";
        return;
      }

      el.hidden = false;
      el.textContent = normalized;
      el.className =
        "affiliates-admin-inline-message" + (type ? " is-" + type : "");
    },

    applyFilters: function applyFilters() {
      const dom = this.dom || domApi.get();

      state.setSearch(dom.searchInput ? dom.searchInput.value : "");
      state.setStatus(dom.statusFilter ? dom.statusFilter.value : "all");

      const filtered = utils.filterAffiliates(state.affiliates, state.filters);
      state.setFilteredAffiliates(filtered);
      renderApi.renderTable();

      if (typeof renderApi.renderPayoutRequests === "function") {
        renderApi.renderPayoutRequests();
      }

      if (typeof renderApi.renderStats === "function") {
        renderApi.renderStats();
      }
    },

    loadAffiliates: async function loadAffiliates() {
      this.dom = domApi.cache();

      try {
        state.setLoading(true);
        state.setError(null);
        renderApi.renderLoading();

        const rawAffiliates = await dataApi.fetchAffiliates();
        const affiliates = rawAffiliates.map(utils.normalizeAffiliate);

        state.setAffiliates(affiliates);
        state.setSummary(utils.calculateSummary(affiliates));

        if (typeof dataApi.fetchPayoutRequests === "function") {
          try {
            const payoutRequests = await dataApi.fetchPayoutRequests();
            if (typeof state.setPayoutRequests === "function") {
              state.setPayoutRequests(Array.isArray(payoutRequests) ? payoutRequests : []);
            } else {
              state.payoutRequests = Array.isArray(payoutRequests) ? payoutRequests : [];
            }
          } catch (payoutError) {
            console.error("Failed to load payout requests:", payoutError);
            if (typeof state.setPayoutRequests === "function") {
              state.setPayoutRequests([]);
            } else {
              state.payoutRequests = [];
            }
          }
        }

        this.applyFilters();
        renderApi.renderStats();

        if (typeof renderApi.renderPayoutRequests === "function") {
          renderApi.renderPayoutRequests();
        }
      } catch (error) {
        console.error("Failed to load affiliates:", error);
        state.setAffiliates([]);
        state.setFilteredAffiliates([]);
        state.setSummary({ total: 0, pending: 0, approved: 0, claimable: 0 });
        state.setError(error);

        if (typeof state.setPayoutRequests === "function") {
          state.setPayoutRequests([]);
        } else {
          state.payoutRequests = [];
        }

        renderApi.renderStats();
        renderApi.renderError(error && error.message ? error.message : "Unknown error");

        if (typeof renderApi.renderPayoutRequests === "function") {
          renderApi.renderPayoutRequests();
        }
      } finally {
        state.setLoading(false);
      }
    },

    updateStatus: async function updateStatus(affiliateId, status) {
      if (!affiliateId || !status) return;

      try {
        await dataApi.updateAffiliateStatus(affiliateId, status);
        await this.loadAffiliates();

        if (state.selectedAffiliateId && String(state.selectedAffiliateId) === String(affiliateId)) {
          await this.openAffiliateDetails(affiliateId);
        }

        alert("Affiliate " + status + " successfully.");
      } catch (error) {
        console.error("Failed to update affiliate status:", error);
        alert(error.message || "Failed to update affiliate status.");
      }
    },

    openAffiliateDetails: async function openAffiliateDetails(affiliateId) {
      if (!affiliateId) return;

      try {
        const summary = findAffiliateById(affiliateId);
        state.selectedAffiliateId = affiliateId;

        const detailData = await dataApi.fetchAffiliateDetails(affiliateId);
        renderApi.renderAffiliateDetail(summary, detailData);

        const notesInput = document.getElementById("affiliateNotesInput");
        const notesAffiliateId = document.getElementById("affiliateNotesAffiliateId");

        if (notesInput) {
          notesInput.value = cleanText(summary?.notes || "");
        }

        if (notesAffiliateId) {
          notesAffiliateId.value = affiliateId;
        }

        this.setAffiliateNotesMessage("", "");
        this.dom = domApi.cache();

        if (this.dom.modal) {
          this.dom.modal.hidden = false;
          this.dom.modal.style.display = "block";
          this.dom.modal.style.pointerEvents = "auto";
          this.dom.modal.setAttribute("aria-hidden", "false");
          document.body.style.overflow = "hidden";
        }
      } catch (error) {
        console.error("Failed to load affiliate details:", error);
        alert(error.message || "Failed to load affiliate details.");
      }
    },

    closeModal: function closeModal() {
      this.dom = domApi.cache();

      if (this.dom.modal) {
        this.dom.modal.hidden = true;
        this.dom.modal.style.display = "";
        this.dom.modal.style.pointerEvents = "";
        this.dom.modal.setAttribute("aria-hidden", "true");
      }

      document.body.style.overflow = "";
    },

    saveAffiliateCompSettings: async function saveAffiliateCompSettings() {
      const affiliateId =
        cleanText(document.getElementById("affiliateCompSettingsAffiliateId")?.value) || "";
      const commissionType =
        cleanText(document.getElementById("affiliateCommissionType")?.value).toLowerCase() || "percent";
      const commissionValue = toNumber(
        document.getElementById("affiliateCommissionValue")?.value,
        0
      );
      const discountType =
        cleanText(document.getElementById("affiliateDiscountType")?.value).toLowerCase() || "percent";
      const discountValue = toNumber(
        document.getElementById("affiliateDiscountValue")?.value,
        0
      );
      const saveBtn = document.getElementById("saveAffiliateCompSettingsBtn");

      if (!affiliateId) {
        this.setAffiliateCompMessage("Missing affiliate.", "error");
        return;
      }

      if (!["percent", "fixed"].includes(commissionType)) {
        this.setAffiliateCompMessage("Invalid commission type.", "error");
        return;
      }

      if (!["percent", "fixed"].includes(discountType)) {
        this.setAffiliateCompMessage("Invalid discount type.", "error");
        return;
      }

      if (commissionValue < 0 || discountValue < 0) {
        this.setAffiliateCompMessage("Values cannot be negative.", "error");
        return;
      }

      try {
        this.setAffiliateCompMessage("Saving settings...", "");
        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.textContent = "Saving...";
        }

        await dataApi.updateAffiliateCompensation(affiliateId, {
          commission_type: commissionType,
          commission_value: commissionValue,
          discount_type: discountType,
          discount_value: discountValue
        });

        await this.loadAffiliates();
        state.selectedAffiliateId = affiliateId;
        await this.openAffiliateDetails(affiliateId);
        this.setAffiliateCompMessage("Settings saved.", "success");
      } catch (error) {
        console.error("Failed to save affiliate compensation settings:", error);
        this.setAffiliateCompMessage(
          error.message || "Failed to save settings.",
          "error"
        );
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = "Save Settings";
        }
      }
    },

    saveAffiliateNotes: async function saveAffiliateNotes() {
      const affiliateId =
        cleanText(document.getElementById("affiliateNotesAffiliateId")?.value) || "";
      const notes = cleanText(document.getElementById("affiliateNotesInput")?.value || "");
      const saveBtn = document.getElementById("saveAffiliateNotesBtn");

      if (!affiliateId) {
        this.setAffiliateNotesMessage("Missing affiliate.", "error");
        return;
      }

      try {
        this.setAffiliateNotesMessage("Saving notes...", "");
        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.textContent = "Saving...";
        }

        await dataApi.updateAffiliateNotes(affiliateId, notes);

        await this.loadAffiliates();
        state.selectedAffiliateId = affiliateId;
        await this.openAffiliateDetails(affiliateId);
        this.setAffiliateNotesMessage("Notes saved.", "success");
      } catch (error) {
        console.error("Failed to save affiliate notes:", error);
        this.setAffiliateNotesMessage(
          error.message || "Failed to save notes.",
          "error"
        );
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = "Save Notes";
        }
      }
    },

    openPayoutReviewModal: function openPayoutReviewModal(claimId) {
      const claim = findClaimRequestById(claimId);

      if (!claim) {
        throw new Error("Payout request not found.");
      }

      const summary = getClaimPaymentSummary(claim);
      const els = this.getPayoutReviewModalElements();

      this.pendingPayoutReviewClaimId = claimId;

      if (!els.modal) {
        return false;
      }

      if (els.affiliate) els.affiliate.textContent = summary.affiliateName || "—";
      if (els.email) els.email.textContent = summary.affiliateEmail || "—";
      if (els.discord) els.discord.textContent = summary.discordContact || "—";
      if (els.amount) els.amount.textContent = utils.formatCurrency(summary.amount || 0);
      if (els.method) els.method.textContent = summary.payoutMethod || "manual";
      if (els.network) els.network.textContent = summary.payoutNetwork || "—";
      if (els.address) els.address.value = summary.payoutAddress || "";
      if (els.contact) els.contact.textContent = summary.payoutContact || "—";
      if (els.note) els.note.textContent = summary.claimNote || "—";

      if (els.txid) {
        els.txid.value = cleanText(claim?.payout_reference) || "";
      }

      if (els.notes) {
        els.notes.value = summary.detailsText || "";
      }

      if (els.copyAddressBtn) {
        els.copyAddressBtn.disabled = !summary.payoutAddress;
        els.copyAddressBtn.setAttribute("data-copy-value", summary.payoutAddress || "");
      }

      if (els.confirmBtn) {
        els.confirmBtn.disabled = false;
        els.confirmBtn.textContent = "Confirm Mark Paid";
      }

      els.modal.hidden = false;
      els.modal.style.display = "block";
      els.modal.style.pointerEvents = "auto";
      els.modal.setAttribute("aria-hidden", "false");

      return true;
    },

    closePayoutReviewModal: function closePayoutReviewModal() {
      const els = this.getPayoutReviewModalElements();

      this.pendingPayoutReviewClaimId = null;

      if (els.txid) {
        els.txid.value = "";
      }

      if (els.notes) {
        els.notes.value = "";
      }

      if (els.confirmBtn) {
        els.confirmBtn.disabled = false;
        els.confirmBtn.textContent = "Confirm Mark Paid";
      }

      if (els.modal) {
        els.modal.hidden = true;
        els.modal.style.display = "";
        els.modal.style.pointerEvents = "";
        els.modal.setAttribute("aria-hidden", "true");
      }
    },

    copyPayoutAddress: async function copyPayoutAddress() {
      const els = this.getPayoutReviewModalElements();
      const value =
        cleanText(els.copyAddressBtn?.getAttribute("data-copy-value")) ||
        cleanText(els.address?.value);

      if (!value || value === "—") {
        alert("No payout address to copy.");
        return;
      }

      try {
        await navigator.clipboard.writeText(value);

        if (els.copyAddressBtn) {
          const original = els.copyAddressBtn.textContent;
          els.copyAddressBtn.textContent = "Copied";
          setTimeout(function () {
            els.copyAddressBtn.textContent = original || "Copy";
          }, 1200);
        }
      } catch (error) {
        console.error("Failed to copy payout address:", error);
        alert("Failed to copy address.");
      }
    },

    confirmPayoutReviewPaid: async function confirmPayoutReviewPaid() {
      const claimId = this.pendingPayoutReviewClaimId;

      if (!claimId) {
        alert("No payout request selected.");
        return;
      }

      try {
        const claim = findClaimRequestById(claimId);

        if (!claim) {
          throw new Error("Payout request not found.");
        }

        const currentStatus = cleanText(claim.status).toLowerCase();
        if (currentStatus === "paid") {
          alert("This payout request is already marked paid.");
          this.closePayoutReviewModal();
          return;
        }

        const summary = getClaimPaymentSummary(claim);
        const els = this.getPayoutReviewModalElements();

        const payoutMethod =
          cleanText(els.method?.textContent) ||
          summary.payoutMethod ||
          "manual";

        const payoutReference =
          cleanText(els.txid?.value) ||
          summary.payoutAddress ||
          null;

        const payoutNotes =
          cleanText(els.notes?.value) ||
          summary.detailsText ||
          null;

        if (!window.confirm("Confirm mark paid and save payout history?")) {
          return;
        }

        if (els.confirmBtn) {
          els.confirmBtn.disabled = true;
          els.confirmBtn.textContent = "Saving...";
        }

        await dataApi.markClaimPaid(claimId, {
          method: payoutMethod,
          reference: payoutReference,
          notes: payoutNotes
        });

        this.closePayoutReviewModal();
        await this.loadAffiliates();
        await refreshSelectedAffiliateDetails(this);

        alert("Payout request marked paid and payout history recorded.");
      } catch (error) {
        console.error("Failed to confirm payout review:", error);
        alert(error.message || "Failed to mark payout request paid.");
      } finally {
        const els = this.getPayoutReviewModalElements();
        if (els.confirmBtn) {
          els.confirmBtn.disabled = false;
          els.confirmBtn.textContent = "Confirm Mark Paid";
        }
      }
    },

    updateClaimStatus: async function updateClaimStatus(claimId, status) {
      if (!claimId || !status) return;

      try {
        await dataApi.updateClaimStatus(claimId, status);
        await this.loadAffiliates();
        await refreshSelectedAffiliateDetails(this);

        alert("Claim " + status + " successfully.");
      } catch (error) {
        console.error("Failed to update claim request:", error);
        alert(error.message || "Failed to update claim request.");
      }
    },

    approvePayoutRequest: async function approvePayoutRequest(claimId) {
      if (!claimId) return;

      try {
        await dataApi.updateClaimStatus(claimId, "approved");
        await this.loadAffiliates();
        await refreshSelectedAffiliateDetails(this);

        alert("Payout request approved.");
      } catch (error) {
        console.error("Failed to approve payout request:", error);
        alert(error.message || "Failed to approve payout request.");
      }
    },

    rejectPayoutRequest: async function rejectPayoutRequest(claimId) {
      if (!claimId) return;

      try {
        await dataApi.updateClaimStatus(claimId, "rejected");
        await this.loadAffiliates();
        await refreshSelectedAffiliateDetails(this);

        alert("Payout request rejected.");
      } catch (error) {
        console.error("Failed to reject payout request:", error);
        alert(error.message || "Failed to reject payout request.");
      }
    },

    denyPayoutRequest: async function denyPayoutRequest(claimId) {
      await this.rejectPayoutRequest(claimId);
    },

    markPayoutRequestPaid: async function markPayoutRequestPaid(claimId) {
      if (!claimId) return;

      try {
        const claim = findClaimRequestById(claimId);

        if (!claim) {
          throw new Error("Payout request not found.");
        }

        const currentStatus = cleanText(claim.status).toLowerCase();
        if (currentStatus === "paid") {
          alert("This payout request is already marked paid.");
          return;
        }

        const modalOpened = this.openPayoutReviewModal(claimId);

        if (modalOpened) {
          return;
        }

        const paymentSummary = getClaimPaymentSummary(claim);

        const confirmed = window.confirm(
          "Mark this payout request as paid?\n\n" +
          paymentSummary.detailsText +
          "\n\nAfter you confirm, the payout will be saved."
        );

        if (!confirmed) {
          return;
        }

        const customMethod = window.prompt(
          "Payment method used:",
          paymentSummary.payoutMethod || "manual"
        );
        if (customMethod === null) return;

        const customReference = window.prompt(
          "Transaction hash / reference / wallet sent to:",
          paymentSummary.payoutAddress || ""
        );
        if (customReference === null) return;

        const customNotes = window.prompt(
          "Optional admin payout notes:",
          paymentSummary.detailsText || ""
        );
        if (customNotes === null) return;

        await dataApi.markClaimPaid(claimId, {
          method: cleanText(customMethod) || paymentSummary.payoutMethod || "manual",
          reference: cleanText(customReference) || null,
          notes: cleanText(customNotes) || paymentSummary.detailsText || null
        });

        await this.loadAffiliates();
        await refreshSelectedAffiliateDetails(this);

        alert("Payout request marked paid and payout history recorded.");
      } catch (error) {
        console.error("Failed to mark payout request paid:", error);
        alert(error.message || "Failed to mark payout request paid.");
      }
    },

    markPayoutRequestUnpaid: async function markPayoutRequestUnpaid(claimId) {
      if (!claimId) return;

      try {
        const claim = findClaimRequestById(claimId);

        if (!claim) {
          throw new Error("Payout request not found.");
        }

        const currentStatus = cleanText(claim.status).toLowerCase();
        if (currentStatus !== "paid") {
          throw new Error("Only paid claim requests can be changed back.");
        }

        const confirmed = window.confirm(
          "Mark this payout request as unpaid?\n\n" +
          "This will change the claim back to approved and cancel the matching payout history row."
        );

        if (!confirmed) {
          return;
        }

        await dataApi.markClaimUnpaid(claimId);

        await this.loadAffiliates();
        await refreshSelectedAffiliateDetails(this);

        alert("Payout request moved back to approved.");
      } catch (error) {
        console.error("Failed to mark payout request unpaid:", error);
        alert(error.message || "Failed to mark payout request unpaid.");
      }
    },

    recordPayout: async function recordPayout() {
      const affiliateId = document.getElementById("affiliatePayoutAffiliateId")?.value || "";
      const amount = toNumber(document.getElementById("affiliatePayoutAmount")?.value, 0);
      const method = cleanText(document.getElementById("affiliatePayoutMethod")?.value || "");
      const reference = cleanText(document.getElementById("affiliatePayoutReference")?.value || "");
      const notes = cleanText(document.getElementById("affiliatePayoutNotes")?.value || "");

      if (!affiliateId) {
        alert("Missing affiliate.");
        return;
      }

      if (!amount || amount <= 0) {
        alert("Enter a valid payout amount.");
        return;
      }

      const affiliate = findAffiliateById(affiliateId);
      const claimableAmount = toNumber(
        affiliate?.availableToClaim !== undefined ? affiliate.availableToClaim : affiliate?.claimable,
        0
      );

      if (claimableAmount <= 0) {
        alert("This affiliate has no claimable balance.");
        return;
      }

      if (amount > claimableAmount) {
        alert("Payout amount cannot be greater than the affiliate's current available claimable balance.");
        return;
      }

      try {
        await dataApi.recordPayout({
          affiliateId: affiliateId,
          amount: amount,
          method: method,
          reference: reference,
          notes: notes
        });

        if (this.dom && this.dom.recordPayoutForm) {
          this.dom.recordPayoutForm.reset();
        }

        const payoutAffiliateId = document.getElementById("affiliatePayoutAffiliateId");
        if (payoutAffiliateId) {
          payoutAffiliateId.value = affiliateId;
        }

        await this.loadAffiliates();
        await refreshSelectedAffiliateDetails(this);

        alert("Payout recorded successfully.");
      } catch (error) {
        console.error("Failed to record payout:", error);
        alert(error.message || "Failed to record payout.");
      }
    },

    submitAffiliateClaimReview: async function submitAffiliateClaimReview(claimId, nextStatus) {
      if (!claimId || !nextStatus) return;

      try {
        if (nextStatus === "approved") {
          const claim = findClaimRequestById(claimId);
          const currentStatus = cleanText(claim?.status).toLowerCase();

          if (currentStatus === "paid") {
            await this.markPayoutRequestUnpaid(claimId);
            return;
          }

          await this.approvePayoutRequest(claimId);
          return;
        }

        if (nextStatus === "rejected" || nextStatus === "denied") {
          await this.rejectPayoutRequest(claimId);
          return;
        }

        if (nextStatus === "paid") {
          await this.markPayoutRequestPaid(claimId);
          return;
        }

        throw new Error("Unsupported payout request status.");
      } catch (error) {
        console.error("Failed to review payout request:", error);
        alert(error.message || "Failed to review payout request.");
      }
    }
  };

  window.AXIOM_ADMIN_AFFILIATES_ACTIONS = actions;
})();
