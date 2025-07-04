// Plik: sw.js (Service Worker)

// --- POPRAWKA: Zmieniamy nazwę cache'u. To zmusi przeglądarkę do pobrania wszystkich plików na nowo. ---
const CACHE_NAME = 'strongman-nextgen-cache-v2'; 
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
  '/js/checkpointsDb.js', // Upewnij się, że ten plik też jest na liście
  // Pamiętaj, aby dodać tutaj ścieżki do ikon, gdy je utworzysz
  // '/images/icon-192.png',
  // '/images/icon-512.png'
];

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
  // Wymuś aktywację nowego Service Workera natychmiast
  self.skipWaiting();
});

// Aktywacja nowego Service Workera i usunięcie starych cache'ów
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Aktywacja nowej wersji...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Usuwanie starego cache\'u:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Przejmij kontrolę nad wszystkimi otwartymi stronami
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
