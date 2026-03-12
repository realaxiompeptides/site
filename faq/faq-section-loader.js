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
    })
    .catch(function (error) {
      console.error("FAQ section failed to load:", error);
    });
});
