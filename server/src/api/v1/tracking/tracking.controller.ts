import { Request, Response } from "express";
import {
  createTrackingStage,
  fetchTrackingByOrder,
  removeTrackingStage,
} from "./tracking.service";
import { ordersService } from "../orders/orders.service";
import prisma from "../../../config/prisma";
import { notifyUser, notifyAdminsAndStaff } from "../../../utils/notify";

// ── Stage key → DB enum ────────────────────────────────────────────────────────
const STAGE_TO_DB_STATUS: Record<string, string> = {
  order_placed:                  "CONFIRMED",
  payment_confirmed:             "CONFIRMED",
  sourcing:                      "SOURCING",
  at_china_warehouse:            "QC_PENDING",
  china_consolidation_warehouse: "QC_PENDING",
  repacking_warehouse:           "REPACKING",
  shipped_from_china:            "SHIPPED",
  in_transit:                    "SHIPPED",
  arrived_india_warehouse:       "SHIPPED",
  out_for_delivery:              "SHIPPED",
  completed:                     "DELIVERED",
};

// ── Stage key → completedStages array (cumulative) ────────────────────────────
const STAGE_TO_COMPLETED_STAGES: Record<string, string[]> = {
  order_placed:                  ["Order Placed"],
  payment_confirmed:             ["Order Placed", "Payment Confirmed"],
  sourcing:                      ["Order Placed", "Payment Confirmed", "Sourcing"],
  at_china_warehouse:            ["Order Placed", "Payment Confirmed", "Sourcing", "At China Warehouse"],
  china_consolidation_warehouse: ["Order Placed", "Payment Confirmed", "Sourcing", "At China Warehouse", "China Consolidation Warehouse"],
  repacking_warehouse:           ["Order Placed", "Payment Confirmed", "Sourcing", "At China Warehouse", "China Consolidation Warehouse", "Repacking Warehouse"],
  shipped_from_china:            ["Order Placed", "Payment Confirmed", "Sourcing", "At China Warehouse", "China Consolidation Warehouse", "Repacking Warehouse", "Shipped from China"],
  in_transit:                    ["Order Placed", "Payment Confirmed", "Sourcing", "At China Warehouse", "China Consolidation Warehouse", "Repacking Warehouse", "Shipped from China", "In Transit"],
  arrived_india_warehouse:       ["Order Placed", "Payment Confirmed", "Sourcing", "At China Warehouse", "China Consolidation Warehouse", "Repacking Warehouse", "Shipped from China", "In Transit", "Arrived India Warehouse"],
  out_for_delivery:              ["Order Placed", "Payment Confirmed", "Sourcing", "At China Warehouse", "China Consolidation Warehouse", "Repacking Warehouse", "Shipped from China", "In Transit", "Arrived India Warehouse", "Out for Delivery"],
  completed:                     ["Order Placed", "Payment Confirmed", "Sourcing", "At China Warehouse", "China Consolidation Warehouse", "Repacking Warehouse", "Shipped from China", "In Transit", "Arrived India Warehouse", "Out for Delivery", "Completed"],
};

// ── Stage key → display status string ─────────────────────────────────────────
const STAGE_TO_DISPLAY_STATUS: Record<string, string> = {
  order_placed:                  "Payment Confirmed",
  payment_confirmed:             "Payment Confirmed",
  sourcing:                      "Sourcing",
  at_china_warehouse:            "At China Warehouse",
  china_consolidation_warehouse: "China Consolidation Warehouse",
  repacking_warehouse:           "Repacking Warehouse",
  shipped_from_china:            "Shipped from China",
  in_transit:                    "In Transit",
  arrived_india_warehouse:       "Arrived India Warehouse",
  out_for_delivery:              "Out for Delivery",
  completed:                     "Completed",
};


export const postTrackingUpdate = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { stage, statusNote, updatedAt } = req.body;

    if (!stage) {
      res.status(400).json({ success: false, error: "stage is required" });
      return;
    }

    const updatedBy = (req as any).user?.userId ?? "unknown";

    // 1. Create tracking record
    const point = await createTrackingStage(orderId, {
      stage,
      statusNote,
      updatedBy,
      updatedAt: updatedAt ? new Date(updatedAt) : new Date(),
    });

    const dbStatus      = STAGE_TO_DB_STATUS[stage];
    const completedStages = STAGE_TO_COMPLETED_STAGES[stage];
    const displayStatus = STAGE_TO_DISPLAY_STATUS[stage];

    // 2. Atomically sync order.status + completedStages
    if (dbStatus && completedStages) {
      await Promise.all([
        ordersService.updateStatus(orderId, dbStatus),
        ordersService.updateCompletedStages(orderId, completedStages),
      ]);
    }

    // 3. Create notifications for client + all admin/staff users
    if (displayStatus) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          orderNumber: true,
          client: { select: { userId: true } },
        },
      });

      const orderNumber = order?.orderNumber ?? orderId;
      const noteText = statusNote ? ` — ${statusNote}` : "";
      const clientUserId = order?.client?.userId;
      const notifBase = { type: "order", relatedType: "ORDER", relatedId: orderId };

      await Promise.all([
        // Client: shipment stage update
        clientUserId
          ? notifyUser(clientUserId, {
              ...notifBase,
              title: `📦 Shipment Update — ${orderNumber}`,
              message: `Your order has reached: ${displayStatus}${noteText}`,
            })
          : Promise.resolve(),

        // Admin + Staff: shipment stage was posted
        notifyAdminsAndStaff({
          ...notifBase,
          title: `🔔 Tracking Updated — ${orderNumber}`,
          message: `Stage set to "${displayStatus}"${noteText}`,
        }),
      ]);
    }

    res.status(201).json({
      success: true,
      data: point,
      displayStatus: displayStatus ?? null,
    });
  } catch (error) {
    console.error("[postTrackingUpdate]", error);
    res.status(500).json({ success: false, error: "Failed to save tracking update" });
  }
};

export const getTracking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { orderId } = req.params;
    const points = await fetchTrackingByOrder(orderId);
    res.status(200).json({ success: true, data: points });
  } catch (error) {
    console.error("[getTracking]", error);
    res.status(500).json({ success: false, error: "Failed to fetch tracking data" });
  }
};

export const deleteTracking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    await removeTrackingStage(id);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("[deleteTracking]", error);
    res.status(500).json({ success: false, error: "Failed to delete tracking entry" });
  }
};
