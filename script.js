const DEPLOYMENT_URL = "https://script.google.com/macros/s/AKfycbyLuncL2wLm9ka528KU4h8R5O6DmZRPQUQrq4xwpGQGuniitZhICdhJPW1oWGTudMZw/exec"; // Replace with your live script URL

let allProducts = [];
let allAreas = [];
let cart = JSON.parse(localStorage.getItem("eyal_cart") || "{}");

function updateCartCount() {
  const count = Object.values(cart).reduce((sum, item) => sum + item.qty, 0);
  document.getElementById("cart-count").innerText = count;
}

function saveCart() {
  localStorage.setItem("eyal_cart", JSON.stringify(cart));
}

function addToCart(id, name, price, qty) {
  qty = parseInt(qty);
  if (!cart[id]) cart[id] = { name, price, qty };
  else cart[id].qty += qty;
  saveCart();
  updateCartCount();
  alert("Added to cart");
}

function increaseQty(id) {
  cart[id].qty++;
  saveCart();
  showCartModal();
}

function decreaseQty(id) {
  if (cart[id].qty > 1) cart[id].qty--;
  else delete cart[id];
  saveCart();
  showCartModal();
}

function showCartModal() {
  const items = document.getElementById("cart-items");
  const totalDisplay = document.getElementById("cart-total");
  items.innerHTML = "";
  let total = 0;
  for (let id in cart) {
    const item = cart[id];
    const subtotal = item.qty * item.price;
    total += subtotal;
    items.innerHTML += `
      <div class='mb-2'>
        <strong>${item.name}</strong><br>
        Qty: ${item.qty} × ₹${item.price} = ₹${subtotal}
        <div>
          <button class="btn btn-sm btn-outline-secondary" onclick="decreaseQty('${id}')">−</button>
          <button class="btn btn-sm btn-outline-secondary" onclick="increaseQty('${id}')">＋</button>
        </div>
      </div>`;
  }
  totalDisplay.innerText = total;
  new bootstrap.Modal(document.getElementById("cartModal")).show();
}

function populateAreaDropdown() {
  const select = document.getElementById("cust-area");
  select.innerHTML = `<option value="">Select Area</option>`;
  allAreas.forEach(area => {
    const option = document.createElement("option");
    option.value = area;
    option.innerText = area;
    select.appendChild(option);
  });
}

function checkout() {
  const name = document.getElementById("cust-name").value.trim();
  const mobile = document.getElementById("cust-mobile").value.trim();
  const area = document.getElementById("cust-area").value.trim();
  const note = document.getElementById("cust-note").value.trim();

  if (!name || !mobile || !area) return alert("Please fill all fields.");
  if (!/^\d{10}$/.test(mobile)) return alert("Invalid mobile number.");

  const total = Object.values(cart).reduce((sum, item) => sum + item.qty * item.price, 0);

  const options = {
    key: "rzp_live_ma4VvXqWWfLwH2", // Replace with your Razorpay live key
    amount: total * 100,
    currency: "INR",
    name: "Eyal Mart",
    description: "Order Payment",
    prefill: { name, contact: mobile },
    handler: function (response) {
      fetch(DEPLOYMENT_URL, {
        method: "POST",
        body: JSON.stringify({
          name, mobile, area, note, cart, total,
          razorpay_payment_id: response.razorpay_payment_id
        }),
        headers: { "Content-Type": "application/json" }
      })
        .then(res => res.json())
        .then(res => {
          if (res.success) {
            localStorage.removeItem("eyal_cart");
            showThankYouModal(name, total, cart);
          } else {
            alert("❌ Order failed to save.");
          }
        })
        .catch(err => {
          console.error(err);
          alert("❌ Network error submitting order.");
        });
    },
    modal: {
      ondismiss: () => alert("Payment cancelled")
    },
    theme: { color: "#0d6efd" }
  };

  new Razorpay(options).open();
}

