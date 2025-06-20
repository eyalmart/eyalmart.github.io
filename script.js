const backendUrl = "https://script.google.com/macros/s/AKfycbyLuncL2wLm9ka528KU4h8R5O6DmZRPQUQrq4xwpGQGuniitZhICdhJPW1oWGTudMZw/exec"; // Your deployed URL

function loadProducts() {
  fetch(backendUrl, {
    method: "POST",
    body: JSON.stringify({ action: "getProducts" })
  })
  .then(res => res.json())
  .then(products => {
    allProducts = products;
    displayProducts(products);
  });

  fetch(backendUrl, {
    method: "POST",
    body: JSON.stringify({ action: "getAreas" })
  })
  .then(res => res.json())
  .then(areas => {
    allAreas = areas;
    populateAreaDropdown();
  });
}

function startCheckout(order) {
  fetch(backendUrl, {
    method: "POST",
    body: JSON.stringify({ action: "createOrder", amount: order.total })
  })
  .then(res => res.json())
  .then(data => {
    const options = {
      key: "rzp_live_y28VJYqsSStUvJ", // your key
      amount: data.amount,
      currency: "INR",
      order_id: data.id,
      handler: function(response) {
        order.razorpay_payment_id = response.razorpay_payment_id;
        submitOrderToBackend(order);
      }
    };
    new Razorpay(options).open();
  });
}

function submitOrderToBackend(order) {
  fetch(backendUrl, {
    method: "POST",
    body: JSON.stringify({ action: "submitOrder", order })
  })
  .then(res => res.json())
  .then(() => showThankYou(order));
}
