/*
 * sw.js
 * Service Worker: App Shell en Cache API con estrategia Cache First.
 *
 * Sin async/await: toda la asincronía con .then() y .catch().
 * No hay importScripts porque este proyecto no usa IndexedDB.
 */

'use strict';

const CACHE_STATIC_NAME = 'camara-static-v1';

const STATIC_FILES = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

/* ---------------------------------------------------------------- instalación */

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_STATIC_NAME)
      .then(function (cache) {
        return cache.addAll(STATIC_FILES);
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

/* ----------------------------------------------------------------- activación */

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (nombres) {
        return Promise.all(nombres.map(function (nombre) {
          if (nombre !== CACHE_STATIC_NAME) {
            return caches.delete(nombre);
          }
          return Promise.resolve(false);
        }));
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

/* --------------------------------------------------------------------- fetch */

self.addEventListener('fetch', function (event) {
  const peticion = event.request;

  // Solo se cachean GET. Los POST y demás van directo a la red.
  if (peticion.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(peticion)
      .then(function (enCache) {
        if (enCache) {
          return enCache;
        }

        return fetch(peticion)
          .then(function (respuesta) {
            if (respuesta && respuesta.status === 200 && respuesta.type === 'basic') {
              const copia = respuesta.clone();
              caches.open(CACHE_STATIC_NAME).then(function (cache) {
                cache.put(peticion, copia);
              });
            }
            return respuesta;
          })
          .catch(function () {
            // Navegación sin red: devolvemos el shell cacheado.
            if (peticion.mode === 'navigate') {
              return caches.match('./index.html');
            }

            return new Response('Recurso no disponible sin conexión', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
          });
      })
  );
});
