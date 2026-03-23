(function () {
  const state = window.AXIOM_ADMIN_AFFILIATES_STATE;
  const domApi = window.AXIOM_ADMIN_AFFILIATES_DOM;
  const dataApi = window.AXIOM_ADMIN_AFFILIATES_DATA;
  const renderApi = window.AXIOM_ADMIN_AFFILIATES_RENDER;

  window.AXIOM_ADMIN_AFFILIATES_ACTIONS = {
    async loadAffiliates() {
      const dom = this.dom || domApi.cache();
      this.dom = dom;

      try {
        await dataApi.loadAffiliates(dom, state);
        renderApi.applyFilters(dom, state);
        renderApi.renderStats(dom, state);
        renderApi.renderTable(dom, state);
      } catch (error) {
        console.error("Failed to load affiliates:", error);
        if (dom.tableBody) {
          dom.tableBody.innerHTML = `<tr><td colspan="10">Failed to load affiliates.</td></tr>`;
        }
      }
    },

    async updateStatus(affiliateId, status) {
      if (!affiliateId || !status) return;

      try {
        await dataApi.updateStatus(affiliateId, status);
        await this.loadAffiliates();

        if (state.selectedAffiliate && state.selectedAffiliate.id === affiliateId) {
          await this.openAffiliateDetails(affiliateId);
        }
      } catch (error) {
        console.error("Failed to update affiliate status:", error);
        alert(error.message || "Failed to update affiliate status.");
      }
    },

    async openAffiliateDetails(affiliateId) {
      const dom = this.dom || domApi.cache();
      this.dom = dom;

      try {
        const detailData = await dataApi.openAffiliateDetails(affiliateId, state);
        renderApi.renderAffiliateDetail(detailData);

        if (dom.modal) {
          dom.modal.hidden = false;
          document.body.style.overflow = "hidden";
        }
      } catch (error) {
        console.error("Failed to load affiliate details:", error);
        alert(error.message || "Failed to load affiliate details.");
      }
    },

    closeModal() {
      const dom = this.dom || domApi.cache();
      this.dom = dom;

      if (dom.modal) {
        dom.modal.hidden = true;
      }

      document.body.style.overflow = "";
    },

    async updateClaimStatus(claimId, status) {
      try {
        await dataApi.updateClaimStatus(claimId, status);
        await this.loadAffiliates();

        if (state.selectedAffiliate?.id) {
          await this.openAffiliateDetails(state.selectedAffiliate.id);
        }
      } catch (error) {
        console.error("Failed to update claim request:", error);
        alert(error.message || "Failed to update claim request.");
      }
    },

    async recordPayout() {
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
          affiliateId,
          amount,
          method,
          reference,
          notes
        });

        const dom = this.dom || domApi.cache();
        this.dom = dom;

        if (dom.recordPayoutForm) {
          dom.recordPayoutForm.reset();
        }

        const payoutAffiliateId = document.getElementById("affiliatePayoutAffiliateId");
        if (payoutAffiliateId) {
          payoutAffiliateId.value = affiliateId;
        }

        await this.loadAffiliates();

        if (state.selectedAffiliate?.id) {
          await this.openAffiliateDetails(state.selectedAffiliate.id);
        }
      } catch (error) {
        console.error("Failed to record payout:", error);
        alert(error.message || "Failed to record payout.");
      }
    }
  };
})();
