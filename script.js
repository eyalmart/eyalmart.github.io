<script>
const API_BASE = "https://script.google.com/macros/s/AKfycbyLuncL2wLm9ka528KU4h8R5O6DmZRPQUQrq4xwpGQGuniitZhICdhJPW1oWGTudMZw/exec"; // Your deployed script URL

function loadProducts() {
  fetch(`${API_BASE}?action=getProducts`)
    .then(res => res.json())
    .then(displayProducts)
    .catch(err => alert("Error loading products"));
  
  fetch(`${API_BASE}?action=getAreas`)
    .then(res => res.json())
    .then(data => {
      allAreas = data;
      populateAreaDropdown();
    });
}

function checkout() {
  const name = document.getElementById('cust-name').value.trim();
  const mobile = document.getElementById('cust-mobile').value.trim();
  const area = document.getElementById('cust-area').value.trim();
  if (!name || !mobile || !area || !/^[0-9]{10}$/.test(mobile)) return alert("Please fill all required fields.");

  const total = Object.values(cart).reduce((sum, item) => sum + item.qty * item.price, 0);

  fetch(API_BASE, {
    method: "POST",
    body: JSON.stringify({ action: "createOrder", amount: total }),
    headers: { "Content-Type": "application/json" }
  })
  .then(res => res.json())
  .then(orderData => {
    const options = {
      key: "rzp_live_y28VJYqsSStUvJ",
      amount: orderData.amount,
      currency: "INR",
      name: "Eyal Mart",
      description: "Order Payment",
      order_id: orderData.id,
      handler: function (response) {
        localStorage.removeItem('eyal_cart');
        fetch(API_BASE, {
          method: "POST",
          body: JSON.stringify({
            action: "submitOrder",
            order: {
              name, mobile, area, cart, total,
              razorpay_payment_id: response.razorpay_payment_id
            }
          }),
          headers: { "Content-Type": "application/json" }
        }).then(() => {
          showThankYouModal(name, total, cart);
        });
      },
      prefill: { name, contact: mobile },
      theme: { color: "#3399cc" }
    };
    new Razorpay(options).open();
  });
}
</script>
