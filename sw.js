// Service worker del Movement Finder.
// Estrategia simple a propósito: cache-first para el shell de la app
// (HTML/CSS/JS/íconos), network-first con fallback a caché para los
// datos (movements.json), así el buscador funciona sin señal en el
// gimnasio pero igual toma datos frescos apenas hay conexión.

const CACHE_NAME = "movement-finder-v2";

const APP_SHELL = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./manifest.json",
  "./img/favicon-16x16.png",
  "./img/favicon-32x32.png",
  "./img/apple-touch-icon.png",
  "./img/android-chrome-192x192.png",
  "./img/android-chrome-512x512.png",
];

const DATA_URL_PATTERN = /data\/movements\.json$/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Datos: red primero, caché como respaldo sin conexión.
  if (DATA_URL_PATTERN.test(request.url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Shell de la app: caché primero, red como respaldo.
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