function showThankYouModal(name, total, cartData) {
  const modal = document.createElement("div");
  modal.className = "modal fade";
  modal.id = "thankYouModal";
  modal.tabIndex = -1;
  modal.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content text-center p-3">
        <div class="modal-body">
          <h4 class="text-success">✅ Order Confirmed!</h4>
          <p>Thank you <strong>${name}</strong></p>
          <p>Total Paid: ₹<strong>${total}</strong></p>
          <ul class="list-group mb-3">
            ${Object.values(cartData).map(item =>
              `<li class="list-group-item">${item.name} × ${item.qty} = ₹${item.qty * item.price}</li>`
            ).join("")}
          </ul>
          <button class="btn btn-primary w-100" data-bs-dismiss="modal" onclick="location.reload()">Continue Shopping</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  new bootstrap.Modal(modal).show();
}

function displayProducts(products) {
  document.getElementById("spinner").classList.add("d-none");
  document.getElementById("main-container").classList.remove("d-none");
  allProducts = products;

  const categories = [...new Set(products.map(p => p.Category))];
  const container = document.getElementById("categoryFilter");
  container.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.className = "btn btn-light category-btn active";
  allBtn.innerHTML = `<span class='me-1'>📦</span>All`;
  allBtn.dataset.cat = "";
  allBtn.onclick = () => {
    document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
    allBtn.classList.add("active");
    applyFilters();
  };
  container.appendChild(allBtn);

  categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "btn btn-light category-btn";
    btn.innerHTML = `<span class='me-1'>${categoryIcon(cat)}</span>${cat}`;
    btn.dataset.cat = cat;
    btn.onclick = () => {
      document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      applyFilters();
    };
    container.appendChild(btn);
  });

  applyFilters();
}

function categoryIcon(cat) {
  const c = cat.toLowerCase();
  if (c.includes("daily")) return "🍞";
  if (c.includes("electronics")) return "🔌";
  if (c.includes("footwear")) return "👟";
  if (c.includes("stationery")) return "✏️";
  return "📦";
}

function applyFilters() {
  const keyword = document.getElementById("searchInput").value.toLowerCase();
  const category = document.querySelector(".category-btn.active")?.dataset.cat || "";
  const sort = document.getElementById("priceSort").value;

  let filtered = allProducts.filter(p =>
    (!keyword || p.Name.toLowerCase().includes(keyword)) &&
    (!category || p.Category === category) &&
    (parseInt(p.Stock) > 0)
  );

  if (sort === "asc") filtered.sort((a, b) => a.Price - b.Price);
  else if (sort === "desc") filtered.sort((a, b) => b.Price - a.Price);

  const container = document.getElementById("product-list");
  container.innerHTML = "";

  filtered.forEach((p, index) => {
    const col = document.createElement("div");
    col.className = "col-md-6 col-lg-4 mb-3";
    col.innerHTML = `
      <div class="product-card">
        <div class="d-flex align-items-start gap-3">
          <img src="${p['Image URL']}" alt="${p.Name}" class="product-image">
          <div class="product-info">
            <h6 class="product-name">${p.Name}</h6>
            <div class="product-price">₹${p.Price}</div>
            <div class="qty-controls mb-2">
              <button class="btn btn-outline-secondary btn-sm" onclick="document.getElementById('qty-${p.ID}').stepDown()">−</button>
              <input type="number" id="qty-${p.ID}" class="form-control form-control-sm text-center" style="width: 50px" value="1" min="1">
              <button class="btn btn-outline-secondary btn-sm" onclick="document.getElementById('qty-${p.ID}').stepUp()">＋</button>
              <button class="btn btn-success btn-sm ms-2" onclick="addToCart('${p.ID}', '${p.Name}', ${p.Price}, document.getElementById('qty-${p.ID}').value)">ADD</button>
            </div>
            ${p.Description ? `
              <a data-bs-toggle="collapse" href="#desc-${index}" role="button" class="small text-primary">▼ More details</a>
              <div class="collapse mt-1 small text-muted" id="desc-${index}">
                ${p.Description}
              </div>
            ` : ""}
          </div>
        </div>
      </div>`;
    container.appendChild(col);
  });
}

function loadProducts() {
  fetch(`${DEPLOYMENT_URL}?action=getProducts`)
    .then(res => res.json())
    .then(displayProducts)
    .catch(err => {
      console.error(err);
      alert("❌ Failed to load products.");
    });

  fetch(`${DEPLOYMENT_URL}?action=getAreas`)
    .then(res => res.json())
    .then(areas => {
      allAreas = areas;
      populateAreaDropdown();
    });
}

window.onload = () => {
  updateCartCount();
  loadProducts();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js");
  }
};
