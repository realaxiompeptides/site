document.addEventListener("DOMContentLoaded", function () {
  const footerTarget = document.getElementById("site-footer");
  if (!footerTarget) return;

  fetch("footer/footer.html")
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Could not load footer/footer.html");
      }
      return response.text();
    })
    .then(function (html) {
      footerTarget.innerHTML = html;
    })
    .catch(function (error) {
      console.error("Footer load failed:", error);
    });
});
