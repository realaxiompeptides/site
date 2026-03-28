document.addEventListener("DOMContentLoaded", function () {
  if (
    window.AXIOM_AFFILIATE_DASHBOARD &&
    typeof window.AXIOM_AFFILIATE_DASHBOARD.init === "function"
  ) {
    window.AXIOM_AFFILIATE_DASHBOARD.init();
  } else {
    console.error("AXIOM_AFFILIATE_DASHBOARD.init is not available.");
  }
});
