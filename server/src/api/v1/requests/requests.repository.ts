import prisma from "../../../config/prisma";
import { Prisma } from "@prisma/client";
import { ApiError } from "../../../utils/ApiError";
import { generateRequestNumber } from "../../../utils/generateRequestNumber";
import { notifyUser } from "../../../utils/notify";

// Interactive transactions default to a 5s timeout. On Render the round-trip to
// the Supabase pooler is slow enough that updating items + request + activity
// (and, in some flows, re-reading with includes) trips P2028 "Transaction
// already closed". Give every interactive transaction generous headroom, and a
// longer maxWait to acquire a connection from the small pool.
const runTxn = <T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> =>
  prisma.$transaction(fn, { maxWait: 10000, timeout: 20000 });

const RMB_TO_INR = 11.5;

const itemInclude = {
  product: {
    // `images` (Product.images String[]) is intentionally omitted: no request
    // detail page reads it, and it needlessly bloats the single-request payload,
    // which already carries each item's base64 referenceImageUrls.
    select: { id: true, name: true, slug: true },
  },
};

const fullInclude = {
  client: {
    include: {
      user: {
        select: { firstName: true, lastName: true, email: true, phone: true },
      },
    },
  },
  items: { include: itemInclude },
  activities: {
    include: {
      user: { select: { firstName: true, lastName: true, role: true } },
    },
    orderBy: { createdAt: "desc" as const },
  },
};

interface RequestFilters {
  clientId?: string;
  status?: string;
  search?: string;
  skip: number;
  take: number;
}

async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.order.count({
    where: {
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
  });
  const seq = String(count + 1).padStart(3, "0");
  return `EL-${year}-${seq}`;
}

