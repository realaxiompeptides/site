document.addEventListener("DOMContentLoaded", function () {
  const overlay = document.getElementById("siteOverlay");

  if (overlay) {
    overlay.addEventListener("click", function () {
      if (window.closeMenuDrawer) window.closeMenuDrawer();
      if (window.closeCartDrawer) window.closeCartDrawer();
    });
  }
});
