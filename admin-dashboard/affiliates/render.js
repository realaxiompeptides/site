(function () {
  const utils = window.AXIOM_ADMIN_AFFILIATES_UTILS;

  window.AXIOM_ADMIN_AFFILIATES_RENDER = {
    applyFilters(dom, state) {
      const query = String(dom.searchInput?.value || "").trim().toLowerCase();
      const status = String(dom.statusFilter?.value || "all").trim().toLowerCase();

      state.filteredAffiliates = state.affiliates.filter((item) => {
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
    },

    renderStats(dom, state) {
      const total = state.affiliates.length;
      const pending = state.affiliates.filter((item) => item.status === "pending").length;
      const approved = state.affiliates.filter((item) => item.status === "approved").length;
      const claimable = state.affiliates.reduce(
        (sum, item) => sum + Number(item.claimable_commission || 0),
        0
      );

      if (dom.statTotal) dom.statTotal.textContent = String(total);
      if (dom.statPending) dom.statPending.textContent = String(pending);
      if (dom.statApproved) dom.statApproved.textContent = String(approved);
      if (dom.statClaimable) dom.statClaimable.textContent = utils.formatMoney(claimable);
    },

    renderTable(dom, state) {
      if (!dom.tableBody) return;

      if (!state.filteredAffiliates.length) {
        dom.tableBody.innerHTML = `<tr><td colspan="10">No affiliates found.</td></tr>`;
        return;
      }

      dom.tableBody.innerHTML = state.filteredAffiliates.map((item) => {
        const statusClass = `affiliate-admin-status-${utils.escapeHtml(item.status || "pending")}`;

        return `
          <tr>
            <td>${utils.escapeHtml(item.full_name || "—")}</td>
            <td>${utils.escapeHtml(item.email || "—")}</td>
            <td>${utils.escapeHtml(item.discord_username || "—")}</td>
            <td>
              <span class="affiliate-admin-status ${statusClass}">
                ${utils.escapeHtml(item.status || "pending")}
              </span>
            </td>
            <td>${utils.escapeHtml(item.referral_code || "—")}</td>
            <td>${Number(item.total_clicks || 0)}</td>
            <td>${Number(item.total_conversions || 0)}</td>
            <td>${utils.formatMoney(item.claimable_commission || 0)}</td>
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

    renderAffiliateDetail(detailData) {
      const summary = detailData?.summary || null;
      const conversions = detailData?.conversions || [];
      const claims = detailData?.claims || [];
      const payouts = detailData?.payouts || [];

      utils.setText("affiliateDetailName", summary?.full_name || "Affiliate");
      utils.setText("affiliateDetailEmail", summary?.email || "—");
      utils.setText("affiliateDetailDiscord", summary?.discord_username || "—");
      utils.setText("affiliateDetailStatus", summary?.status || "—");
      utils.setText("affiliateDetailCode", summary?.referral_code || "—");
      utils.setText(
        "affiliateDetailCommission",
        summary ? `${Number(summary.commission_value || 0)}%` : "—"
      );
      utils.setText(
        "affiliateDetailDiscount",
        summary ? `${Number(summary.discount_value || 0)}%` : "—"
      );
      utils.setText("affiliateDetailClicks", String(summary?.total_clicks || 0));
      utils.setText("affiliateDetailConversions", String(summary?.total_conversions || 0));
      utils.setText("affiliateDetailClaimable", utils.formatMoney(summary?.claimable_commission || 0));
      utils.setText("affiliateDetailPaid", utils.formatMoney(summary?.total_commission_paid || 0));
      utils.setText("affiliateDetailCreatedAt", utils.formatDate(summary?.created_at));

      const payoutAffiliateId = document.getElementById("affiliatePayoutAffiliateId");
      if (payoutAffiliateId) {
        payoutAffiliateId.value = summary?.id || "";
      }

      const conversionsMount = document.getElementById("affiliateDetailConversionsList");
      const claimsMount = document.getElementById("affiliateDetailClaimsList");
      const payoutsMount = document.getElementById("affiliateDetailPayoutsList");

      if (conversionsMount) {
        conversionsMount.innerHTML = !conversions.length
          ? `<div class="affiliates-admin-empty">No conversions yet.</div>`
          : conversions.map((row) => `
              <div class="affiliates-admin-stack-row">
                <span>
                  Order #${utils.escapeHtml(row.order_number || "—")} ·
                  ${utils.escapeHtml(row.commission_status || "pending")} ·
                  ${utils.formatDate(row.created_at)}
                </span>
                <strong>${utils.formatMoney(row.commission_amount || 0)}</strong>
              </div>
            `).join("");
      }

      if (claimsMount) {
        claimsMount.innerHTML = !claims.length
          ? `<div class="affiliates-admin-empty">No claim requests yet.</div>`
          : claims.map((row) => {
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
                      <strong>${utils.escapeHtml(row.status || "pending")}</strong>
                    </div>
                    <div class="affiliates-admin-detail-row">
                      <span>Amount</span>
                      <strong>${utils.formatMoney(row.amount || 0)}</strong>
                    </div>
                    <div class="affiliates-admin-detail-row">
                      <span>Discord</span>
                      <strong>${utils.escapeHtml(row.discord_contact || "—")}</strong>
                    </div>
                    <div class="affiliates-admin-detail-row">
                      <span>Created</span>
                      <strong>${utils.formatDate(row.created_at)}</strong>
                    </div>
                    <div class="affiliates-admin-detail-row">
                      <span>Message</span>
                      <strong>${utils.escapeHtml(row.message || "—")}</strong>
                    </div>
                  </div>
                  ${buttons}
                </div>
              `;
            }).join("");
      }

      if (payoutsMount) {
        payoutsMount.innerHTML = !payouts.length
          ? `<div class="affiliates-admin-empty">No payouts yet.</div>`
          : payouts.map((row) => `
              <div class="affiliates-admin-stack-row">
                <span>
                  ${utils.escapeHtml(row.payout_method || "Payout")} ·
                  ${utils.escapeHtml(row.payout_status || "pending")} ·
                  ${utils.formatDate(row.created_at)}
                </span>
                <strong>${utils.formatMoney(row.amount || 0)}</strong>
              </div>
            `).join("");
      }
    }
  };
})();
