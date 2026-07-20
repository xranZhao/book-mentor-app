const CACHE_NAME = "book-mentor-v1";
const ASSETS = [
  "/book-mentor-app/index.html",
  "/book-mentor-app/style.css",
  "/book-mentor-app/app.js",
  "/book-mentor-app/config.js",
  "/book-mentor-app/data/books.js",
  "/book-mentor-app/manifest.json",
  "/book-mentor-app/icon-192.png",
  "/book-mentor-app/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => {
        console.log("缓存部分资源失败", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // API 请求不缓存
  if (event.request.url.includes("deepseek.com") || event.request.url.includes("openai")) {
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
