"use client";

import { useEffect, useState } from "react";
import { Bell, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Standard web push helper — converts a URL-safe base64 VAPID public key
// to a Uint8Array backed by a plain ArrayBuffer, as required by
// PushManager.subscribe()'s applicationServerKey field.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type SupportState = "checking" | "supported" | "unsupported";
type PermissionState = "default" | "granted" | "denied" | "unknown";

export function NotificationSettings() {
  const [support, setSupport] = useState<SupportState>("checking");
  const [permission, setPermission] = useState<PermissionState>("unknown");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  // On mount: detect browser support, current permission, and subscription state.
  useEffect(() => {
    const isSupported =
      typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;

    if (!isSupported) {
      setSupport("unsupported");
      return;
    }

    setSupport("supported");
    setPermission(Notification.permission as PermissionState);

    // Check whether there is already an active push subscription.
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((sub) => {
        setSubscribed(sub !== null);
      })
      .catch(() => {
        // If the SW isn't ready yet or errored, treat as not subscribed.
        setSubscribed(false);
      });
  }, []);

  async function handleEnable() {
    setLoading(true);
    try {
      // 1. Request browser permission.
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);

      if (result !== "granted") {
        toast.error("Benachrichtigungen wurden nicht erlaubt.");
        setLoading(false);
        return;
      }

      // 2. Get the SW registration (wait until it's ready).
      const registration = await navigator.serviceWorker.ready;

      // 3. Fetch VAPID public key from the backend.
      const keyRes = await fetch("/api/push/vapid-public-key");
      if (!keyRes.ok) {
        throw new Error("VAPID-Schlüssel konnte nicht abgerufen werden.");
      }
      const { publicKey } = await keyRes.json();

      // 4. Subscribe the browser to push.
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // 5. Send the subscription object to the server for storage.
      const subRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });
      if (!subRes.ok) {
        throw new Error("Abonnement konnte nicht gespeichert werden.");
      }

      setSubscribed(true);
      toast.success("Push-Benachrichtigungen aktiviert.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler.";
      toast.error(`Fehler: ${message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable() {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        setSubscribed(false);
        setLoading(false);
        return;
      }

      // 1. Unsubscribe at the browser level.
      await subscription.unsubscribe();

      // 2. Tell the server to remove this endpoint.
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });

      setSubscribed(false);
      toast.success("Push-Benachrichtigungen deaktiviert.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler.";
      toast.error(`Fehler beim Deaktivieren: ${message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleToggle(checked: boolean) {
    if (checked) {
      handleEnable();
    } else {
      handleDisable();
    }
  }

  // ── Derived display values ──────────────────────────────────────────────────

  const isUnsupported = support === "unsupported";
  const isChecking = support === "checking";
  const isDenied = permission === "denied";
  const isDisabled = isUnsupported || isChecking || loading || isDenied;

  function statusLabel(): string {
    if (isChecking) return "Wird geprüft…";
    if (isUnsupported) return "Nicht unterstützt";
    if (isDenied) return "Blockiert";
    if (loading) return subscribed ? "Wird deaktiviert…" : "Wird aktiviert…";
    if (subscribed) return "Aktiviert";
    return "Deaktiviert";
  }

  function statusColor(): string {
    if (isUnsupported || isDenied) return "text-destructive";
    if (subscribed && !loading) return "text-success";
    return "text-muted-foreground";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="from-primary/20 to-primary/5 flex size-8 items-center justify-center rounded-xl bg-gradient-to-br">
            <Bell className="text-primary h-4 w-4" />
          </span>
          Push-Benachrichtigungen
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        <p className="text-muted-foreground text-sm leading-relaxed">
          Erhalte sofortige Benachrichtigungen über neue Transaktionen, Budgetwarnungen und
          monatliche Zusammenfassungen — auch wenn Cashlytics im Hintergrund läuft.
        </p>

        {/* Toggle row */}
        <div className="border-border/60 flex items-center justify-between rounded-xl border px-4 py-3 dark:border-white/[0.06]">
          <div className="flex flex-col gap-0.5">
            <Label htmlFor="push-toggle" className="cursor-pointer text-sm font-medium">
              Benachrichtigungen empfangen
            </Label>
            <span className={`text-xs font-medium ${statusColor()}`}>{statusLabel()}</span>
          </div>

          <Switch
            id="push-toggle"
            checked={subscribed}
            onCheckedChange={handleToggle}
            disabled={isDisabled}
            aria-label="Push-Benachrichtigungen umschalten"
          />
        </div>

        {/* Denied-permission warning */}
        {isDenied && (
          <div className="border-destructive/20 bg-destructive/5 flex items-start gap-3 rounded-xl border px-4 py-3">
            <AlertTriangle className="text-destructive mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-destructive text-sm leading-relaxed">
              Benachrichtigungen sind in deinem Browser blockiert. Öffne die Website-Einstellungen
              deines Browsers und erlaube Benachrichtigungen für diese Seite, um sie zu aktivieren.
            </p>
          </div>
        )}

        {/* Unsupported browser notice */}
        {isUnsupported && (
          <div className="border-border/60 bg-muted/40 flex items-start gap-3 rounded-xl border px-4 py-3 dark:border-white/[0.06]">
            <AlertTriangle className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-muted-foreground text-sm leading-relaxed">
              Dein Browser unterstützt keine Push-Benachrichtigungen. Bitte verwende einen modernen
              Browser wie Chrome, Edge oder Firefox.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
