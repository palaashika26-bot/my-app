import webpush from "web-push";
import prisma from "../../../config/prisma";
import config from "../../../config/env";

// Initialise VAPID credentials once on module load
if (config.VAPID_PUBLIC_KEY && config.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    config.VAPID_EMAIL,
    config.VAPID_PUBLIC_KEY,
    config.VAPID_PRIVATE_KEY
  );
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;   // page to open when the notification is clicked
  icon?: string;  // optional icon URL
}

// ── Save a subscription for a user ───────────────────────────────────────────

export async function saveSubscription(
  userId: string,
  endpoint: string,
  p256dh: string,
  auth: string
) {
  return prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId, endpoint, p256dh, auth },
    update: { userId },           // re-associate if user changes device
  });
}

// ── Remove a subscription (user unsubscribes / browser revokes) ───────────────

export async function removeSubscription(endpoint: string) {
  return prisma.pushSubscription.deleteMany({ where: { endpoint } });
}

// ── Send to a single user (all their subscribed devices) ─────────────────────

export async function sendToUser(userId: string, payload: PushPayload) {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  await sendToSubscriptions(subs, payload);
}

// ── Send to all users with given roles ────────────────────────────────────────

export async function sendToRoles(roles: string[], payload: PushPayload) {
  const users = await prisma.user.findMany({
    where: { role: { in: roles as any[] }, isActive: true, deletedAt: null },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);
  if (userIds.length === 0) return;

  const subs = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  });
  await sendToSubscriptions(subs, payload);
}

// ── Internal: fan-out to an array of subscriptions ───────────────────────────

async function sendToSubscriptions(
  subs: { endpoint: string; p256dh: string; auth: string }[],
  payload: PushPayload
) {
  if (!config.VAPID_PUBLIC_KEY || subs.length === 0) return;

  const notification = JSON.stringify({
    title: payload.title,
    body:  payload.body,
    url:   payload.url  ?? "/",
    icon:  payload.icon ?? "/icon-192.png",
    badge: "/icon-192.png",
  });

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        notification
      )
    )
  );

  // Remove stale subscriptions (410 Gone = browser revoked permission)
  const staleEndpoints: string[] = [];
  results.forEach((result, idx) => {
    if (
      result.status === "rejected" &&
      (result.reason as any)?.statusCode === 410
    ) {
      staleEndpoints.push(subs[idx].endpoint);
    }
  });

  if (staleEndpoints.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: staleEndpoints } },
    });
  }
}
