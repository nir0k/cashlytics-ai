"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(registrations.map((registration) => registration.unregister()))
        )
        .catch((err) => console.error("[SW] Unregister failed:", err));

      if ("caches" in window) {
        caches
          .keys()
          .then((keys) =>
            Promise.all(
              keys.filter((key) => key.startsWith("cashlytics-")).map((key) => caches.delete(key))
            )
          )
          .catch((err) => console.error("[SW] Cache cleanup failed:", err));
      }

      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((err) => console.error("[SW] Registrierung fehlgeschlagen:", err));
  }, []);

  return null;
}
