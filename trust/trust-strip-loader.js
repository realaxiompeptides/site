document.addEventListener("DOMContentLoaded", function () {
  const mount = document.getElementById("trust-strip-mount");
  if (!mount) return;

  fetch("trust/trust-strip.html")
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Could not load trust/trust-strip.html");
      }
      return response.text();
    })
    .then(function (html) {
      mount.innerHTML = html;
    })
    .catch(function (error) {
      console.error("Trust strip failed to load:", error);
    });
});
