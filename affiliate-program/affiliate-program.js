document.addEventListener("DOMContentLoaded", async function () {
  const heroMount = document.getElementById("affiliateHeroMount");
  const authMount = document.getElementById("affiliateAuthMount");
  const dashboardMount = document.getElementById("affiliateDashboardMount");

  async function loadPartial(url, mountEl) {
    if (!mountEl) return false;

    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to load ${url}`);
      }
      mountEl.innerHTML = await response.text();
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  await Promise.all([
    loadPartial("partials/affiliate-hero.html", heroMount),
    loadPartial("partials/affiliate-auth.html", authMount),
    loadPartial("affiliate-dashboard.html", dashboardMount)
  ]);

  if (
    window.AXIOM_AFFILIATE_DASHBOARD &&
    typeof window.AXIOM_AFFILIATE_DASHBOARD.init === "function"
  ) {
    window.AXIOM_AFFILIATE_DASHBOARD.init();
  }
});
