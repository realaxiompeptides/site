/* =============================
   MENU
============================= */

const menuToggle = document.getElementById("menuToggle");
const menuClose = document.getElementById("menuClose");
const mobileMenu = document.getElementById("mobileMenu");
const overlay = document.getElementById("siteOverlay");

function openMenu() {
  mobileMenu.classList.add("active");
  overlay.classList.add("active");
}

function closeMenu() {
  mobileMenu.classList.remove("active");
  overlay.classList.remove("active");
}

if (menuToggle) menuToggle.onclick = openMenu;
if (menuClose) menuClose.onclick = closeMenu;



/* =============================
   CART
============================= */

const cartToggle = document.getElementById("cartToggle");
const cartClose = document.getElementById("cartClose");
const cartDrawer = document.getElementById("cartDrawer");

function openCart() {
  cartDrawer.classList.add("active");
  overlay.classList.add("active");
}

function closeCart() {
  cartDrawer.classList.remove("active");
  overlay.classList.remove("active");
}

if (cartToggle) cartToggle.onclick = openCart;
if (cartClose) cartClose.onclick = closeCart;


/* =============================
   CLOSE OVERLAY
============================= */

if (overlay) {
  overlay.onclick = () => {
    closeCart();
    closeMenu();
  };
}
