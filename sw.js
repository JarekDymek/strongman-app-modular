// Plik: sw.js (Service Worker)

const CACHE_NAME = 'strongman-nextgen-cache-v5'; // Zmieniona wersja, aby wymusić aktualizację
const urlsToCache =;

// Instalacja Service Workera i zapisanie zasobów w pamięci podręcznej
self.addEventListener('install', (event) => {
  console.log('Service Worker: Instalowanie nowej wersji...');
  event.waitUntil(
    caches.open(CACHE_NAME)
     .then((cache) => {
        console.log('Otwarto cache:', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Aktywacja nowego Service Workera i usunięcie starych cache'ów
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Aktywacja nowej wersji...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName!== CACHE_NAME) {
            console.log('Service Worker: Usuwanie starego cache\'u:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});


// Obsługa zapytań sieciowych - strategia "sieć najpierw, potem cache"
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      // Jeśli sieć zawiedzie, spróbuj pobrać z cache'u
      return caches.match(event.request);
    })
  );
});
