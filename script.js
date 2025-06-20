// ✅ script.js - Eyal Mart Frontend Logic

let products = [];
let areas = [];
let cart = {};
const cartCount = document.getElementById("cart-count");
const productList = document.getElementById("product-list");
const categoryFilter = document.getElementById("categoryFilter");

const BACKEND_URL = "https://script.google.com/macros/s/AKfycbyLuncL2wLm9ka528KU4h8R5O6DmZRPQUQrq4xwpGQGuniitZhICdhJPW1oWGTudMZw/exec";

window.onload = async () => {
  showSpinner(true);
  await fetchData();
  updateCartCount();
  showSpinner(false);
};

async function fetchData() {
  const [productsRes, areasRes] = await Promise.all([
    fetch(`${BACKEND_URL}?path=getProducts`).then(r => r.json()),
    fetch(`${BACKEND_URL}?path=getAreas`).then(r => r.json())
  ]);

  products = productsRes;
  areas = areasRes;

  renderProducts(products);
  renderCategoryFilters();
}

function renderProducts(list) {
  productList.innerHTML = "";
  list.forEach(product => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <img src="${product.image}" alt="${product.name}" />
      <h3>${product.name}</h3>
      <p>₹${product.price}</p>
      <button onclick='addToCart(${JSON.stringify(product)})'>Add to Cart</button>
    `;
    productList.appendChild(card);
  });
}

function renderCategoryFilters() {
  const uniqueCats = [...new Set(products.map(p => p.category))];
  categoryFilter.innerHTML = uniqueCats.map(cat => `
    <button onclick="filterByCategory('${cat}')">${cat}</button>
  `).join("");
}

function filterByCategory(category) {
  const filtered = products.filter(p => p.category === category);
  renderProducts(filtered);
}

function applyFilters() {
  const search = document.getElementById("searchInput").value.toLowerCase();
  const sort = document.getElementById("priceSort").value;

  let filtered = products.filter(p => p.name.toLowerCase().includes(search));

  if (sort === "asc") filtered.sort((a, b) => a.price - b.price);
  if (sort === "desc") filtered.sort((a, b) => b.price - a.price);

  renderProducts(filtered);
}

function addToCart(product) {
  if (!cart[product.id]) {
    cart[product.id] = { ...product, qty: 1 };
  } else {
    cart[product.id].qty += 1;
  }
  updateCartCount();
  animateCart();
}

function updateCartCount() {
  cartCount.innerText = Object.keys(cart).length;
}

function animateCart() {
  cartCount.classList.add("bump");
  setTimeout(() => cartCount.classList.remove("bump"), 300);
}

function openCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
  location.href = "cart.html";
}

function showSpinner(state) {
  document.getElementById("spinner").style.display = state ? "block" : "none";
  document.getElementById("main-container").classList.toggle("hidden", state);
}
