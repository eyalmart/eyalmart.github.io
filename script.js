// --- Configuration ---
// IMPORTANT: Replace this with your deployed Google Apps Script Web App URL.
// Example: "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
const DEPLOYMENT_URL = "https://script.google.com/macros/s/AKfycbyLuncL2wLm9ka528KU4h8R5O6DmZRPQUQrq4xwpGQGuniitZhICdhJPW1oWGTudMZw/exec";

// IMPORTANT: Replace with your Razorpay Key ID (rzp_live_ or rzp_test_).
const RAZORPAY_KEY = "rzp_live_y28VJYqsSStUvJ";

// --- Global Variables ---
let allProducts = []; // Stores all products fetched from the backend
let allAreas = [];    // Stores all delivery areas fetched from the backend
let cart = JSON.parse(localStorage.getItem("eyal_cart") || "{}"); // Cart data stored in localStorage

// --- Cart Management Functions ---

/**
 * Updates the displayed count of items in the cart badge.
 */
function updateCartCount() {
  const count = Object.values(cart).reduce((sum, item) => sum + item.qty, 0);
  document.getElementById("cart-count").innerText = count;
}

/**
 * Saves the current state of the cart to localStorage.
 */
function saveCart() {
  localStorage.setItem("eyal_cart", JSON.stringify(cart));
}

/**
 * Adds a product to the cart or updates its quantity if already present.
 * @param {string} id - The unique ID of the product.
 * @param {string} name - The name of the product.
 * @param {number} price - The price of the product.
 * @param {string|number} qty - The quantity to add.
 */
function addToCart(id, name, price, qty) {
  qty = parseInt(qty);
  if (isNaN(qty) || qty <= 0) {
    showToast("Please enter a valid quantity to add.", 'error');
    return;
  }

  if (!cart[id]) {
    cart[id] = { name, price, qty };
  } else {
    cart[id].qty += qty;
  }
  saveCart();
  updateCartCount();
  showToast(`${name} added to cart!`);
}

/**
 * Increases the quantity of a specific item in the cart.
 * @param {string} id - The ID of the product to increase.
 */
function increaseQty(id) {
  if (cart[id]) {
    cart[id].qty++;
    saveCart();
    showCartModal(); // Refresh cart modal to show updated quantity
  }
}

/**
 * Decreases the quantity of a specific item in the cart. Removes the item if quantity drops to 0.
 * @param {string} id - The ID of the product to decrease.
 */
function decreaseQty(id) {
  if (cart[id]) {
    if (cart[id].qty > 1) {
      cart[id].qty--;
    } else {
      delete cart[id]; // Remove item if quantity is 1 and decreased
    }
    saveCart();
    showCartModal(); // Refresh cart modal
    updateCartCount(); // Update badge in case an item was removed
  }
}

/**
 * Displays the cart modal with current items and total.
 */
