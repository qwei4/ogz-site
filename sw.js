/* OGZ — офлайн-кеш */
const VERSION = "ogz-v3";

const ASSETS = [
  "./",
  "index.html",
  "styles.css",
  "i18n.js",
  "script.js",
  "fonts.css",
  "icon.svg",
  "og-card.jpg",
  "manifest.webmanifest",
  "fonts/inter-cyrillic.woff2",
  "fonts/inter-latin.woff2",
  "fonts/oswald-cyrillic.woff2",
  "fonts/oswald-latin.woff2",
  "fonts/noto-sans-georgian-georgian.woff2",
  "fonts/noto-sans-georgian-latin.woff2",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(ASSETS))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
