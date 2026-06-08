import prisma from "../config/prisma";

// ── Canonical in-app notification helper ──────────────────────────────────────
// One place that writes rows into the `Notification` table. The bell feed
// (notifications.service.ts) reads these rows (hybrid with its derived items),
// so anything written here surfaces to the user on their next poll.
//
// NOTE: in-app bell only for now. When email / web-push are enabled later, wire
// them HERE (sendEmail + push.service) so no call site has to change — see the
// TODO seam below.

export interface NotifyData {
  type: string;
  title: string;
  message: string;
  relatedType?: string | null;
  relatedId?: string | null;
}

/** Write a single notification row for one user (e.g. the client). */
export async function notifyUser(userId: string, data: NotifyData): Promise<void> {
  if (!userId) return;
  await prisma.notification.create({
    data: {
      userId,
      type: data.type,
      title: data.title,
      message: data.message,
      relatedType: data.relatedType ?? null,
      relatedId: data.relatedId ?? null,
    },
  });
  // TODO(notify): when enabled, also push.sendToUser(userId, …) / sendEmail(…) here.
}

/** Write a notification row for every active ADMIN and STAFF user. */
export async function notifyAdminsAndStaff(data: NotifyData): Promise<void> {
  const recipients = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "STAFF"] }, isActive: true },
    select: { id: true },
  });
  if (recipients.length === 0) return;
  await prisma.notification.createMany({
    data: recipients.map((u) => ({
      userId: u.id,
      type: data.type,
      title: data.title,
      message: data.message,
      relatedType: data.relatedType ?? null,
      relatedId: data.relatedId ?? null,
    })),
  });
  // TODO(notify): when enabled, also push.sendToRoles(["ADMIN","STAFF"], …) here.
}