export const requestsRepository = {
  async create(
    clientId: string,
    data: {
      notes?: string;
      totalBudgetINR?: number;
      items: {
        type: string;
        productId?: string;
        productName: string;
        productDescription?: string;
        quantity: number;
        unit: string;
        targetPriceINR?: number;
        notes?: string;
      }[];
    }
  ) {
    const requestNumber = await generateRequestNumber();
    return prisma.sourcingRequest.create({
      data: {
        requestNumber,
        clientId,
        notes: data.notes,
        totalBudgetINR: data.totalBudgetINR ?? null,
        items: {
          create: data.items.map((item) => ({
            type: item.type as "CATALOG" | "CUSTOM",
            productId: item.productId ?? null,
            productName: item.productName,
            productDescription: item.productDescription,
            quantity: item.quantity,
            unit: item.unit,
            targetPriceINR: item.targetPriceINR ?? null,
            notes: item.notes,
          })),
        },
      },
      include: fullInclude,
    });
  },

  async findAll(filters: RequestFilters) {
    const { clientId, status, skip, take } = filters;

    const where: Record<string, unknown> = {};
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;

    const [requests, total] = await Promise.all([
      prisma.sourcingRequest.findMany({
        where,
        skip,
        take,
        include: {
          // Don't nest the required `user` relation here. Some legacy client
          // rows point at a deleted User, and Prisma then 500s the whole
          // findMany ("Inconsistent query result: Field user is required to
          // return data, got null"). Select the client scalars the list needs
          // plus userId, and stitch the users in separately below so an
          // orphaned client just yields user: null instead of throwing.
          client: { select: { id: true, companyName: true, userId: true } },
          items: { select: { id: true, productName: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.sourcingRequest.count({ where }),
    ]);

    const userIds = [
      ...new Set(
        requests
          .map((r) => r.client?.userId)
          .filter((id): id is string => Boolean(id))
      ),
    ];
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : [];
    const userById = new Map(users.map((u) => [u.id, u]));

    const requestsWithUser = requests.map((r) => ({
      ...r,
      client: r.client
        ? { ...r.client, user: userById.get(r.client.userId) ?? null }
        : null,
    }));

    return [requestsWithUser, total] as const;
  },

  async findById(id: string, clientId?: string) {
    const where: Record<string, unknown> = { id };
    if (clientId) where.clientId = clientId;

    // Resilient read for the detail endpoint. `fullInclude` nests two REQUIRED
    // user relations — client.user AND activities.user — and Prisma 500s the
    // whole query ("Inconsistent query result: Field user is required to return
    // data, got null") when either points at a deleted User (legacy orphaned
    // rows). `fullInclude` is shared by create + the post-mutation re-fetches,
    // so rather than change it in place we decouple here: pull the request
    // without nesting those users, then look the users up separately and stitch
    // them back (orphan -> user: null, which both detail pages tolerate via
    // optional chaining). Same pattern as findAll; items.product is an optional
    // relation so it stays nested safely.
    const request = await prisma.sourcingRequest.findFirst({
      where,
      include: {
        client: true, // all client scalars incl. userId; user stitched below
        items: { include: itemInclude },
        activities: { orderBy: { createdAt: "desc" as const } }, // user stitched below
      },
    });

    if (!request) throw ApiError.notFound("Request not found");

    // Resolve the client's owner and each activity author in parallel. Selects
    // mirror fullInclude exactly so the response shape is unchanged.
    const activityUserIds = [...new Set(request.activities.map((a) => a.userId))];
    const [clientUser, activityUsers] = await Promise.all([
      request.client
        ? prisma.user.findUnique({
            where: { id: request.client.userId },
            select: { firstName: true, lastName: true, email: true, phone: true },
          })
        : Promise.resolve(null),
      activityUserIds.length
        ? prisma.user.findMany({
            where: { id: { in: activityUserIds } },
            select: { id: true, firstName: true, lastName: true, role: true },
          })
        : Promise.resolve([]),
    ]);

    const activityUserById = new Map(activityUsers.map((u) => [u.id, u]));

    return {
      ...request,
      client: request.client ? { ...request.client, user: clientUser } : null,
      activities: request.activities.map((a) => {
        const u = activityUserById.get(a.userId);
        return {
          ...a,
          user: u
            ? { firstName: u.firstName, lastName: u.lastName, role: u.role }
            : null,
        };
      }),
    };
  },

  // Stage 2 — persist the logistics estimate on the request (replaces localStorage).
  async updateLogistics(
    id: string,
    data: {
      weight?: string | null;
      mode?: string | null;
      pricePerKg?: string | null;
      note?: string | null;
    }
  ) {
    const text = (v?: string | null) =>
      v == null || `${v}`.trim() === "" ? null : `${v}`.trim();
    const priceNum =
      data.pricePerKg != null && `${data.pricePerKg}`.trim() !== ""
        ? Number(data.pricePerKg)
        : null;

    return prisma.sourcingRequest.update({
      where: { id },
      data: {
        logisticsWeight: text(data.weight),
        logisticsMode: text(data.mode),
        logisticsPricePerKg:
          priceNum != null && !Number.isNaN(priceNum) ? priceNum : null,
        logisticsNote: text(data.note),
      },
      include: fullInclude,
    });
  },

  async sendQuotation(
    requestId: string,
    items: { id: string; quotedRMB: number }[],
    staffId: string,
    staffNotes?: string,
    advanceAmountINR?: number
  ) {
    // Keep the transaction short: only the writes run inside it, and the heavy
    // re-fetch (fullInclude pulls items with base64 reference images) is moved
    // out. Holding a pooled connection through that big include is what starves
    // the low-connection_limit Supabase pooler and 500s the quote under the
    // dashboard's concurrent polling. maxWait/timeout give headroom to acquire
    // a connection and finish instead of failing fast.
    await prisma.$transaction(
      async (tx) => {
        for (const item of items) {
          const quotedINR = parseFloat((item.quotedRMB * RMB_TO_INR).toFixed(2));
          await tx.requestItem.update({
            where: { id: item.id },
            data: { quotedRMB: item.quotedRMB, quotedINR, status: "QUOTED" },
          });
        }

        await tx.sourcingRequest.update({
          where: { id: requestId },
          data: {
            status: "QUOTED",
            quotedAt: new Date(),
            staffNotes: staffNotes ?? undefined,
            advanceAmountINR: advanceAmountINR ?? null,
          },
        });

        await tx.requestActivity.create({
          data: { requestId, userId: staffId, action: "Quotation sent to client" },
        });
      },
      { maxWait: 10000, timeout: 20000 }
    );

    return prisma.sourcingRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: fullInclude,
    });
  },

  async approveRequest(requestId: string, staffId: string, isAutoConverted = false) {
    const result = await runTxn(async (tx) => {
      const request = await tx.sourcingRequest.findUnique({
        where: { id: requestId },
        include: {
          items: {
            include: {
              product: { include: { supplier: { select: { id: true } } } },
            },
          },
        },
      });

      if (!request) throw ApiError.notFound("Request not found");

      const orderNumber = await generateOrderNumber();

      // Exclude rejected/countered items — only include accepted or unresponded items
      const orderItems = request.items.filter(
        (item) => item.clientResponse !== "REJECTED" && item.clientResponse !== "COUNTERED"
      );

      // Calculate total from accepted/included items
      let totalINR = 0;
      for (const item of orderItems) {
        if (item.quotedINR) {
          totalINR += parseFloat(item.quotedINR.toString()) * item.quantity;
        }
      }

      const order = await tx.order.create({
        data: {
          orderNumber,
          clientId: request.clientId,
          status: "CONFIRMED",
          subtotalINR: totalINR,
          shippingCostINR: 0,
          taxINR: 0,
          totalINR,
          advanceAmountINR: request.advanceAmountINR ?? null,
          notes: `Converted from sourcing request ${request.requestNumber}`,
          items: {
            create: orderItems.map((item) => ({
              productId: item.productId ?? null,
              supplierId: item.product?.supplier?.id ?? null,
              quantity: item.quantity,
              unitPriceCNY: Number(item.quotedRMB) || 0,
              unitPriceINR: Number(item.quotedINR) || 0,
              totalINR: (Number(item.quotedINR) || 0) * item.quantity,
              notes: item.productName,
              imageUrl: item.referenceImageUrls?.[0] ?? null,
            })),
          },
        },
      });

      const updatedRequest = await tx.sourcingRequest.update({
        where: { id: requestId },
        data: {
          status: "CONVERTED",
          approvedAt: new Date(),
          convertedOrderId: order.id,
        },
        include: fullInclude,
      });

      await tx.requestActivity.create({
        data: {
          requestId,
          userId: staffId,
          action: isAutoConverted
            ? `Order ${orderNumber} auto-created — client accepted quotation`
            : `Request approved — order ${orderNumber} created`,
        },
      });

      return { request: updatedRequest, order };
    });

    // Stage 5 — the order now exists. Notify the client in-app that their request
    // converted to an order. Runs post-commit so a rolled-back txn writes nothing.
    // No order status change here (conversion keeps the order at CONFIRMED).
    const clientUserId = (result.request as any).client?.userId as string | undefined;
    if (clientUserId) {
      await notifyUser(clientUserId, {
        type: "order",
        title: `🎉 Order Created — ${result.order.orderNumber}`,
        message: `Your request ${result.request.requestNumber} has been converted to order ${result.order.orderNumber}. Sourcing will begin shortly.`,
        relatedType: "ORDER",
        relatedId: result.order.id,
      }).catch(() => {});
    }

    return result;
  },

  async rejectRequest(requestId: string, staffId: string, reason?: string) {
    return runTxn(async (tx) => {
      const updated = await tx.sourcingRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          rejectedAt: new Date(),
          staffNotes: reason ?? undefined,
        },
        include: fullInclude,
      });

      await tx.requestActivity.create({
        data: {
          requestId,
          userId: staffId,
          action: reason ? `Request rejected: ${reason}` : "Request rejected",
        },
      });

      return updated;
    });
  },

  async cancelRequest(requestId: string, userId: string, reason?: string) {
    return runTxn(async (tx) => {
      const updated = await tx.sourcingRequest.update({
        where: { id: requestId },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelReason: reason ?? undefined,
        },
        include: fullInclude,
      });

      await tx.requestActivity.create({
        data: {
          requestId,
          userId,
          action: reason ? `Request cancelled: ${reason}` : "Request cancelled",
        },
      });

      return updated;
    });
  },

  async respondToQuotation(
    requestId: string,
    clientId: string,
    items: { id: string; response: string; counterPriceINR?: number; counterNote?: string }[]
  ) {
    return runTxn(async (tx) => {
      for (const item of items) {
        await tx.requestItem.update({
          where: { id: item.id },
          data: {
            clientResponse: item.response,
            counterPriceINR: item.counterPriceINR ?? null,
            counterNote: item.counterNote ?? null,
            respondedAt: new Date(),
            status:
              item.response === "ACCEPTED"
                ? "ACCEPTED"
                : item.response === "REJECTED"
                ? "REJECTED"
                : "COUNTERED",
          },
        });
      }

      // Determine new request status
      const allItems = await tx.requestItem.findMany({
        where: { requestId },
        select: { clientResponse: true },
      });

      const responses = allItems.map((i) => i.clientResponse).filter(Boolean);
      const allResponded = responses.length === allItems.length;

      let newStatus = "QUOTED";
      if (allResponded) {
        const hasCountered = responses.some((r) => r === "COUNTERED");
        const hasAccepted = responses.some((r) => r === "ACCEPTED");
        const hasRejected = responses.some((r) => r === "REJECTED");
        if (hasCountered) {
          newStatus = "REVIEWING";
        } else if (hasAccepted && !hasRejected) {
          newStatus = "ACCEPTED";
        } else if (!hasAccepted && hasRejected) {
          newStatus = "REJECTED";
        } else if (hasAccepted && hasRejected) {
          newStatus = "PARTIALLY_ACCEPTED";
        }
      }

      const updated = await tx.sourcingRequest.update({
        where: { id: requestId },
        data: { status: newStatus as any },
        include: fullInclude,
      });

      await tx.requestActivity.create({
        data: {
          requestId,
          userId: clientId,
          action: `Client responded to quotation`,
        },
      });

      return updated;
    });
  },

  async respondToCounter(
    requestId: string,
    staffId: string,
    items: { id: string; newQuotedRMB: number }[]
  ) {
    return runTxn(async (tx) => {
      for (const item of items) {
        const quotedINR = parseFloat((item.newQuotedRMB * RMB_TO_INR).toFixed(2));
        await tx.requestItem.update({
          where: { id: item.id },
          data: {
            quotedRMB: item.newQuotedRMB,
            quotedINR,
            status: "QUOTED",
            clientResponse: null,
            counterPriceINR: null,
            counterNote: null,
            respondedAt: null,
          },
        });
      }

      const updated = await tx.sourcingRequest.update({
        where: { id: requestId },
        data: { status: "QUOTED" },
        include: fullInclude,
      });

      await tx.requestActivity.create({
        data: {
          requestId,
          userId: staffId,
          action: "Staff responded to client counter offer",
        },
      });

      return updated;
    });
  },

  async createWithReferenceData(
    clientId: string,
    data: {
      notes?: string;
      referenceNote?: string;
      requestType?: string;
      totalBudgetINR?: number;
      items: {
        type: string;
        productId?: string;
        productName: string;
        productDescription?: string;
        quantity: number;
        unit: string;
        targetPriceINR?: number;
        notes?: string;
        referenceImageUrls?: string[];
        referenceThumbUrls?: string[];
      }[];
    }
  ) {
    const requestNumber = await generateRequestNumber();
    return prisma.sourcingRequest.create({
      data: {
        requestNumber,
        clientId,
        requestType: (data.requestType ?? "SOURCING") as "SOURCING" | "QUOTATION" | "SAMPLE",
        notes: data.notes,
        referenceNote: data.referenceNote ?? null,
        totalBudgetINR: data.totalBudgetINR ?? null,
        items: {
          create: data.items.map((item) => ({
            type: item.type as "CATALOG" | "CUSTOM",
            productId: item.productId ?? null,
            productName: item.productName,
            productDescription: item.productDescription,
            quantity: item.quantity,
            unit: item.unit,
            targetPriceINR: item.targetPriceINR ?? null,
            notes: item.notes,
            referenceImageUrls: item.referenceImageUrls ?? [],
            referenceThumbUrls: item.referenceThumbUrls ?? [],
          })),
        },
      },
      include: fullInclude,
    });
  },

  async createMessage(requestId: string, senderId: string, senderRole: string, text: string) {
    return prisma.requestMessage.create({
      data: { requestId, senderId, senderRole, text },
    });
  },

  async getMessages(requestId: string, since?: string) {
    const where: Record<string, unknown> = { requestId };
    if (since) {
      // `since` may arrive as epoch millis ("1780743849774") or an ISO string.
      // new Date("1780743849774") yields an Invalid Date (NaN), which makes
      // Prisma throw and the whole poll 500s — so parse both shapes and skip
      // the filter entirely if the value is unparseable.
      const ts = /^\d+$/.test(since) ? new Date(Number(since)) : new Date(since);
      if (!Number.isNaN(ts.getTime())) {
        where.createdAt = { gt: ts };
      }
    }
    return prisma.requestMessage.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: 100,
    });
  },
};
