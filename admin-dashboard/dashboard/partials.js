(function () {
  async function loadPartials() {
    await Promise.all(
      (window.DASHBOARD_PARTIALS || []).map(async function ({ mountId, file }) {
        const mount = document.getElementById(mountId);
        if (!mount) return;

        const response = await fetch(file, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to load ${file}`);
        }

        mount.innerHTML = await response.text();
      })
    );
  }

  window.AXIOM_DASHBOARD_PARTIALS = {
    loadPartials
  };
})();
