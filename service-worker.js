const CACHE_NAME = "eyal-mart-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/style.css",
  "/script.js",
  "/cart.html",
  "/manifest.json",
  "/favicon.ico",
  "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css",
  "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js",
  "https://checkout.razorpay.com/v1/checkout.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only cache GET requests
  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then(cachedRes => {
      if (cachedRes) return cachedRes;

      return fetch(request)
        .then(fetchRes => {
          return caches.open(CACHE_NAME).then(cache => {
            // Cache fetched response clone if it's a success
            if (fetchRes.ok && request.url.startsWith(self.location.origin)) {
              cache.put(request, fetchRes.clone());
            }
            return fetchRes;
          });
        })
        .catch(() => {
          // Offline fallback for HTML pages
          if (request.headers.get("accept").includes("text/html")) {
            return caches.match("/index.html");
          }
        });
    })
  );
});
