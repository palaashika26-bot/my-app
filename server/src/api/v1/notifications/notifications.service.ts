import prisma from "../../../config/prisma";

export const notificationsService = {
  /**
   * Generate virtual notifications from recent orders and inquiries.
   * No Notification table — events are derived on-the-fly so existing
   * data immediately shows up in the bell without a migration.
   */
  async getForUser(userId: string, role: string, limit = 10) {
    const notifications: {
      id: string;
      title: string;
      message: string;
      type: string;
      relatedType: string | null;
      relatedId: string | null;
      read: boolean;
      createdAt: string;
    }[] = [];

    if (role === "CLIENT") {
      // Find the client record for this user
      const client = await prisma.client.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (client) {
        const [orders, inquiries, sourcingRequests, recentMsgs_Client] = await Promise.all([
          prisma.order.findMany({
            where: { clientId: client.id, deletedAt: null },
            orderBy: { updatedAt: "desc" },
            take: 5,
            select: { id: true, orderNumber: true, status: true, updatedAt: true },
          }),
          prisma.inquiry.findMany({
            where: { clientId: client.id },
            orderBy: { updatedAt: "desc" },
            take: 5,
            select: {
              id: true,
              inquiryNumber: true,
              status: true,
              updatedAt: true,
              items: { select: { productName: true }, take: 1 },
            },
          }),
          prisma.sourcingRequest.findMany({
            where: { clientId: client.id },
            orderBy: { updatedAt: "desc" },
            take: 5,
            select: {
              id: true,
              requestNumber: true,
              status: true,
              updatedAt: true,
              items: { select: { productName: true }, take: 1 },
            },
          }),
          // Recent team messages across all client requests
          prisma.requestMessage.findMany({
            where: {
              request: { clientId: client.id },
              senderRole: { in: ["ADMIN", "STAFF"] },
            },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
              id: true,
              text: true,
              createdAt: true,
              request: { select: { id: true, requestNumber: true } },
            },
          }),
        ]);

        for (const o of orders) {
          const statusLabel: Record<string, string> = {
            CONFIRMED: "Order confirmed — payment expected",
            SOURCING: "Your order is being sourced",
            QC_PENDING: "Quality check in progress",
            QC_PASSED: "Quality check passed",
            QC_FAILED: "Quality check failed — action needed",
            REPACKING: "Order being repacked",
            SHIPPED: "Order shipped from China",
            DELIVERED: "Order delivered",
            CANCELLED: "Order cancelled",
          };
          notifications.push({
            id: `ord-${o.id}`,
            title: `Order ${o.orderNumber}`,
            message: statusLabel[o.status] ?? o.status,
            type: "order",
            relatedType: "ORDER",
            relatedId: o.id,
            read: false,
            createdAt: o.updatedAt.toISOString(),
          });
        }

        for (const inq of inquiries) {
          const statusLabel: Record<string, string> = {
            PENDING: "Your inquiry is under review",
            REVIEWING: "Admin is reviewing your inquiry",
            QUOTED: "Quotation ready — please review",
            PARTIALLY_ACCEPTED: "Some items quoted — please review",
            ACCEPTED: "Inquiry accepted",
            REJECTED: "Inquiry rejected",
            CANCELLED: "Inquiry cancelled",
            CONVERTED: "Inquiry converted to order",
          };
          const firstItem = inq.items[0];
          const label = firstItem?.productName ?? "Custom item";
          notifications.push({
            id: `inq-${inq.id}`,
            title: `Inquiry ${inq.inquiryNumber} — ${label}`,
            message: statusLabel[inq.status] ?? inq.status,
            type: "request",
            relatedType: "INQUIRY",
            relatedId: inq.id,
            read: false,
            createdAt: inq.updatedAt.toISOString(),
          });
        }

          for (const req of sourcingRequests) {
            const statusLabel: Record<string, string> = {
              SUBMITTED: "Your sourcing request is under review",
              REVIEWING: "Team is reviewing your request",
              QUOTED: "Quotation ready — please review",
              PARTIALLY_ACCEPTED: "Some items quoted — please review",
              ACCEPTED: "Request accepted",
              REJECTED: "Request rejected",
              CANCELLED: "Request cancelled",
              CONVERTED: "Request converted to order",
            };
            const firstItem = req.items[0];
            const label = firstItem?.productName ?? "Custom item";
            notifications.push({
              id: `req-${req.id}`,
              title: `Request ${req.requestNumber} — ${label}`,
              message: statusLabel[req.status] ?? req.status,
              type: "request",
              relatedType: "REQUEST",
              relatedId: req.id,
              read: false,
              createdAt: req.updatedAt.toISOString(),
            });

            // Add unread message notifications from this request
            const recentMsgs = await prisma.requestMessage.findMany({
              where: { requestId: req.id, senderRole: { not: "CLIENT" } },
              orderBy: { createdAt: "desc" },
              take: 2,
              select: { id: true, text: true, senderRole: true, createdAt: true },
            });
            for (const msg of recentMsgs) {
              notifications.push({
                id: `msg-${msg.id}`,
                title: `New message on ${req.requestNumber}`,
                message: msg.text.slice(0, 120),
                type: "request",
                relatedType: "REQUEST",
                relatedId: req.id,
                read: false,
                createdAt: msg.createdAt.toISOString(),
            });
          }

          // Add recent team messages from non-top-5 requests
          for (const msg of recentMsgs_Client) {
            if (notifications.some(n => n.id === `msg-${msg.id}`)) continue;
            notifications.push({
              id: `msg-${msg.id}`,
              title: `New message on ${msg.request.requestNumber}`,
              message: msg.text.slice(0, 120),
              type: "request",
              relatedType: "REQUEST",
              relatedId: msg.request.id,
              read: false,
              createdAt: msg.createdAt.toISOString(),
            });
          }
      }
      }
    } else {
      // ADMIN or STAFF — show recent orders, pending inquiries, and new requests
      const [orders, inquiries, newRequests, recentMsgs_Admin] = await Promise.all([
        prisma.order.findMany({
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            orderNumber: true,
            status: true,
            createdAt: true,
            client: {
              select: { companyName: true },
            },
          },
        }),
        prisma.inquiry.findMany({
          where: { status: "PENDING" },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            inquiryNumber: true,
            createdAt: true,
            client: { select: { companyName: true } },
            items: { select: { productName: true }, take: 1 },
          },
        }),
        prisma.sourcingRequest.findMany({
          where: { status: { in: ["SUBMITTED", "REVIEWING"] } },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            requestNumber: true,
            createdAt: true,
            client: { select: { companyName: true } },
            items: { select: { productName: true }, take: 1 },
          },
        }),
        // Recent client messages across ALL requests (not just pending ones)
        prisma.requestMessage.findMany({
          where: { senderRole: "CLIENT" },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            text: true,
            senderRole: true,
            createdAt: true,
            request: {
              select: { id: true, requestNumber: true, client: { select: { companyName: true } } },
            },
          },
        }),
      ]);

      for (const inq of inquiries) {
        const firstItem = inq.items[0];
        notifications.push({
          id: `inq-${inq.id}`,
          title: "New Inquiry",
          message: `${inq.client.companyName} — ${firstItem?.productName ?? "custom item"} (${inq.inquiryNumber})`,
          type: "request",
          relatedType: "INQUIRY",
          relatedId: inq.id,
          read: false,
          createdAt: inq.createdAt.toISOString(),
        });
      }

      for (const req of newRequests) {
        const firstItem = req.items[0];
        notifications.push({
          id: `req-${req.id}`,
          title: "New Sourcing Request",
          message: `${req.client.companyName} — ${firstItem?.productName ?? "custom item"} (${req.requestNumber})`,
          type: "request",
          relatedType: "REQUEST",
          relatedId: req.id,
          read: false,
          createdAt: req.createdAt.toISOString(),
        });

        // Add unread message notifications from this request (client messages)
        const pendingMsgs = await prisma.requestMessage.findMany({
          where: { requestId: req.id, senderRole: "CLIENT" },
          orderBy: { createdAt: "desc" },
          take: 2,
          select: { id: true, text: true, senderRole: true, createdAt: true },
        });
        for (const msg of pendingMsgs) {
          notifications.push({
            id: `msg-${msg.id}`,
            title: `New message on ${req.requestNumber}`,
            message: `${req.client.companyName}: ${msg.text.slice(0, 120)}`,
            type: "request",
            relatedType: "REQUEST",
            relatedId: req.id,
            read: false,
            createdAt: msg.createdAt.toISOString(),
          });
        }
      }

      // Add recent client messages from non-pending requests
      for (const msg of recentMsgs_Admin) {
        // Avoid duplicates that were already added via pending requests above
        if (notifications.some(n => n.id === `msg-${msg.id}`)) continue;
        notifications.push({
          id: `msg-${msg.id}`,
          title: `New message on ${msg.request.requestNumber}`,
          message: `${msg.request.client.companyName}: ${msg.text.slice(0, 120)}`,
          type: "request",
          relatedType: "REQUEST",
          relatedId: msg.request.id,
          read: false,
          createdAt: msg.createdAt.toISOString(),
        });
      }

      for (const o of orders) {
        notifications.push({
          id: `ord-${o.id}`,
          title: `Order ${o.orderNumber}`,
          message: `${o.client.companyName} — ${o.status}`,
          type: "order",
          relatedType: "ORDER",
          relatedId: o.id,
          read: false,
          createdAt: o.createdAt.toISOString(),
        });
      }
    }

    // ── Hybrid: merge in real rows from the Notification table ────────────────
    // The block above derives items on-the-fly (synthetic ids like `ord-…`,
    // always read:false). Persisted rows written by notify.ts (tracking,
    // disputes, warehouse, delivery, conversion, …) live in the Notification
    // table and carry a real uuid id + real read-state. Pull them in so those
    // stages actually surface in the bell.
    const dbRows = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    for (const n of dbRows) {
      notifications.push({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        relatedType: n.relatedType ?? null,
        relatedId: n.relatedId ?? null,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
      });
    }

    // Dedupe by id. Derived synthetic ids are prefixed (`ord-`/`req-`/`inq-`/
    // `msg-`) so they never collide with table uuids; this just guards against
    // any accidental repeats. Keep the first occurrence.
    const byId = new Map<string, (typeof notifications)[number]>();
    for (const n of notifications) {
      if (!byId.has(n.id)) byId.set(n.id, n);
    }
    const merged = Array.from(byId.values());

    // Sort by date desc and cap at limit
    merged.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return merged.slice(0, limit);
  },
};
