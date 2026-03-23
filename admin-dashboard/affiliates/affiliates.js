window.AXIOM_ADMIN_AFFILIATES = {
  affiliates: [],
  filteredAffiliates: [],
  selectedAffiliate: null,
  isInitialized: false,

  async init() {
    this.cacheDom();

    if (!this.tableBody) {
      console.warn("Affiliate admin table body not found yet.");
      return;
    }

    if (!this.isInitialized) {
      this.bindEvents();
      this.isInitialized = true;
    }

    await this.loadAffiliates();
  },

  cacheDom() {
    this.tableBody = document.getElementById("affiliatesAdminTableBody");
    this.searchInput = document.getElementById("affiliateSearchInput");
    this.statusFilter = document.getElementById("affiliateStatusFilter");
    this.refreshBtn = document.getElementById("refreshAffiliatesBtn");
    this.refreshTopBtn = document.getElementById("refreshAffiliatesBtnTop");
    this.refreshSidebarBtn = document.getElementById("refreshAffiliatesSidebarBtn");

    this.statTotal = document.getElementById("affiliateStatTotal");
    this.statPending = document.getElementById("affiliateStatPending");
    this.statApproved = document.getElementById("affiliateStatApproved");
    this.statClaimable = document.getElementById("affiliateStatClaimable");

    this.modal = document.getElementById("affiliateDetailModal");
    this.closeModalBtn = document.getElementById("closeAffiliateDetailModal");

    this.recordPayoutForm = document.getElementById("affiliateRecordPayoutForm");
  },

  bindEvents() {
    if (this.refreshBtn && !this.refreshBtn.dataset.bound) {
      this.refreshBtn.dataset.bound = "true";
      this.refreshBtn.addEventListener("click", async () => {
        await this.loadAffiliates();
      });
    }

    if (this.refreshTopBtn && !this.refreshTopBtn.dataset.bound) {
      this.refreshTopBtn.dataset.bound = "true";
      this.refreshTopBtn.addEventListener("click", async () => {
        await this.loadAffiliates();
      });
    }

    if (this.refreshSidebarBtn && !this.refreshSidebarBtn.dataset.bound) {
      this.refreshSidebarBtn.dataset.bound = "true";
      this.refreshSidebarBtn.addEventListener("click", async () => {
        await this.loadAffiliates();
      });
    }

    if (this.searchInput && !this.searchInput.dataset.bound) {
      this.searchInput.dataset.bound = "true";
      this.searchInput.addEventListener("input", () => {
        this.applyFilters();
      });
    }

    if (this.statusFilter && !this.statusFilter.dataset.bound) {
      this.statusFilter.dataset.bound = "true";
      this.statusFilter.addEventListener("change", () => {
        this.applyFilters();
      });
    }

    if (this.closeModalBtn && !this.closeModalBtn.dataset.bound) {
      this.closeModalBtn.dataset.bound = "true";
      this.closeModalBtn.addEventListener("click", () => {
        this.closeModal();
      });
    }

    if (this.recordPayoutForm && !this.recordPayoutForm.dataset.bound) {
      this.recordPayoutForm.dataset.bound = "true";
      this.recordPayoutForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        await this.recordPayout();
      });
    }

    if (!document.body.dataset.affiliateAdminDelegated) {
      document.body.dataset.affiliateAdminDelegated = "true";

      document.addEventListener("click", async (event) => {
        const approveBtn = event.target.closest("[data-affiliate-approve]");
        const rejectBtn = event.target.closest("[data-affiliate-reject]");
        const suspendBtn = event.target.closest("[data-affiliate-suspend]");
        const viewBtn = event.target.closest("[data-affiliate-view]");
        const claimStatusBtn = event.target.closest("[data-claim-status]");
        const modalClose = event.target.closest("[data-affiliate-modal-close]");

        if (approveBtn) {
          await this.updateStatus(approveBtn.getAttribute("data-affiliate-approve"), "approved");
          return;
        }

        if (rejectBtn) {
          await this.updateStatus(rejectBtn.getAttribute("data-affiliate-reject"), "rejected");
          return;
        }

        if (suspendBtn) {
          await this.updateStatus(suspendBtn.getAttribute("data-affiliate-suspend"), "suspended");
          return;
        }

        if (viewBtn) {
          const affiliateId = viewBtn.getAttribute("data-affiliate-view");
          await this.openAffiliateDetails(affiliateId);
          return;
        }

        if (claimStatusBtn) {
          const claimId = claimStatusBtn.getAttribute("data-claim-id");
          const status = claimStatusBtn.getAttribute("data-claim-status");
          await this.updateClaimStatus(claimId, status);
          return;
        }

        if (modalClose) {
          this.closeModal();
        }
      });
    }
  },

  async loadAffiliates() {
    this.cacheDom();

    if (!window.axiomSupabase || !this.tableBody) return;

    try {
      this.tableBody.innerHTML = `<tr><td colspan="10">Loading affiliates...</td></tr>`;

      const { data, error } = await window.axiomSupabase
        .from("affiliate_admin_summary")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      this.affiliates = Array.isArray(data) ? data : [];
      this.applyFilters();
      this.renderStats();
    } catch (error) {
      console.error("Failed to load affiliates:", error);

      this.affiliates = [];
      this.filteredAffiliates = [];
      this.renderStats();

      if (this.tableBody) {
        this.tableBody.innerHTML = `
          <tr>
            <td colspan="10">Failed to load affiliates: ${this.escapeHtml(error.message || "Unknown error")}</td>
          </tr>
        `;
      }
    }
  },

  applyFilters() {
    const query = String(this.searchInput?.value || "").trim().toLowerCase();
    const status = String(this.statusFilter?.value || "all").trim().toLowerCase();

    this.filteredAffiliates = this.affiliates.filter((item) => {
      const matchesStatus =
        status === "all" ? true : String(item.status || "").toLowerCase() === status;

      const haystack = [
        item.full_name,
        item.email,
        item.discord_username,
        item.referral_code
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || haystack.includes(query);

      return matchesStatus && matchesSearch;
    });

    this.renderTable();
  },

  renderStats() {
    const total = this.affiliates.length;
    const pending = this.affiliates.filter((item) => item.status === "pending").length;
    const approved = this.affiliates.filter((item) => item.status === "approved").length;
    const claimable = this.affiliates.reduce(
      (sum, item) => sum + Number(item.claimable_commission || 0),
      0
    );

    if (this.statTotal) this.statTotal.textContent = String(total);
    if (this.statPending) this.statPending.textContent = String(pending);
    if (this.statApproved) this.statApproved.textContent = String(approved);
    if (this.statClaimable) this.statClaimable.textContent = this.formatMoney(claimable);
  },

  renderTable() {
    if (!this.tableBody) return;

    if (!this.filteredAffiliates.length) {
      this.tableBody.innerHTML = `<tr><td colspan="10">No affiliates found.</td></tr>`;
      return;
    }

    this.tableBody.innerHTML = this.filteredAffiliates.map((item) => {
      const statusClass = `affiliate-admin-status-${this.escapeHtml(item.status || "pending")}`;

      return `
        <tr>
          <td>${this.escapeHtml(item.full_name || "—")}</td>
          <td>${this.escapeHtml(item.email || "—")}</td>
          <td>${this.escapeHtml(item.discord_username || "—")}</td>
          <td>
            <span class="affiliate-admin-status ${statusClass}">
              ${this.escapeHtml(item.status || "pending")}
            </span>
          </td>
          <td>${this.escapeHtml(item.referral_code || "—")}</td>
          <td>${Number(item.total_clicks_live || item.total_clicks || 0)}</td>
          <td>${Number(item.total_conversions_live || item.total_conversions || 0)}</td>
          <td>${this.formatMoney(item.claimable_commission || 0)}</td>
          <td>${Number(item.pending_claim_requests || 0)}</td>
          <td>
            <div class="affiliates-admin-actions">
              <button type="button" class="affiliates-admin-action-btn" data-affiliate-view="${item.id}">View</button>
              <button type="button" class="affiliates-admin-action-btn" data-affiliate-approve="${item.id}">Approve</button>
              <button type="button" class="affiliates-admin-action-btn" data-affiliate-reject="${item.id}">Reject</button>
              <button type="button" class="affiliates-admin-action-btn" data-affiliate-suspend="${item.id}">Suspend</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  },

  async updateStatus(affiliateId, status) {
    if (!affiliateId || !status || !window.axiomSupabase) return;

    try {
      const { error } = await window.axiomSupabase.rpc("admin_update_affiliate_status", {
        p_affiliate_id: affiliateId,
        p_status: status
      });

      if (error) throw error;

      await this.loadAffiliates();

      if (this.selectedAffiliate && this.selectedAffiliate.id === affiliateId) {
        await this.openAffiliateDetails(affiliateId);
      }
    } catch (error) {
      console.error("Failed to update affiliate status:", error);
      alert(error.message || "Failed to update affiliate status.");
    }
  },

  async openAffiliateDetails(affiliateId) {
    if (!affiliateId || !window.axiomSupabase) return;

    try {
      const summary = this.affiliates.find((item) => String(item.id) === String(affiliateId)) || null;
      this.selectedAffiliate = summary;

      const [
        conversionsResult,
        claimsResult,
        payoutsResult
      ] = await Promise.all([
        window.axiomSupabase
          .from("affiliate_conversions")
          .select("*")
          .eq("affiliate_id", affiliateId)
          .order("created_at", { ascending: false })
          .limit(10),

        window.axiomSupabase
          .from("affiliate_claim_requests")
          .select("*")
          .eq("affiliate_id", affiliateId)
          .order("created_at", { ascending: false })
          .limit(10),

        window.axiomSupabase
          .from("affiliate_payouts")
          .select("*")
          .eq("affiliate_id", affiliateId)
          .order("created_at", { ascending: false })
          .limit(10)
      ]);

      if (conversionsResult.error) throw conversionsResult.error;
      if (claimsResult.error) throw claimsResult.error;
      if (payoutsResult.error) throw payoutsResult.error;

      this.renderAffiliateDetail(summary, {
        conversions: Array.isArray(conversionsResult.data) ? conversionsResult.data : [],
        claims: Array.isArray(claimsResult.data) ? claimsResult.data : [],
        payouts: Array.isArray(payoutsResult.data) ? payoutsResult.data : []
      });

      if (this.modal) {
        this.modal.hidden = false;
        document.body.style.overflow = "hidden";
      }
    } catch (error) {
      console.error("Failed to load affiliate details:", error);
      alert(error.message || "Failed to load affiliate details.");
    }
  },

  renderAffiliateDetail(summary, detailData) {
    this.setText("affiliateDetailName", summary?.full_name || "Affiliate");
    this.setText("affiliateDetailNameInline", summary?.full_name || "Affiliate");
    this.setText("affiliateDetailEmail", summary?.email || "—");
    this.setText("affiliateDetailDiscord", summary?.discord_username || "—");
    this.setText("affiliateDetailStatus", summary?.status || "—");
    this.setText("affiliateDetailCode", summary?.referral_code || "—");
    this.setText(
      "affiliateDetailCommission",
      summary ? `${Number(summary.commission_value || 0)}%` : "—"
    );
    this.setText(
      "affiliateDetailDiscount",
      summary ? `${Number(summary.discount_value || 0)}%` : "—"
    );
    this.setText("affiliateDetailClicks", String(summary?.total_clicks_live || summary?.total_clicks || 0));
    this.setText("affiliateDetailConversions", String(summary?.total_conversions_live || summary?.total_conversions || 0));
    this.setText("affiliateDetailClaimable", this.formatMoney(summary?.claimable_commission || 0));
    this.setText("affiliateDetailPaid", this.formatMoney(summary?.total_commission_paid || 0));
    this.setText("affiliateDetailCreatedAt", this.formatDate(summary?.created_at));

    const payoutAffiliateId = document.getElementById("affiliatePayoutAffiliateId");
    if (payoutAffiliateId) {
      payoutAffiliateId.value = summary?.id || "";
    }

    if (this.modal) {
      this.modal.setAttribute("data-selected-affiliate-id", summary?.id || "");
    }

    const conversionsMount = document.getElementById("affiliateDetailConversionsList");
    const claimsMount = document.getElementById("affiliateDetailClaimsList");
    const payoutsMount = document.getElementById("affiliateDetailPayoutsList");

    if (conversionsMount) {
      if (!detailData.conversions.length) {
        conversionsMount.innerHTML = `<div class="affiliates-admin-empty">No conversions yet.</div>`;
      } else {
        conversionsMount.innerHTML = detailData.conversions.map((row) => {
          return `
            <div class="affiliates-admin-stack-row">
              <span>
                Order #${this.escapeHtml(row.order_number || "—")} ·
                ${this.escapeHtml(row.commission_status || "pending")} ·
                ${this.formatDate(row.created_at)}
              </span>
              <strong>${this.formatMoney(row.commission_amount || 0)}</strong>
            </div>
          `;
        }).join("");
      }
    }

    if (claimsMount) {
      if (!detailData.claims.length) {
        claimsMount.innerHTML = `<div class="affiliates-admin-empty">No claim requests yet.</div>`;
      } else {
        claimsMount.innerHTML = detailData.claims.map((row) => {
          const buttons = row.status === "pending"
            ? `
              <div class="affiliates-admin-actions">
                <button type="button" class="affiliates-admin-action-btn" data-claim-id="${row.id}" data-claim-status="approved">Approve</button>
                <button type="button" class="affiliates-admin-action-btn" data-claim-id="${row.id}" data-claim-status="rejected">Reject</button>
                <button type="button" class="affiliates-admin-action-btn" data-claim-id="${row.id}" data-claim-status="paid">Mark Paid</button>
              </div>
            `
            : "";

          return `
            <div class="affiliates-admin-detail-card">
              <div class="affiliates-admin-detail-list">
                <div class="affiliates-admin-detail-row">
                  <span>Status</span>
                  <strong>${this.escapeHtml(row.status || "pending")}</strong>
                </div>
                <div class="affiliates-admin-detail-row">
                  <span>Amount</span>
                  <strong>${this.formatMoney(row.amount || 0)}</strong>
                </div>
                <div class="affiliates-admin-detail-row">
                  <span>Discord</span>
                  <strong>${this.escapeHtml(row.discord_contact || "—")}</strong>
                </div>
                <div class="affiliates-admin-detail-row">
                  <span>Created</span>
                  <strong>${this.formatDate(row.created_at)}</strong>
                </div>
                <div class="affiliates-admin-detail-row">
                  <span>Message</span>
                  <strong>${this.escapeHtml(row.message || "—")}</strong>
                </div>
              </div>
              ${buttons}
            </div>
          `;
        }).join("");
      }
    }

    if (payoutsMount) {
      if (!detailData.payouts.length) {
        payoutsMount.innerHTML = `<div class="affiliates-admin-empty">No payouts yet.</div>`;
      } else {
        payoutsMount.innerHTML = detailData.payouts.map((row) => {
          return `
            <div class="affiliates-admin-stack-row">
              <span>
                ${this.escapeHtml(row.payout_method || "Payout")} ·
                ${this.escapeHtml(row.payout_status || "pending")} ·
                ${this.formatDate(row.created_at)}
              </span>
              <strong>${this.formatMoney(row.amount || 0)}</strong>
            </div>
          `;
        }).join("");
      }
    }
  },

  closeModal() {
    if (this.modal) {
      this.modal.hidden = true;
    }

    document.body.style.overflow = "";
  },

  async updateClaimStatus(claimId, status) {
    if (!claimId || !status || !window.axiomSupabase) return;

    try {
      const { error } = await window.axiomSupabase.rpc("admin_update_affiliate_claim_status", {
        p_claim_request_id: claimId,
        p_status: status
      });

      if (error) throw error;

      await this.loadAffiliates();

      if (this.selectedAffiliate?.id) {
        await this.openAffiliateDetails(this.selectedAffiliate.id);
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
      const { error } = await window.axiomSupabase.rpc("admin_record_affiliate_payout", {
        p_affiliate_id: affiliateId,
        p_amount: amount,
        p_payout_method: method || null,
        p_payout_reference: reference || null,
        p_notes: notes || null
      });

      if (error) throw error;

      if (this.recordPayoutForm) {
        this.recordPayoutForm.reset();
      }

      const payoutAffiliateId = document.getElementById("affiliatePayoutAffiliateId");
      if (payoutAffiliateId) {
        payoutAffiliateId.value = affiliateId;
      }

      await this.loadAffiliates();

      if (this.selectedAffiliate?.id) {
        await this.openAffiliateDetails(this.selectedAffiliate.id);
      }
    } catch (error) {
      console.error("Failed to record payout:", error);
      alert(error.message || "Failed to record payout.");
    }
  },

  formatMoney(value) {
    return `$${Number(value || 0).toFixed(2)}`;
  },

  formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  },

  setText(id, value) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = value;
    }
  },

  escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
};
