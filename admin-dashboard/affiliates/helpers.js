const AXIOM_AFFILIATE_UTILS = {
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

  escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  setText(id, value) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = value;
    }
  }
};

window.AXIOM_ADMIN_AFFILIATES_HELPERS = AXIOM_AFFILIATE_UTILS;
window.AXIOM_ADMIN_AFFILIATES_UTILS = AXIOM_AFFILIATE_UTILS;
