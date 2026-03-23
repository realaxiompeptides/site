(function () {
  const state = window.AXIOM_ADMIN_AFFILIATES_STATE;
  const utils = window.AXIOM_ADMIN_AFFILIATES_UTILS;
  const domApi = window.AXIOM_ADMIN_AFFILIATES_DOM;
  const renderApi = window.AXIOM_ADMIN_AFFILIATES_RENDER;
  const dataApi = window.AXIOM_ADMIN_AFFILIATES_DATA;

  const actions = {
    dom: null,

    applyFilters: function applyFilters() {
      const dom = this.dom || domApi.cache();

      state.setSearch(dom.searchInput ? dom.searchInput.value : "");
      state.setStatus(dom.statusFilter ? dom.statusFilter.value : "all");

      const filtered = utils.filterAffiliates(state.affiliates, state.filters);
      state.setFilteredAffiliates(filtered);

      renderApi.renderTable();
      renderApi.renderStats();
    },

    loadAffiliates: async function loadAffiliates() {
      this.dom = domApi.cache();

      if (!this.dom.tableBody) {
        console.warn("Affiliate admin table body not found.");
        return;
      }

      try {
        state.setLoading(true);
        state.setError(null);

        renderApi.renderLoading();

        const rawAffiliates = await dataApi.fetchAffiliates();
        const affiliates = Array.isArray(rawAffiliates)
          ? rawAffiliates.map(utils.normalizeAffiliate)
          : [];

        state.setAffiliates(affiliates);
        state.setSummary(utils.calculateSummary(affiliates));

        this.applyFilters();
      } catch (error) {
        console.error("Failed to load affiliates:", error);

        state.setAffiliates([]);
        state.setFilteredAffiliates([]);
        state.setSummary({
          total: 0,
          pending: 0,
          approved: 0,
          claimable: 0
        });
        state.setError(error);

        renderApi.renderStats();
        renderApi.renderError(error && error.message ? error.message : "Unknown error");
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
        alert(error && error.message ? error.message : "Failed to update affiliate status.");
      }
    },

    openAffiliateDetails: async function openAffiliateDetails(affiliateId) {
      if (!affiliateId) return;

      try {
        const summary =
          state.affiliates.find(function (item) {
            return String(item.id) === String(affiliateId);
          }) || null;

        state.selectedAffiliateId = affiliateId;

        const detailData = await dataApi.fetchAffiliateDetails(affiliateId);
        renderApi.renderAffiliateDetail(summary, detailData || { conversions: [], claims: [], payouts: [] });

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
        alert(error && error.message ? error.message : "Failed to load affiliate details.");
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

    updateClaimStatus: async function updateClaimStatus(claimId, status) {
      if (!claimId || !status) return;

      try {
        await dataApi.updateClaimStatus(claimId, status);
        await this.loadAffiliates();

        if (state.selectedAffiliateId) {
          await this.openAffiliateDetails(state.selectedAffiliateId);
        }

        alert("Claim " + status + " successfully.");
      } catch (error) {
        console.error("Failed to update claim request:", error);
        alert(error && error.message ? error.message : "Failed to update claim request.");
      }
    },

    recordPayout: async function recordPayout() {
      const affiliateId =
        (document.getElementById("affiliatePayoutAffiliateId") || {}).value || "";

      const amount = Number(
        ((document.getElementById("affiliatePayoutAmount") || {}).value || 0)
      );

      const payoutMethodEl = document.getElementById("affiliatePayoutMethod");
      const payoutReferenceEl = document.getElementById("affiliatePayoutReference");
      const payoutNotesEl = document.getElementById("affiliatePayoutNotes");

      const method = payoutMethodEl ? String(payoutMethodEl.value || "").trim() : "";
      const reference = payoutReferenceEl ? String(payoutReferenceEl.value || "").trim() : "";
      const notes = payoutNotesEl ? String(payoutNotesEl.value || "").trim() : "";

      if (!affiliateId) {
        alert("Missing affiliate.");
        return;
      }

      if (!amount || amount <= 0) {
        alert("Enter a valid payout amount.");
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

        this.dom = domApi.cache();

        if (this.dom && this.dom.recordPayoutForm) {
          this.dom.recordPayoutForm.reset();
        } else {
          const form = document.getElementById("affiliateRecordPayoutForm");
          if (form) form.reset();
        }

        const payoutAffiliateId = document.getElementById("affiliatePayoutAffiliateId");
        if (payoutAffiliateId) {
          payoutAffiliateId.value = affiliateId;
        }

        await this.loadAffiliates();

        if (state.selectedAffiliateId) {
          await this.openAffiliateDetails(state.selectedAffiliateId);
        }

        alert("Payout recorded successfully.");
      } catch (error) {
        console.error("Failed to record payout:", error);
        alert(error && error.message ? error.message : "Failed to record payout.");
      }
    }
  };

  window.AXIOM_ADMIN_AFFILIATES_ACTIONS = actions;
})();
