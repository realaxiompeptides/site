document.addEventListener("DOMContentLoaded", function () {

  fetch("/footer/footer.html")
    .then(res => res.text())
    .then(data => {
      document.getElementById("footer-container").innerHTML = data;
    });

});
