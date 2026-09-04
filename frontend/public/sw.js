/* global clients */
/* =========================================================
   Nudge Push Notification Service Worker
   ========================================================= */

self.addEventListener("install", () => {
  self.skipWaiting();
});
/*
 * Activate immediately.
 */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    self.clients.claim()
  );
});

/*
 * Receive a push notification
 * from the Nudge backend.
 */
self.addEventListener(
  "push",
  (event) => {
    let data = {
      title: "Nudge",
      body: "You have a new market alert.",
      icon: "/nudge-icon.png",
      badge: "/nudge-icon.png",
    };

    /*
     * The backend sends JSON.
     * Keep a safe fallback in case
     * the payload is missing.
     */
    if (event.data) {
      try {
        data =
          event.data.json();
      } catch (error) {
        console.error(
          "Could not read push data:",
          error
        );
      }
    }

    const title =
      data.title || "Nudge";

    const options = {
      body:
        data.body ||
        "You have a new market alert.",

      icon:
        data.icon ||
        "/nudge-icon.png",

      badge:
        data.badge ||
        "/nudge-icon.png",

      requireInteraction: false,

      data: {
        url:
          data.url ||
          "/",
      },
    };

    event.waitUntil(
      self.registration.showNotification(
        title,
        options
      )
    );
  }
);

/*
 * When the user clicks the
 * browser notification, open Nudge.
 */
self.addEventListener(
  "notificationclick",
  (event) => {
    event.notification.close();

    const url =
      event.notification?.data?.url ||
      "/";

    event.waitUntil(
      clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then((clientList) => {
          /*
           * Reuse an already-open Nudge tab.
           */
          for (const client of clientList) {
            if (
              "focus" in client
            ) {
              client.navigate(
                url
              );

              return client.focus();
            }
          }

          /*
           * Otherwise open a new tab.
           */
          if (
            clients.openWindow
          ) {
            return clients.openWindow(
              url
            );
          }

          return null;
        })
    );
  }
);