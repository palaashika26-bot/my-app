/**
 * Web Push registration helper.
 * Called once after a user logs in to register their browser/device.
 *
 * Flow:
 *  1. Register the service worker (/sw.js)
 *  2. Fetch the VAPID public key from the backend
 *  3. Ask the browser for push permission
 *  4. Subscribe to push and save the subscription to the backend
 */

import axiosClient from './api/axiosClient';

const SW_PATH = '/sw.js';
const LS_KEY  = 'elios_push_endpoint'; // avoid re-subscribing the same endpoint

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64   = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData  = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function registerPushNotifications(): Promise<void> {
  // Service workers / push only work in secure contexts (https or localhost)
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) {
    return; // unsupported browser — silently skip
  }

  try {
    // 1. Register service worker
    const registration = await navigator.serviceWorker.register(SW_PATH);

    // 2. Get VAPID public key
    const keyRes = await axiosClient.get<{ success: boolean; data: { publicKey: string } }>(
      '/push/vapid-public-key'
    );
    const vapidPublicKey = keyRes.data?.data?.publicKey;
    if (!vapidPublicKey) return;

    // 3. Check existing subscription
    let subscription = await registration.pushManager.getSubscription();

    // If already subscribed and we already saved it, nothing to do
    const savedEndpoint = localStorage.getItem(LS_KEY);
    if (subscription && subscription.endpoint === savedEndpoint) return;

    // 4. Ask browser for permission (won't show dialog if already granted)
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    // 5. Subscribe
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
    });

    // 6. Save to backend
    const sub = subscription.toJSON();
    await axiosClient.post('/push/subscribe', {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.keys?.p256dh,
        auth:   sub.keys?.auth,
      },
    });

    localStorage.setItem(LS_KEY, sub.endpoint!);
  } catch {
    // Push registration failures are non-critical — never crash the app
  }
}

export async function unregisterPushNotifications(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  try {
    const registration  = await navigator.serviceWorker.getRegistration(SW_PATH);
    const subscription  = await registration?.pushManager.getSubscription();
    if (!subscription) return;

    await axiosClient.post('/push/unsubscribe', { endpoint: subscription.endpoint });
    await subscription.unsubscribe();
    localStorage.removeItem(LS_KEY);
  } catch {
    // non-critical
  }
}
