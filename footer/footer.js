fetch("footer/footer.html")
  .then(response => response.text())
  .then(data => {
    const footerTarget = document.getElementById("site-footer");
    if (footerTarget) {
      footerTarget.innerHTML = data;
    }
  })
  .catch(error => console.error("Footer failed to load:", error));