function showCartModal() {
  const itemsContainer = document.getElementById("cart-items");
  const totalDisplay = document.getElementById("cart-total");
  const checkoutButton = document.querySelector("#cartModal .modal-footer .btn-success");
  itemsContainer.innerHTML = "";
  let total = 0;

  if (Object.keys(cart).length === 0) {
    itemsContainer.innerHTML = "<p class='text-center text-muted'>Your cart is empty.</p>";
    checkoutButton.disabled = true; // Disable checkout button if cart is empty
  } else {
    checkoutButton.disabled = false; // Enable checkout button
    for (const id in cart) {
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
            <button class="btn btn-sm btn-outline-secondary rounded-md" onclick="decreaseQty('${id}')">−</button>
            <button class="btn btn-sm btn-outline-secondary rounded-md ms-1" onclick="increaseQty('${id}')">＋</button>
          </div>
        </div>`;
    }
  }

  totalDisplay.innerText = total;
  const cartModalInstance = new bootstrap.Modal(document.getElementById("cartModal"));
  cartModalInstance.show();
}

/**
 * Populates the 'Select Area' dropdown with data fetched from the backend.
 */
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

// --- Checkout and Payment ---

/**
 * Initiates the checkout process, validates customer details, and opens Razorpay.
 */
function checkout() {
  const name = document.getElementById("cust-name").value.trim();
  const mobile = document.getElementById("cust-mobile").value.trim();
  const area = document.getElementById("cust-area").value.trim();
  const note = document.getElementById("cust-note").value.trim();

  // Client-side validation
  if (!name || !mobile || !area) {
    showToast("Please fill in your Name, Mobile Number, and Select Area.", 'error');
    return;
  }
  if (!/^\d{10}$/.test(mobile)) {
    showToast("Please enter a valid 10-digit mobile number.", 'error');
    return;
  }
  if (Object.keys(cart).length === 0) {
    showToast("Your cart is empty. Please add items before checking out.", 'error');
    return;
  }

  const total = Object.values(cart).reduce((sum, item) => sum + item.qty * item.price, 0);

  // Close the cart modal before opening Razorpay
  const cartModalInstance = bootstrap.Modal.getInstance(document.getElementById("cartModal"));
  if (cartModalInstance) {
    cartModalInstance.hide();
  }

  // Razorpay Options
  const options = {
    key: RAZORPAY_KEY, // Your Razorpay Key ID
    amount: total * 100, // Amount in paisa
    currency: "INR",
    name: "Eyal Mart",
    description: "Order Payment",
    prefill: {
      name: name,
      contact: mobile
    },
    handler: function (response) {
      // This function is called on successful payment by Razorpay
      console.log("Razorpay payment successful. Response:", response);
      // Now send the order details to your Google Sheet backend
      sendOrderToSheet({ name, mobile, area, note, cart, total, razorpay_payment_id: response.razorpay_payment_id });
    },
    modal: {
      ondismiss: () => {
        showToast("Payment cancelled by user.", 'error');
        showCartModal(); // Re-open cart modal if payment is cancelled
      }
    },
    theme: {
      color: "#0d6efd" // Primary color for Razorpay UI
    }
  };

  try {
    const rzp = new Razorpay(options);
    rzp.open(); // Open the Razorpay payment dialog
  } catch (e) {
    console.error("Error initiating Razorpay payment:", e);
    showToast("Failed to initiate payment. Please try again.", 'error');
  }
}

/**
 * Sends the order details to the Google Apps Script backend.
 * @param {object} orderDetails - Object containing customer and cart information.
 */
function sendOrderToSheet(orderDetails) {
  // Show a loading indicator if you have one, or disable the checkout button temporarily
  showToast("Submitting order...", 'info');

  fetch(DEPLOYMENT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json" // Crucial header for JSON payload
    },
    body: JSON.stringify(orderDetails)
  })
  .then(response => {
    // Check if the HTTP response itself was successful (status code 2xx)
    if (!response.ok) {
      // Attempt to read the error message from the response body
      return response.text().then(text => {
        throw new Error(`HTTP error! Status: ${response.status}, Response: ${text}`);
      });
    }
    return response.json(); // Parse the JSON response
  })
  .then(data => {
    if (data.success) {
      localStorage.removeItem("eyal_cart"); // Clear cart from localStorage
      cart = {}; // Clear in-memory cart
      updateCartCount(); // Update cart count to 0
      showThankYouModal(orderDetails.name, orderDetails.total, orderDetails.cart);
      showToast("Order saved successfully!");
    } else {
      console.error("Backend reported an error saving order:", data.error);
      showToast(`Order confirmed, but failed to save details: ${data.error}. Please contact support.`, 'error');
    }
  })
  .catch(error => {
    console.error("Network or parsing error submitting order:", error);
    showToast("Order confirmed, but a network error occurred while saving details. Please contact support.", 'error');
  });
}

/**
 * Displays the thank you modal with order summary.
 * @param {string} name - Customer name.
 * @param {number} total - Total amount paid.
 * @param {object} cartData - The cart contents at the time of purchase.
 */
function showThankYouModal(name, total, cartData) {
  const thankYouModalEl = document.getElementById("thankYouModal");
  document.getElementById("thankName").innerText = name;
  document.getElementById("thankTotal").innerText = total;

  const thankItemsList = document.getElementById("thankItems");
  thankItemsList.innerHTML = Object.values(cartData).map(item =>
    `<li class="list-group-item d-flex justify-content-between align-items-center rounded-md">
      <span>${item.name} × ${item.qty}</span>
      <span class="fw-bold">₹${item.qty * item.price}</span>
    </li>`
  ).join("");

  const modal = new bootstrap.Modal(thankYouModalEl);
  modal.show();
}

/**
 * Reloads the page to reset the app state.
 */
function refreshPage() {
  window.location.reload();
}

// --- Product Display and Filtering ---

/**
 * Displays products on the main page after fetching.
 * @param {Array<Object>} products - An array of product objects.
 */
function displayProducts(products) {
  document.getElementById("spinner").classList.add("d-none");
  document.getElementById("main-container").classList.remove("d-none");
  allProducts = products;

  // Extract unique categories and populate filter buttons
  const categories = [...new Set(products.map(p => p.Category))].filter(Boolean); // Filter out empty categories
  const container = document.getElementById("categoryFilter");
  container.innerHTML = "";

  // Add "All" button
  const allBtn = document.createElement("button");
  allBtn.className = "btn btn-light category-btn active rounded-md";
  allBtn.innerHTML = `<span class='me-1'></span>All`;
  allBtn.dataset.cat = "";
  allBtn.onclick = () => {
    document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
    allBtn.classList.add("active");
    applyFilters();
  };
  container.appendChild(allBtn);

  // Add category buttons
  categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "btn btn-light category-btn rounded-md";
    btn.innerHTML = `<span class='me-1'>${categoryIcon(cat)}</span>${cat}`;
    btn.dataset.cat = cat;
    btn.onclick = () => {
      document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      applyFilters();
    };
    container.appendChild(btn);
  });

  applyFilters(); // Apply filters initially
}

/**
 * Returns an emoji icon based on product category.
 * @param {string} cat - The category name.
 * @returns {string} An emoji string.
 */
function categoryIcon(cat) {
  const c = cat.toLowerCase();
  if (c.includes("daily")) return "";
  if (c.includes("electronics")) return "";
  if (c.includes("footwear")) return "";
  if (c.includes("stationery")) return "✏";
  return "";
}

/**
 * Applies search, category, and sort filters to products and updates the display.
 */
function applyFilters() {
  const keyword = document.getElementById("searchInput").value.toLowerCase();
  const category = document.querySelector(".category-btn.active")?.dataset.cat || "";
  const sort = document.getElementById("priceSort").value;

  let filtered = allProducts.filter(p =>
    (!keyword || p.Name.toLowerCase().includes(keyword)) &&
    (!category || p.Category === category) &&
    (parseInt(p.Stock) > 0) // Only show in-stock items
  );

  // Apply sorting
  if (sort === "asc") filtered.sort((a, b) => a.Price - b.Price);
  else if (sort === "desc") filtered.sort((a, b) => b.Price - a.Price);

  const container = document.getElementById("product-list");
  container.innerHTML = "";

  if (filtered.length === 0) {
    container.innerHTML = "<p class='text-center col-12 text-muted'>No products found matching your filters.</p>";
  }

  filtered.forEach((p, index) => {
    // Escape single quotes in product name for proper HTML attribute injection
    const escapedName = p.Name.replace(/'/g, "\\'");
    const col = document.createElement("div");
    col.className = "col-md-6 col-lg-4 mb-3";
    col.innerHTML = `
      <div class="product-card rounded-md">
        <div class="d-flex align-items-start gap-3">
          <img src="${p['Image URL'] || 'https://placehold.co/90x90/e0e0e0/ffffff?text=No+Image'}" alt="${p.Name}" class="product-image">
          <div class="product-info flex-grow-1">
            <h6 class="product-name">${p.Name}</h6>
            <div class="product-price">₹${p.Price}</div>
            <div class="qty-controls mb-2">
              <button class="btn btn-outline-secondary btn-sm rounded-md" onclick="document.getElementById('qty-${p.ID}').stepDown()">−</button>
              <input type="number" id="qty-${p.ID}" class="form-control form-control-sm text-center rounded-md" style="width: 50px" value="1" min="1">
              <button class="btn btn-outline-secondary btn-sm rounded-md" onclick="document.getElementById('qty-${p.ID}').stepUp()">＋</button>
              <button class="btn btn-success btn-sm ms-2 rounded-md" onclick="addToCart('${p.ID}', '${escapedName}', ${p.Price}, document.getElementById('qty-${p.ID}').value)">ADD</button>
            </div>
            ${p.Description ? `
              <a data-bs-toggle="collapse" href="#desc-${index}" role="button" class="small text-primary text-decoration-none">▼ More details</a>
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

/**
 * Fetches products and areas data from the Google Apps Script backend.
 */
function loadProducts() {
  // Fetch products
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
      showToast("Failed to load products. Please check your internet connection.", 'error');
      document.getElementById("spinner").classList.add("d-none"); // Hide spinner on error
      document.getElementById("main-container").classList.remove("d-none"); // Show empty container
    });

  // Fetch areas
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
      showToast("Failed to load delivery areas.", 'error');
    });
}

// --- Utility/UI Functions ---

/**
 * Displays a temporary toast notification message.
 * @param {string} message - The message to display.
 * @param {'success'|'error'|'info'} type - Type of toast (influences color).
 */
function showToast(message, type = 'success') {
  const toastContainer = document.getElementById('toast-container');
  if (!toastContainer) return;

  const toastMessage = document.createElement('div');
  toastMessage.className = `toast-message rounded-md ${type}`;
  toastMessage.innerText = message;
  toastContainer.appendChild(toastMessage);

  // Show the toast
  setTimeout(() => {
    toastMessage.classList.add('show');
  }, 10);

  // Hide and remove the toast after a delay
  setTimeout(() => {
    toastMessage.classList.remove('show');
    toastMessage.addEventListener('transitionend', () => toastMessage.remove());
  }, 3500); // Display for 3.5 seconds
}


// --- Initialization ---

// Event listener for when the window finishes loading.
window.onload = () => {
  updateCartCount(); // Initialize cart count on load
  loadProducts();    // Load products and areas from backend
};


