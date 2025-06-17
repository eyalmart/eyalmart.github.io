const DEPLOYMENT_URL = "https://script.google.com/macros/s/AKfycbyLuncL2wLm9ka528KU4h8R5O6DmZRPQUQrq4xwpGQGuniitZhICdhJPW1oWGTudMZw/exec"; // <<< VERIFY THIS URL CAREFULLY

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
  if (isNaN(qty) || qty <= 0) {
    alert("Please enter a valid quantity.");
    return;
  }

  if (!cart[id]) cart[id] = { name, price, qty };
  else cart[id].qty += qty;
  saveCart();
  updateCartCount();
  // Using a more subtle notification
  showToast("Product added to cart!");
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
  updateCartCount(); // Update cart count if an item is removed
}

function showCartModal() {
  const itemsContainer = document.getElementById("cart-items");
  const totalDisplay = document.getElementById("cart-total");
  itemsContainer.innerHTML = "";
  let total = 0;

  if (Object.keys(cart).length === 0) {
    itemsContainer.innerHTML = "<p class='text-center text-muted'>Your cart is empty.</p>";
    document.querySelector("#cartModal .modal-footer .btn-success").disabled = true; // Disable checkout if cart is empty
  } else {
    document.querySelector("#cartModal .modal-footer .btn-success").disabled = false; // Enable checkout
    for (let id in cart) {
      const item = cart[id];
      const subtotal = item.qty * item.price;
      total += subtotal;
      itemsContainer.innerHTML += `
        <div class='mb-2 d-flex justify-content-between align-items-center'>
          <div>
            <strong>${item.name}</strong><br>
            <small>Qty: ${item.qty} × ₹${item.price} = ₹${subtotal}</small>
          </div>
          <div>
            <button class="btn btn-sm btn-outline-secondary" onclick="decreaseQty('${id}')">−</button>
            <button class="btn btn-sm btn-outline-secondary ms-1" onclick="increaseQty('${id}')">＋</button>
          </div>
        </div>`;
    }
  }

  totalDisplay.innerText = total;
  // Ensure the modal instance is created only once if possible, or correctly managed
  const cartModalEl = document.getElementById("cartModal");
  const modal = bootstrap.Modal.getInstance(cartModalEl) || new bootstrap.Modal(cartModalEl);
  modal.show();
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

  if (!name || !mobile || !area) {
    alert("Please fill in your Name, Mobile Number, and Area.");
    return;
  }
  if (!/^\d{10}$/.test(mobile)) {
    alert("Please enter a valid 10-digit mobile number.");
    return;
  }
  if (Object.keys(cart).length === 0) {
    alert("Your cart is empty. Please add items before checking out.");
    return;
  }

  const total = Object.values(cart).reduce((sum, item) => sum + item.qty * item.price, 0);

  // Close the cart modal before opening Razorpay
  const cartModalEl = document.getElementById("cartModal");
  const modal = bootstrap.Modal.getInstance(cartModalEl);
  if (modal) {
    modal.hide();
  }

  const options = {
    key: "rzp_live_ma4VvXqWWfLwH2", // Replace with your Razorpay key
    amount: total * 100, // Amount in paisa
    currency: "INR",
    name: "Eyal Mart",
    description: "Order Payment",
    prefill: { name, contact: mobile },
    handler: function (response) {
      // Razorpay payment was successful. Now send order details to Google Sheet.
      console.log("Razorpay success response:", response); // Log Razorpay response
      sendOrderToSheet({ name, mobile, area, note, cart, total, razorpay_payment_id: response.razorpay_payment_id });
    },
    modal: {
      ondismiss: () => {
        alert("Payment cancelled.");
        // Re-open cart modal if payment is cancelled (optional)
        showCartModal();
      }
    },
    theme: { color: "#0d6efd" }
  };

  try {
    const rzp = new Razorpay(options);
    rzp.open();
  } catch (e) {
    console.error("Razorpay initiation error:", e);
    alert("Failed to initiate payment. Please try again.");
  }
}

