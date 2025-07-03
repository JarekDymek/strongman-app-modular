// Plik: sw.js (Service Worker)

const CACHE_NAME = 'strongman-nextgen-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/main.css',
  '/js/main.js',
  '/js/api.js',
  '/js/competition.js',
  '/js/db.js',
  '/js/eventsDb.js',
  '/js/focusMode.js',
  '/js/handlers.js',
  '/js/history.js',
  '/js/initialData.js',
  '/js/persistence.js',
  '/js/state.js',
  '/js/stopwatch.js',
  // Pamiętaj, aby dodać tutaj ścieżki do ikon, gdy je utworzysz
  // '/images/icon-192.png',
  // '/images/icon-512.png'
];

// Instalacja Service Workera i zapisanie zasobów w pamięci podręcznej
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Obsługa zapytań sieciowych - serwowanie zasobów z pamięci podręcznej
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Jeśli zasób jest w pamięci podręcznej, zwróć go
        if (response) {
          return response;
        }
        // W przeciwnym razie, pobierz go z sieci
        return fetch(event.request);
      }
    )
  );
});
