// service-worker.js

const CACHE_NAME = "eyalmart-cache-v2"; // Increment cache version on changes
const urlsToCache = [
  "/",
  "/index.html",
  "/style.css",
  "/script.js",
  "/manifest.webmanifest", // Corrected manifest file name
  "/icon-192.png", // Cache PWA icons
  "/icon-512.png",
  // Add a maskable icon if you create one: "/icon-maskable-512x512.png",
  "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css",
  "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js",
  "https://fonts.googleapis.com/css2?family=Inter:wght@500;700&display=swap",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css", // Cache Font Awesome
  "https://checkout.razorpay.com/v1/checkout.js" // Cache Razorpay script
];

self.addEventListener("install", event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching all app content');
        return cache.addAll(urlsToCache.map(url => new Request(url, {credentials: 'omit'}))); // Add credentials: 'omit' to requests
      })
      .catch(error => {
        console.error('[Service Worker] Cache.addAll failed:', error);
      })
  );
});

self.addEventListener("activate", event => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  // Take control of uncontrolled clients immediately
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  // Only intercept GET requests, as POST/OPTIONS need network connectivity for API calls
  if (event.request.method === 'GET' && !event.request.url.includes(DEPLOYMENT_URL_FROM_GAS_HERE)) { // Exclude GAS URL from caching
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          // Cache hit - return response
          if (response) {
            return response;
          }
          // No cache hit - fetch from network
          return fetch(event.request).then(
            networkResponse => {
              // Check if we received a valid response
              if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                return networkResponse;
              }
              // IMPORTANT: Clone the response. A response is a stream
              // and can only be consumed once. We are consuming it once
              // to cache it and once to return it to the browser.
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
              return networkResponse;
            }
          ).catch(error => {
            console.error('[Service Worker] Fetch failed:', event.request.url, error);
            // You could return a fallback page here if offline
            // e.g., return caches.match('/offline.html');
          });
        })
    );
  }
});
