import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// Precache semua aset yang dihasilkan oleh webpack
// Gunakan self.__WB_MANIFEST yang akan diisi oleh InjectManifest
  precacheAndRoute(self.__WB_MANIFEST || []);


// Cache halaman
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'pages-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// Cache API
registerRoute(
  ({ url }) => url.origin === 'https://story-api.dicoding.dev',
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  }),
);

// Cache gambar
  registerRoute(
  ({ request, url }) => url.origin === "https://story-api.dicoding.dev" && url.pathname.startsWith("/images/stories/") && request.destination === "images",
  async ({ event, request }) => {
    try {
      return await new CacheFirst({
        cacheName: "images-cache",
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
        ],
      }).handle({ event, request });
    } catch (error) {
      console.warn("Gagal mengambil gambar, menggunakan fallback.");
      return caches.match('/fallback-image.jpg');
    }
  }
);

// Cache font dan CSS
registerRoute(
  ({ request }) => request.destination === 'style' || request.destination === 'font',
  new StaleWhileRevalidate({
    cacheName: 'static-resources',
  }),
);

// Cache JavaScript
registerRoute(
  ({ request }) => request.destination === 'script',
  new StaleWhileRevalidate({
    cacheName: 'js-cache',
  }),
);

// Menangani push notification
self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'Notifikasi Baru',
    options: {
      body: 'Ada Pembaruan dari MyStoryHub',
      icon: '/images/icon-x144.png',
    },
  };

  if (event.data) {
    try {
      const data = event.data.json();
      const url = data.url || '/';
      notificationData = {
        title: data.title || notificationData.title,
        options: {
          ...notificationData.options,
           body: `Story Baru telah Ditambahkan`,
          data: {
            url: url,
          },
        },
      };
    } catch (error) {
      console.error('Gagal memproses data notifikasi:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(
      notificationData.title,
      notificationData.options
    )
  );
});

// Menangani klik pada notifikasi
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then((windowClients) => {
        // Cek apakah ada jendela yang sudah terbuka
        const hadWindowToFocus = windowClients.some((windowClient) => {
          if (windowClient.url === urlToOpen) {
            windowClient.focus();
            return true;
          }
          return false;
        });

        // Jika tidak ada jendela yang terbuka, buka jendela baru
        if (!hadWindowToFocus) {
          clients.openWindow(urlToOpen).catch((error) => {
            console.error('Gagal membuka jendela:', error);
          });
        }
      }),
  );
});