function sendOrderToSheet(orderDetails) {
  fetch(DEPLOYMENT_URL, {
    method: "POST",
    body: JSON.stringify(orderDetails),
    headers: { "Content-Type": "application/json" }
  })
  .then(res => {
    if (!res.ok) {
      // Check for HTTP errors (e.g., 404, 500)
      return res.text().then(text => { throw new Error(`HTTP error! status: ${res.status}, body: ${text}`); });
    }
    return res.json();
  })
  .then(res => {
    if (res.success) {
      localStorage.removeItem("eyal_cart");
      cart = {}; // Clear the local cart object
      updateCartCount(); // Update cart count to 0
      showThankYouModal(orderDetails.name, orderDetails.total, orderDetails.cart);
    } else {
      console.error("Google Apps Script error:", res.error);
      alert("❌ Order confirmed, but failed to save details. Please contact support. Error: " + res.error);
    }
  })
  .catch(err => {
    console.error("Network or parsing error submitting order:", err);
    alert("❌ Order confirmed, but a network error occurred while saving details. Please contact support.");
  });
}

// Ensure you have a proper refreshPage function if needed, or just close the modal
function refreshPage() {
  window.location.reload();
}

function showThankYouModal(name, total, cartData) {
  // Re-use the existing thankYouModal in index.html to avoid creating duplicates
  const thankYouModalEl = document.getElementById("thankYouModal");
  document.getElementById("thankName").innerText = name;
  document.getElementById("thankTotal").innerText = total;

  const thankItemsList = document.getElementById("thankItems");
  thankItemsList.innerHTML = Object.values(cartData).map(item =>
    `<li class="list-group-item d-flex justify-content-between align-items-center">
      <span>${item.name} × ${item.qty}</span>
      <span class="fw-bold">₹${item.qty * item.price}</span>
    </li>`
  ).join("");

  const modal = new bootstrap.Modal(thankYouModalEl);
  modal.show();
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
  allBtn.innerHTML = `<span class='me-1'></span>All`;
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
  if (c.includes("daily")) return "";
  if (c.includes("electronics")) return "";
  if (c.includes("footwear")) return "";
  if (c.includes("stationery")) return "✏";
  return "";
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

  if (filtered.length === 0) {
    container.innerHTML = "<p class='text-center col-12 text-muted'>No products found matching your filters.</p>";
  }

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
              <button class="btn btn-success btn-sm ms-2" onclick="addToCart('${p.ID}', '${p.Name.replace(/'/g, "\\'")}', ${p.Price}, document.getElementById('qty-${p.ID}').value)">ADD</button>
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
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(displayProducts)
    .catch(err => {
      console.error("Error loading products:", err);
      alert("❌ Failed to load products. Please check your internet connection and try again.");
      document.getElementById("spinner").classList.add("d-none"); // Hide spinner on error
    });

  fetch(`${DEPLOYMENT_URL}?action=getAreas`)
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(areas => {
      allAreas = areas;
      populateAreaDropdown();
    })
    .catch(err => {
      console.error("Error loading areas:", err);
      alert("❌ Failed to load delivery areas.");
    });
}

// Simple Toast/Notification function (optional, but good for UX)
function showToast(message, type = 'success') {
    const toastContainer = document.createElement('div');
    toastContainer.style.position = 'fixed';
    toastContainer.style.bottom = '20px';
    toastContainer.style.left = '50%';
    toastContainer.style.transform = 'translateX(-50%)';
    toastContainer.style.zIndex = '1100';
    toastContainer.style.backgroundColor = type === 'success' ? '#28a745' : '#dc3545';
    toastContainer.style.color = 'white';
    toastContainer.style.padding = '10px 20px';
    toastContainer.style.borderRadius = '5px';
    toastContainer.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    toastContainer.style.opacity = '0';
    toastContainer.style.transition = 'opacity 0.5s ease-in-out';
    toastContainer.innerText = message;

    document.body.appendChild(toastContainer);

    setTimeout(() => {
        toastContainer.style.opacity = '1';
    }, 10); // Small delay to trigger transition

    setTimeout(() => {
        toastContainer.style.opacity = '0';
        toastContainer.addEventListener('transitionend', () => toastContainer.remove());
    }, 3000); // Hide after 3 seconds
}


window.onload = () => {
  updateCartCount();
  loadProducts();

  // The PWA service worker registration is already present in index.html, so no need to duplicate here.
};
