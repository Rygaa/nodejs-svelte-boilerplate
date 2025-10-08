<script lang="ts">
  import { writable, get } from "svelte/store";
  import { onMount } from "svelte";
  import { trpc } from "../../config/trpc";

  const publicVapidKey =
    "BKEQRvZF_qqF8UQZ4qdfipzLcQbp5quHn03BUwlv5tQF8GIPogCh_MpazQVm_LD1VdeoWPhNEmOEaWlr69XdNdQ";

  function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Svelte stores for reactive state
  export const isSubscribed = writable(false);
  export const subscription = writable<PushSubscription | null>(null);
  export const notificationStatus = writable<string>("");

  // Toast-like notification function
  function showToast(message: string, type: "success" | "error" | "info" = "info") {
    notificationStatus.set(`${type}: ${message}`);
    console.log(`[${type.toUpperCase()}] ${message}`);

    // Clear the message after 3 seconds
    setTimeout(() => {
      notificationStatus.set("");
    }, 3000);
  }

  // iOS PWA detection
  function isIOSPWA(): boolean {
    const nav = window.navigator as any;
    return nav.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
  }

  // iOS version detection
  function getIOSVersion(): number | null {
    const match = navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
    if (match) {
      return parseFloat(`${match[1]}.${match[2]}`);
    }
    return null;
  }

  // Convert PushSubscription to the format expected by the backend
  function convertSubscriptionForServer(subscription: PushSubscription) {
    const key = subscription.getKey("p256dh");
    const token = subscription.getKey("auth");

    return {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: key ? btoa(String.fromCharCode(...new Uint8Array(key))) : "",
        auth: token ? btoa(String.fromCharCode(...new Uint8Array(token))) : "",
      },
    };
  }
  async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!("serviceWorker" in navigator)) {
      throw new Error("Service workers not supported");
    }

    try {
      // Check if already registered
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        return registration;
      }

      // Register a basic service worker
      const newRegistration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });

      await new Promise((resolve) => {
        if (newRegistration.installing) {
          newRegistration.installing.addEventListener("statechange", () => {
            if (newRegistration.installing?.state === "installed") {
              resolve(void 0);
            }
          });
        } else {
          resolve(void 0);
        }
      });

      return newRegistration;
    } catch (error) {
      console.error("Service worker registration failed:", error);
      throw new Error("Failed to register service worker");
    }
  }

  // Check if already subscribed
  export async function checkSubscriptionStatus(): Promise<void> {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      try {
        const registration = await registerServiceWorker();
        if (registration) {
          const existingSubscription = await registration.pushManager.getSubscription();
          if (existingSubscription) {
            subscription.set(existingSubscription);
            isSubscribed.set(true);
          }
        }
      } catch (error) {
        console.error("Error checking subscription status:", error);
      }
    }
  }

  // Subscribe to push notifications
  export async function subscribeToPush(): Promise<void> {
    try {
      console.log("Starting push subscription process...");

      // Check if user is logged in
      const token = localStorage.getItem("auth-token");
      if (!token) {
        showToast("Please log in to subscribe to notifications", "error");
        return;
      }

      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const iosVersion = getIOSVersion();

      if (isIOS) {
        if (iosVersion && iosVersion < 16.4) {
          showToast("iOS 16.4 or later required for push notifications", "error");
          return;
        }
        if (!isIOSPWA()) {
          showToast("Please add this app to your Home Screen first, then open from Home Screen", "error");
          return;
        }
      }

      if (!("Notification" in window)) {
        showToast("This browser doesn't support notifications", "error");
        return;
      }
      if (!("serviceWorker" in navigator)) {
        showToast("This browser doesn't support service workers", "error");
        return;
      }
      if (!("PushManager" in window)) {
        showToast("This browser doesn't support push messaging", "error");
        return;
      }

      showToast("🔔 Requesting notification permission...", "info");
      let permission = Notification.permission;
      console.log("Current permission:", permission);

      if (permission === "default") {
        console.log("Requesting permission...");
        permission = await Notification.requestPermission();
        console.log("Permission result:", permission);
      }
      if (permission !== "granted") {
        showToast("Notification permission denied!", "error");
        return;
      }

      showToast("📱 Setting up service worker...", "info");
      console.log("Registering service worker...");
      const registration = await registerServiceWorker();
      if (!registration) {
        showToast("Failed to register service worker", "error");
        return;
      }
      console.log("Service worker registered:", registration);

      if (isIOS) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      showToast("🚀 Creating push subscription...", "info");
      console.log("Creating push subscription...");
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
      });

      console.log("Push subscription created:", newSubscription);
      subscription.set(newSubscription);
      isSubscribed.set(true);
      showToast("✅ Successfully subscribed to notifications!", "success");

      // Send subscription to server
      try {
        console.log("Sending subscription to server...");
        console.log("Auth token:", localStorage.getItem("auth-token") ? "Present" : "Missing");
        const subscriptionData = convertSubscriptionForServer(newSubscription);
        await trpc.notifications.saveSubscription.mutate(subscriptionData);
        showToast("🚀 Subscription saved to server!", "success");
      } catch (serverError: any) {
        console.error("Server error:", serverError);
        if (serverError.message?.includes("UNAUTHORIZED") || serverError.message?.includes("No token")) {
          showToast("Please log in to save your subscription", "error");
        } else {
          showToast("Failed to save subscription to server: " + serverError.message, "error");
        }
      }
    } catch (error: any) {
      console.error("Subscribe error:", error);
      showToast("Failed to subscribe: " + error.message, "error");
    }
  }

  // Unsubscribe from push notifications
  export async function unsubscribeFromPush(): Promise<void> {
    try {
      // Check if user is logged in
      const token = localStorage.getItem("auth-token");
      if (!token) {
        showToast("Please log in to manage your subscriptions", "error");
        return;
      }

      // Get current subscription value using Svelte's get function
      const currentSubscription = get(subscription);

      if (currentSubscription) {
        await currentSubscription.unsubscribe();

        // Notify server about unsubscription
        try {
          console.log("Sending unsubscribe to server...");
          console.log("Auth token:", localStorage.getItem("auth-token") ? "Present" : "Missing");
          const subscriptionData = convertSubscriptionForServer(currentSubscription);
          await trpc.notifications.unsubscribe.mutate(subscriptionData);
        } catch (serverError: any) {
          console.error("Failed to notify server about unsubscription:", serverError);
          if (serverError.message?.includes("UNAUTHORIZED") || serverError.message?.includes("No token")) {
            showToast("Authentication error - please log in again", "error");
          }
        }

        subscription.set(null);
        isSubscribed.set(false);
        showToast("Unsubscribed from notifications", "success");
      }
    } catch (error: any) {
      console.error("Unsubscribe error:", error);
      showToast("Failed to unsubscribe: " + error.message, "error");
    }
  }

  // Initialize push notification status on component mount
  onMount(() => {
    checkSubscriptionStatus();
  });
