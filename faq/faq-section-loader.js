document.addEventListener("DOMContentLoaded", function () {
  const mount = document.getElementById("faq-section-mount");
  if (!mount) return;

  fetch("faq/faq-section.html")
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Could not load faq/faq-section.html");
      }
      return response.text();
    })
    .then(function (html) {
      mount.innerHTML = html;

      /* -----------------------------
         FAQ ACCORDION BEHAVIOR
         Only one open at a time
      ----------------------------- */

      const faqItems = mount.querySelectorAll(".axiom-faq-item");

      faqItems.forEach(function (item) {
        item.addEventListener("toggle", function () {
          if (item.open) {
            faqItems.forEach(function (otherItem) {
              if (otherItem !== item) {
                otherItem.removeAttribute("open");
              }
            });
          }
        });
      });
    })
    .catch(function (error) {
      console.error("FAQ section failed to load:", error);
    });
});
