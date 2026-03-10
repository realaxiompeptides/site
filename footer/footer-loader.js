document.addEventListener("DOMContentLoaded", function () {
  const footerTarget = document.getElementById("site-footer");
  if (!footerTarget) return;

  fetch("footer/footer.html")
    .then(response => {
      if (!response.ok) {
        throw new Error("Footer file not found");
      }
      return response.text();
    })
    .then(data => {
      footerTarget.innerHTML = data;
    })
    .catch(error => {
      console.error("Footer failed to load:", error);
    });
});
