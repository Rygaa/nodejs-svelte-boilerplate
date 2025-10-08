// Basic service worker for push notifications
self.addEventListener("install", (event) => {
  console.log("Service worker installing...");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("Service worker activating...");
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  console.log("Push received:", event);

  const options = {
    body: "You have a new notification!",
    icon: "/icon-192x192.png",
    badge: "/badge-72x72.png",
    tag: "notification",
    requireInteraction: false,
    data: {
      url: "/",
    },
  };

  let title = "New Notification";
  let body = "You have a new notification!";

  if (event.data) {
    try {
      const payload = event.data.json();
      title = payload.title || title;
      body = payload.body || body;
      if (payload.icon) options.icon = payload.icon;
      if (payload.badge) options.badge = payload.badge;
      if (payload.tag) options.tag = payload.tag;
      if (payload.url) options.data.url = payload.url;
    } catch (e) {
      body = event.data.text() || body;
    }
  }

  options.body = body;

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event);

  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (const client of clientList) {
        if (client.url === url && "focus" in client) {
          return client.focus();
        }
      }

      // If no existing window/tab, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

self.addEventListener("notificationclose", (event) => {
  console.log("Notification closed:", event);
});
