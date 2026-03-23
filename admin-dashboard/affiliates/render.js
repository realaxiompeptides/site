(function () {
  const state = window.AXIOM_ADMIN_AFFILIATES_STATE;
  const utils = window.AXIOM_ADMIN_AFFILIATES_UTILS;

  function applyFilters() {
    const refs = window.AXIOM_ADMIN_AFFILIATES_DOM.getRefs();
    const query = String(refs.searchInput?.value || "").trim().toLowerCase();
    const status = String(refs.statusFilter?.value || "all").trim().toLowerCase();

    state.filteredAffiliates = state.affiliates.filter(function (item) {
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

    renderTable();
  }

  function renderStats() {
    const refs = window.AXIOM_ADMIN_AFFILIATES_DOM.getRefs();

    const total = state.affiliates.length;
    const pending = state.affiliates.filter((item) => String(item.status || "") === "pending").length;
    const approved = state.affiliates.filter((item) => String(item.status || "") === "approved").length;
    const claimable = state.affiliates.reduce((sum, item) => {
      return sum + Number(item.claimable_commission || 0);
    }, 0);

    if (refs.statTotal) refs.statTotal.textContent = String(total);
    if (refs.statPending) refs.statPending.textContent = String(pending);
    if (refs.statApproved) refs.statApproved.textContent = String(approved);
    if (refs.statClaimable) refs.statClaimable.textContent = utils.formatMoney(claimable);
  }

  function renderTable() {
    const refs = window.AXIOM_ADMIN_AFFILIATES_DOM.getRefs();
    if (!refs.tableBody) return;

    if (!state.filteredAffiliates.length) {
      refs.tableBody.innerHTML = `<tr><td colspan="10">No affiliates found.</td></tr>`;
      return;
    }

    refs.tableBody.innerHTML = state.filteredAffiliates.map(function (item) {
      const statusValue = utils.escapeHtml(item.status || "pending");
      const statusClass = `affiliate-admin-status-${statusValue}`;

      return `
        <tr>
          <td>${utils.escapeHtml(item.full_name || "—")}</td>
          <td>${utils.escapeHtml(item.email || "—")}</td>
          <td>${utils.escapeHtml(item.discord_username || "—")}</td>
          <td>
            <span class="affiliate-admin-status ${statusClass}">
              ${statusValue}
            </span>
          </td>
          <td>${utils.escapeHtml(item.referral_code || "—")}</td>
          <td>${Number(item.total_clicks_live || item.total_clicks || 0)}</td>
          <td>${Number(item.total_conversions_live || item.total_conversions || 0)}</td>
          <td>${utils.formatMoney(item.claimable_commission || 0)}</td>
          <td>${Number(item.pending_claim_requests || 0)}</td>
          <td>
            <div class="affiliates-admin-actions">
              <button type="button" class="affiliates-admin-action-btn" data-action="view" data-affiliate-id="${utils.escapeHtml(item.id)}">View</button>
              <button type="button" class="affiliates-admin-action-btn affiliates-admin-action-btn-approve" data-action="approve" data-affiliate-id="${utils.escapeHtml(item.id)}">Approve</button>
              <button type="button" class="affiliates-admin-action-btn affiliates-admin-action-btn-reject" data-action="reject" data-affiliate-id="${utils.escapeHtml(item.id)}">Reject</button>
              <button type="button" class="affiliates-admin-action-btn affiliates-admin-action-btn-suspend" data-action="suspend" data-affiliate-id="${utils.escapeHtml(item.id)}">Suspend</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  function renderAffiliateDetail(summary, detailData) {
    utils.setText("affiliateDetailName", summary?.full_name || "Affiliate");
    utils.setText("affiliateDetailNameInline", summary?.full_name || "Affiliate");
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
    utils.setText(
      "affiliateDetailClicks",
      String(summary?.total_clicks_live || summary?.total_clicks || 0)
    );
    utils.setText(
      "affiliateDetailConversions",
      String(summary?.total_conversions_live || summary?.total_conversions || 0)
    );
    utils.setText("affiliateDetailClaimable", utils.formatMoney(summary?.claimable_commission || 0));
    utils.setText("affiliateDetailPaid", utils.formatMoney(summary?.total_commission_paid || 0));
    utils.setText("affiliateDetailCreatedAt", utils.formatDate(summary?.created_at));

    const payoutAffiliateId = document.getElementById("affiliatePayoutAffiliateId");
    if (payoutAffiliateId) payoutAffiliateId.value = summary?.id || "";

    const conversionsMount = document.getElementById("affiliateDetailConversionsList");
    const claimsMount = document.getElementById("affiliateDetailClaimsList");
    const payoutsMount = document.getElementById("affiliateDetailPayoutsList");

    if (conversionsMount) {
      if (!detailData.conversions.length) {
        conversionsMount.innerHTML = `<div class="affiliates-admin-empty">No conversions yet.</div>`;
      } else {
        conversionsMount.innerHTML = detailData.conversions.map(function (row) {
          return `
            <div class="affiliates-admin-stack-row">
              <span>
                Order #${utils.escapeHtml(row.order_number || "—")} ·
                ${utils.escapeHtml(row.commission_status || "pending")} ·
                ${utils.formatDate(row.created_at)}
              </span>
              <strong>${utils.formatMoney(row.commission_amount || 0)}</strong>
            </div>
          `;
        }).join("");
      }
    }

    if (claimsMount) {
      if (!detailData.claims.length) {
        claimsMount.innerHTML = `<div class="affiliates-admin-empty">No claim requests yet.</div>`;
      } else {
        claimsMount.innerHTML = detailData.claims.map(function (row) {
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
    }

    if (payoutsMount) {
      if (!detailData.payouts.length) {
        payoutsMount.innerHTML = `<div class="affiliates-admin-empty">No payouts yet.</div>`;
      } else {
        payoutsMount.innerHTML = detailData.payouts.map(function (row) {
          return `
            <div class="affiliates-admin-stack-row">
              <span>
                ${utils.escapeHtml(row.payout_method || "Payout")} ·
                ${utils.escapeHtml(row.payout_status || "pending")} ·
                ${utils.formatDate(row.created_at)}
              </span>
              <strong>${utils.formatMoney(row.amount || 0)}</strong>
            </div>
          `;
        }).join("");
      }
    }
  }

  window.AXIOM_ADMIN_AFFILIATES_RENDER = {
    applyFilters,
    renderStats,
    renderTable,
    renderAffiliateDetail
  };
})();
