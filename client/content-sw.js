self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('ethio-books-content-v1').then((cache) => cache.addAll([]))
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  const isContentRequest =
    request.destination === 'document' ||
    request.url.endsWith('.pdf') ||
    request.url.endsWith('.mp4') ||
    request.url.includes('/content/');

  if (!isContentRequest) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        const responseClone = networkResponse.clone();
        caches.open('ethio-books-content-v1').then((cache) => {
          cache.put(request, responseClone);
        });
        return networkResponse;
      });
    })
  );
});

