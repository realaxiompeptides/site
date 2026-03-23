(function () {
  const state = window.AXIOM_ADMIN_AFFILIATES_STATE;
  const utils = window.AXIOM_ADMIN_AFFILIATES_UTILS;
  const domApi = window.AXIOM_ADMIN_AFFILIATES_DOM;
  const renderApi = window.AXIOM_ADMIN_AFFILIATES_RENDER;
  const dataApi = window.AXIOM_ADMIN_AFFILIATES_DATA;

  const actions = {
    dom: null,

    applyFilters: function applyFilters() {
      const dom = this.dom || domApi.get();

      state.setSearch(dom.searchInput ? dom.searchInput.value : "");
      state.setStatus(dom.statusFilter ? dom.statusFilter.value : "all");

      const filtered = utils.filterAffiliates(state.affiliates, state.filters);
      state.setFilteredAffiliates(filtered);
      renderApi.renderTable();
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
        const affiliates = rawAffiliates.map(utils.normalizeAffiliate);

        state.setAffiliates(affiliates);
        state.setSummary(utils.calculateSummary(affiliates));
        this.applyFilters();
        renderApi.renderStats();
      } catch (error) {
        console.error("Failed to load affiliates:", error);
        state.setAffiliates([]);
        state.setFilteredAffiliates([]);
        state.setSummary({ total: 0, pending: 0, approved: 0, claimable: 0 });
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
        alert(error.message || "Failed to update affiliate status.");
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
        renderApi.renderAffiliateDetail(summary, detailData);

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
        alert(error.message || "Failed to update claim request.");
      }
    },

    recordPayout: async function recordPayout() {
      const affiliateId = document.getElementById("affiliatePayoutAffiliateId")?.value || "";
      const amount = Number(document.getElementById("affiliatePayoutAmount")?.value || 0);
      const method = document.getElementById("affiliatePayoutMethod")?.value.trim() || "";
      const reference = document.getElementById("affiliatePayoutReference")?.value.trim() || "";
      const notes = document.getElementById("affiliatePayoutNotes")?.value.trim() || "";

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

        if (this.dom && this.dom.recordPayoutForm) {
          this.dom.recordPayoutForm.reset();
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
        alert(error.message || "Failed to record payout.");
      }
    }
  };

  window.AXIOM_ADMIN_AFFILIATES_ACTIONS = actions;
})();
