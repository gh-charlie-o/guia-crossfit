// Service worker del Movement Finder.
// Estrategia simple a propósito: cache-first para el shell de la app
// (HTML/CSS/JS/íconos), network-first con fallback a caché para los
// datos (movements.json), así el buscador funciona sin señal en el
// gimnasio pero igual toma datos frescos apenas hay conexión.
//
// Cada cambio en HTML/CSS/JS que tenga que llegarle a quien ya tiene la
// app instalada necesita subir CACHE_NAME en el mismo commit.

const CACHE_NAME = "movement-finder-v3";

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

// El catálogo también se precarga: en la primera visita la página hace el
// fetch antes de que el service worker la controle, así que sin esto el
// modo offline recién funcionaría a partir de la segunda visita.
const DATA_URL = "./data/movements.json";
const DATA_URL_PATTERN = /data\/movements\.json$/;

self.addEventListener("install", (event) => {
  // cache: "reload" saltea la caché HTTP del navegador: el hosting manda
  // max-age de una semana, y sin esto una versión nueva del service worker
  // podía guardar los archivos viejos bajo el CACHE_NAME nuevo.
  const requests = [...APP_SHELL, DATA_URL].map(
    (url) => new Request(url, { cache: "reload" })
  );
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(requests))
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
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Navegación: ignoreSearch para que una búsqueda compartida
  // (?search=snatch) también abra sin conexión con el index cacheado.
  if (request.mode === "navigate") {
    event.respondWith(
      caches
        .match(request, { ignoreSearch: true })
        .then((cached) => cached || fetch(request))
    );
    return;
  }

  // Shell de la app: caché primero, red como respaldo.
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
