(function () {
  const state = window.AXIOM_ADMIN_AFFILIATES_STATE;
  const domApi = window.AXIOM_ADMIN_AFFILIATES_DOM;
  const utils = window.AXIOM_ADMIN_AFFILIATES_UTILS;

  function renderStats() {
    const dom = domApi.get();
    const summary = state.summary || {
      total: 0,
      pending: 0,
      approved: 0,
      claimable: 0
    };

    domApi.setText(dom.statTotal, String(summary.total || 0));
    domApi.setText(dom.statPending, String(summary.pending || 0));
    domApi.setText(dom.statApproved, String(summary.approved || 0));
    domApi.setText(dom.statClaimable, utils.formatCurrency(summary.claimable || 0));
  }

  function renderLoading() {
    const dom = domApi.get();
    if (!dom.tableBody) return;
    domApi.setHTML(dom.tableBody, '<tr><td colspan="10">Loading affiliates...</td></tr>');
  }

  function renderError(message) {
    const dom = domApi.get();
    if (!dom.tableBody) return;
    domApi.setHTML(
      dom.tableBody,
      '<tr><td colspan="10">Failed to load affiliates: ' +
        utils.escapeHtml(message || "Unknown error") +
        "</td></tr>"
    );
  }

  function renderEmpty() {
    const dom = domApi.get();
    if (!dom.tableBody) return;
    domApi.setHTML(dom.tableBody, '<tr><td colspan="10">No affiliates found.</td></tr>');
  }

  function renderTable() {
    const dom = domApi.get();
    const rows = Array.isArray(state.filteredAffiliates) ? state.filteredAffiliates : [];

    if (!dom.tableBody) return;

    if (!rows.length) {
      renderEmpty();
      return;
    }

    domApi.setHTML(
      dom.tableBody,
      rows
        .map(function (item) {
          const statusValue = utils.escapeHtml(item.status || "pending");
          const statusClass = "affiliate-admin-status-" + statusValue;

          return (
            '<tr>' +
              "<td>" + utils.escapeHtml(item.full_name || "—") + "</td>" +
              "<td>" + utils.escapeHtml(item.email || "—") + "</td>" +
              "<td>" + utils.escapeHtml(item.discord_username || "—") + "</td>" +
              '<td><span class="affiliate-admin-status ' + statusClass + '">' + statusValue + "</span></td>" +
              "<td>" + utils.escapeHtml(item.referral_code || "—") + "</td>" +
              "<td>" + Number(item.total_clicks_live || item.total_clicks || 0) + "</td>" +
              "<td>" + Number(item.total_conversions_live || item.total_conversions || 0) + "</td>" +
              "<td>" + utils.formatCurrency(item.claimable_commission || item.claimable_amount || 0) + "</td>" +
              "<td>" + Number(item.pending_claim_requests || 0) + "</td>" +
              '<td>' +
                '<div class="affiliates-admin-actions">' +
                  '<button type="button" class="affiliates-admin-action-btn" data-action="view" data-affiliate-id="' + utils.escapeHtml(item.id) + '">View</button>' +
                  '<button type="button" class="affiliates-admin-action-btn affiliates-admin-action-btn-approve" data-action="approve" data-affiliate-id="' + utils.escapeHtml(item.id) + '">Approve</button>' +
                  '<button type="button" class="affiliates-admin-action-btn affiliates-admin-action-btn-reject" data-action="reject" data-affiliate-id="' + utils.escapeHtml(item.id) + '">Reject</button>' +
                  '<button type="button" class="affiliates-admin-action-btn affiliates-admin-action-btn-suspend" data-action="suspend" data-affiliate-id="' + utils.escapeHtml(item.id) + '">Suspend</button>' +
                "</div>" +
              "</td>" +
            "</tr>"
          );
        })
        .join("")
    );
  }

  function setDetailText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function renderAffiliateDetail(summary, detailData) {
    setDetailText("affiliateDetailName", summary?.full_name || "Affiliate");
    setDetailText("affiliateDetailNameInline", summary?.full_name || "Affiliate");
    setDetailText("affiliateDetailEmail", summary?.email || "—");
    setDetailText("affiliateDetailDiscord", summary?.discord_username || "—");
    setDetailText("affiliateDetailStatus", summary?.status || "—");
    setDetailText("affiliateDetailCode", summary?.referral_code || "—");
    setDetailText("affiliateDetailCommission", summary ? String(Number(summary.commission_value || 0)) + "%" : "—");
    setDetailText("affiliateDetailDiscount", summary ? String(Number(summary.discount_value || 0)) + "%" : "—");
    setDetailText("affiliateDetailClicks", String(summary?.total_clicks_live || summary?.total_clicks || 0));
    setDetailText("affiliateDetailConversions", String(summary?.total_conversions_live || summary?.total_conversions || 0));
    setDetailText("affiliateDetailClaimable", utils.formatCurrency(summary?.claimable_commission || 0));
    setDetailText("affiliateDetailPaid", utils.formatCurrency(summary?.total_commission_paid || 0));
    setDetailText("affiliateDetailCreatedAt", utils.formatDate(summary?.created_at));

    const payoutAffiliateId = document.getElementById("affiliatePayoutAffiliateId");
    if (payoutAffiliateId) payoutAffiliateId.value = summary?.id || "";

    const conversionsMount = document.getElementById("affiliateDetailConversionsList");
    const claimsMount = document.getElementById("affiliateDetailClaimsList");
    const payoutsMount = document.getElementById("affiliateDetailPayoutsList");

    if (conversionsMount) {
      conversionsMount.innerHTML = !detailData.conversions.length
        ? '<div class="affiliates-admin-empty">No conversions yet.</div>'
        : detailData.conversions.map(function (row) {
            return (
              '<div class="affiliates-admin-stack-row">' +
                "<span>" +
                  "Order #" + utils.escapeHtml(row.order_number || "—") + " · " +
                  utils.escapeHtml(row.commission_status || "pending") + " · " +
                  utils.formatDate(row.created_at) +
                "</span>" +
                "<strong>" + utils.formatCurrency(row.commission_amount || 0) + "</strong>" +
              "</div>"
            );
          }).join("");
    }

    if (claimsMount) {
      claimsMount.innerHTML = !detailData.claims.length
        ? '<div class="affiliates-admin-empty">No claim requests yet.</div>'
        : detailData.claims.map(function (row) {
            const buttons = row.status === "pending"
              ? (
                  '<div class="affiliates-admin-actions">' +
                    '<button type="button" class="affiliates-admin-action-btn" data-claim-id="' + utils.escapeHtml(row.id) + '" data-claim-status="approved">Approve</button>' +
                    '<button type="button" class="affiliates-admin-action-btn" data-claim-id="' + utils.escapeHtml(row.id) + '" data-claim-status="rejected">Reject</button>' +
                    '<button type="button" class="affiliates-admin-action-btn" data-claim-id="' + utils.escapeHtml(row.id) + '" data-claim-status="paid">Mark Paid</button>' +
                  "</div>"
                )
              : "";

            return (
              '<div class="affiliates-admin-detail-card">' +
                '<div class="affiliates-admin-detail-list">' +
                  '<div class="affiliates-admin-detail-row"><span>Status</span><strong>' + utils.escapeHtml(row.status || "pending") + "</strong></div>" +
                  '<div class="affiliates-admin-detail-row"><span>Amount</span><strong>' + utils.formatCurrency(row.amount || 0) + "</strong></div>" +
                  '<div class="affiliates-admin-detail-row"><span>Discord</span><strong>' + utils.escapeHtml(row.discord_contact || "—") + "</strong></div>" +
                  '<div class="affiliates-admin-detail-row"><span>Created</span><strong>' + utils.formatDate(row.created_at) + "</strong></div>" +
                  '<div class="affiliates-admin-detail-row"><span>Message</span><strong>' + utils.escapeHtml(row.message || "—") + "</strong></div>" +
                "</div>" +
                buttons +
              "</div>"
            );
          }).join("");
    }

    if (payoutsMount) {
      payoutsMount.innerHTML = !detailData.payouts.length
        ? '<div class="affiliates-admin-empty">No payouts yet.</div>'
        : detailData.payouts.map(function (row) {
            return (
              '<div class="affiliates-admin-stack-row">' +
                "<span>" +
                  utils.escapeHtml(row.payout_method || "Payout") + " · " +
                  utils.escapeHtml(row.payout_status || "pending") + " · " +
                  utils.formatDate(row.created_at) +
                "</span>" +
                "<strong>" + utils.formatCurrency(row.amount || 0) + "</strong>" +
              "</div>"
            );
          }).join("");
    }
  }

  window.AXIOM_ADMIN_AFFILIATES_RENDER = {
    renderStats: renderStats,
    renderLoading: renderLoading,
    renderError: renderError,
    renderEmpty: renderEmpty,
    renderTable: renderTable,
    renderAffiliateDetail: renderAffiliateDetail
  };
})();