</script>

<div class="push-notification-container">
  <div class="push-notification-card">
    <h3>🔔 Push Notifications</h3>
    <p class="description">
      {#if $isSubscribed}
        You're subscribed to push notifications. You'll receive updates when new content is available.
      {:else}
        Subscribe to receive push notifications for important updates and new content.
      {/if}
    </p>

    <div class="button-container">
      {#if $isSubscribed}
        <button class="btn btn-secondary" on:click={unsubscribeFromPush}> 🔕 Unsubscribe </button>
      {:else}
        <button class="btn btn-primary" on:click={subscribeToPush}> 🔔 Subscribe to Notifications </button>
      {/if}
    </div>

    {#if $notificationStatus}
      <div
        class="status-message"
        class:error={$notificationStatus.includes("error")}
        class:success={$notificationStatus.includes("success")}
      >
        {$notificationStatus}
      </div>
    {/if}
  </div>
</div>

<style>
  .push-notification-container {
    display: flex;
    justify-content: center;
    padding: 20px;
  }

  .push-notification-card {
    background: white;
    border-radius: 12px;
    padding: 24px;
    box-shadow:
      0 4px 6px -1px rgba(0, 0, 0, 0.1),
      0 2px 4px -1px rgba(0, 0, 0, 0.06);
    max-width: 400px;
    width: 100%;
  }

  h3 {
    margin: 0 0 12px 0;
    color: #1f2937;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .description {
    color: #6b7280;
    margin: 0 0 20px 0;
    line-height: 1.5;
  }

  .button-container {
    margin-bottom: 16px;
  }

  .btn {
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
  }

  .btn-primary {
    background-color: #3b82f6;
    color: white;
  }

  .btn-primary:hover {
    background-color: #2563eb;
  }

  .btn-secondary {
    background-color: #6b7280;
    color: white;
  }

  .btn-secondary:hover {
    background-color: #4b5563;
  }

  .status-message {
    padding: 12px;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    background-color: #f3f4f6;
    color: #374151;
  }

  .status-message.success {
    background-color: #d1fae5;
    color: #065f46;
  }

  .status-message.error {
    background-color: #fee2e2;
    color: #991b1b;
  }
</style>
