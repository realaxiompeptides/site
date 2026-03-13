function loadSection(id, file) {

const mount = document.getElementById(id)

if (!mount) return

fetch(file)
.then(res => res.text())
.then(html => mount.innerHTML = html)

}

document.addEventListener("DOMContentLoaded", () => {

loadSection("paymentSection", "checkout-payment.html")
loadSection("termsSection", "checkout-terms.html")

})

document.addEventListener("submit", function(e){

if(e.target.id !== "checkoutForm") return

const terms = document.getElementById("termsCheckbox")

if(!terms || !terms.checked){

e.preventDefault()

alert("You must agree to the Terms & Conditions before checking out.")

}

})
