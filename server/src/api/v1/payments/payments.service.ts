import prisma from "../../../config/prisma";
import { ApiError } from "../../../utils/ApiError";
import { paymentsRepository } from "./payments.repository";
import { requestsRepository } from "../requests/requests.repository";
import { sendEmail } from "../../../config/email";
import { signImageFields } from "../../../config/storage";
import { notifyUser } from "../../../utils/notify";
import type {
  SubmitPaymentInput,
  SubmitRequestPaymentInput,
  SubmitLogisticsPaymentInput,
  VerifyPaymentInput,
} from "./payments.schema";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

export const paymentsService = {
  async submitPayment(userId: string, data: SubmitPaymentInput) {
    const client = await prisma.client.findUnique({
      where: { userId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    if (!client) throw ApiError.forbidden("Client profile not found");

    const order = await prisma.order.findFirst({
      where: { id: data.orderId, clientId: client.id, deletedAt: null },
    });
    if (!order) throw ApiError.notFound("Order not found");

    if (!["CONFIRMED", "ADVANCE_PAID"].includes(order.status)) {
      throw ApiError.badRequest(
        "Payment can only be submitted for confirmed or advance-paid orders"
      );
    }

    if (data.type === "ADVANCE" && order.status !== "CONFIRMED") {
      throw ApiError.badRequest("Advance payment is only valid for confirmed orders");
    }
    if (data.type === "BALANCE" && order.status !== "ADVANCE_PAID") {
      throw ApiError.badRequest("Balance payment is only valid after advance is paid");
    }

    const payment = await paymentsRepository.create({
      orderId: data.orderId,
      type: data.type,
      amountINR: data.amountINR,
      proofUrl: data.proofUrl,
      proofThumbUrl: data.proofThumbUrl,
      proofImageBase64: data.proofImageBase64,
      proofFileName: data.proofFileName,
      notes: data.notes,
    });

    await prisma.order.update({
      where: { id: data.orderId },
      data: { status: "PAYMENT_PENDING", displayStatus: "Payment Pending" },
    });

    const companyName = client.companyName;
    const orderNumber = order.orderNumber;
    const dashboardUrl = `${FRONTEND_URL}/admin/orders/${order.id}`;

    const staffAndAdmins = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "STAFF"] }, isActive: true },
      select: { email: true, firstName: true },
    });

    for (const staff of staffAndAdmins) {
      sendEmail({
        to: staff.email,
        subject: `Payment Proof Submitted: ${orderNumber} from ${companyName}`,
        html: paymentSubmittedEmailTemplate({
          staffName: staff.firstName,
          companyName,
          orderNumber,
          amountINR: data.amountINR,
          paymentType: data.type,
          dashboardUrl,
        }),
      }).catch(() => {});
    }

    return payment;
  },

  async verifyPayment(
    paymentId: string,
    staffUserId: string,
    action: VerifyPaymentInput["action"],
    rejectionReason?: string
  ) {
    const payment = await paymentsRepository.findById(paymentId);
    if (!payment) throw ApiError.notFound("Payment not found");
    if (payment.status !== "SUBMITTED") {
      throw ApiError.badRequest("Only submitted payments can be verified or rejected");
    }

    const clientEmail = payment.order.client.user.email;
    const clientName = payment.order.client.user.firstName;
    const orderNumber = payment.order.orderNumber;
    const amountINR = parseFloat(payment.amountINR.toString());
    const orderUrl = `${FRONTEND_URL}/client-dashboard/orders/${payment.orderId}`;

    if (action === "VERIFY") {
      const updated = await paymentsRepository.verify(paymentId, staffUserId);
      sendEmail({
        to: clientEmail,
        subject: `Payment Confirmed: ${orderNumber}`,
        html: paymentVerifiedEmailTemplate({
          clientName,
          orderNumber,
          amountINR,
          paymentType: payment.type as "ADVANCE" | "BALANCE",
          orderUrl,
        }),
      }).catch(() => {});
      return updated;
    } else {
      if (!rejectionReason?.trim()) {
        throw ApiError.badRequest("Rejection reason is required");
      }
      const updated = await paymentsRepository.reject(
        paymentId,
        staffUserId,
        rejectionReason
      );
      const resubmitUrl = `${FRONTEND_URL}/payment/${payment.orderId}`;
      sendEmail({
        to: clientEmail,
        subject: `Action Required — Payment Proof Rejected: ${orderNumber}`,
        html: paymentRejectedEmailTemplate({
          clientName,
          orderNumber,
          amountINR,
          rejectionReason,
          resubmitUrl,
        }),
      }).catch(() => {});
      return updated;
    }
  },

  async getOrderPayments(orderId: string, userId: string, role: string) {
    if (role === "CLIENT") {
      const client = await prisma.client.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!client) throw ApiError.forbidden("No client profile found");

      const order = await prisma.order.findFirst({
        where: { id: orderId, clientId: client.id, deletedAt: null },
        select: { id: true },
      });
      if (!order) throw ApiError.notFound("Order not found");
    }

    const payments = await paymentsRepository.findByOrderId(orderId);
    await signImageFields(payments, { singles: ["proofUrl", "proofThumbUrl"] });
    return payments;
  },

  // ── Request payment flow ──────────────────────────────────────────────────

  async submitRequestPayment(userId: string, data: SubmitRequestPaymentInput) {
    const client = await prisma.client.findUnique({
      where: { userId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    if (!client) throw ApiError.forbidden("Client profile not found");

    const request = await prisma.sourcingRequest.findFirst({
      where: { id: data.requestId, clientId: client.id },
      select: { id: true, requestNumber: true, status: true },
    });
    if (!request) throw ApiError.notFound("Request not found");
    if (!["ACCEPTED", "PARTIALLY_ACCEPTED"].includes(request.status)) {
      throw ApiError.badRequest("Payment can only be submitted for accepted requests");
    }

    const payment = await paymentsRepository.createRequestPayment({
      requestId: data.requestId,
      type: data.type,
      amountINR: data.amountINR,
      proofUrl: data.proofUrl,
      proofThumbUrl: data.proofThumbUrl,
      proofImageBase64: data.proofImageBase64,
      proofFileName: data.proofFileName,
      notes: data.notes,
    });

    const companyName = client.companyName;
    const requestNumber = request.requestNumber;
    const dashboardUrl = `${FRONTEND_URL}/admin/requests/${request.id}`;

    const staffAndAdmins = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "STAFF"] }, isActive: true },
      select: { email: true, firstName: true },
    });
    for (const staff of staffAndAdmins) {
      sendEmail({
        to: staff.email,
        subject: `Payment Proof Submitted: ${requestNumber} from ${companyName}`,
        html: requestPaymentSubmittedEmailTemplate({
          staffName: staff.firstName,
          companyName,
          requestNumber,
          amountINR: data.amountINR,
          paymentType: data.type,
          dashboardUrl,
        }),
      }).catch(() => {});
    }

    return payment;
  },

  async getRequestPayments(requestId: string, userId: string, role: string) {
    if (role === "CLIENT") {
      const client = await prisma.client.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!client) throw ApiError.forbidden("No client profile found");

      const request = await prisma.sourcingRequest.findFirst({
        where: { id: requestId, clientId: client.id },
        select: { id: true },
      });
      if (!request) throw ApiError.notFound("Request not found");
    }

    const payments = await paymentsRepository.findByRequestId(requestId);
    await signImageFields(payments, { singles: ["proofUrl", "proofThumbUrl"] });
    return payments;
  },

  async verifyRequestPayment(
    paymentId: string,
    staffUserId: string,
    action: VerifyPaymentInput["action"],
    rejectionReason?: string
  ) {
    const payment = await paymentsRepository.findRequestPaymentById(paymentId);
    if (!payment) throw ApiError.notFound("Payment not found");
    if (payment.status !== "SUBMITTED") {
      throw ApiError.badRequest("Only submitted payments can be verified or rejected");
    }

    const clientEmail = payment.request.client.user.email;
    const clientName = payment.request.client.user.firstName;
    const requestNumber = payment.request.requestNumber;
    const amountINR = parseFloat(payment.amountINR.toString());

    if (action === "VERIFY") {
      await paymentsRepository.verifyRequestPayment(paymentId, staffUserId);

      const result = await requestsRepository.approveRequest(payment.requestId, staffUserId);
      const orderNumber = result.order.orderNumber;
      const orderUrl = `${FRONTEND_URL}/client-dashboard/orders/${result.order.id}`;

      sendEmail({
        to: clientEmail,
        subject: `Payment Verified — Order ${orderNumber} Created`,
        html: requestPaymentVerifiedEmailTemplate({
          clientName,
          requestNumber,
          orderNumber,
          amountINR,
          orderUrl,
        }),
      }).catch(() => {});

      const staffAndAdmins = await prisma.user.findMany({
        where: { role: { in: ["ADMIN", "STAFF"] }, isActive: true },
        select: { email: true, firstName: true },
      });
      for (const staff of staffAndAdmins) {
        sendEmail({
          to: staff.email,
          subject: `New Order: ${orderNumber} (Payment Verified)`,
          html: `<p>Hi ${staff.firstName},</p><p>Payment verified for request <strong>${requestNumber}</strong>. Order <strong>${orderNumber}</strong> has been created and sourcing can begin.</p>`,
        }).catch(() => {});
      }

      return { payment, order: result.order };
    } else {
      if (!rejectionReason?.trim()) {
        throw ApiError.badRequest("Rejection reason is required");
      }
      const updated = await paymentsRepository.rejectRequestPayment(paymentId, staffUserId, rejectionReason);
      const resubmitUrl = `${FRONTEND_URL}/payment/${payment.requestId}`;
      sendEmail({
        to: clientEmail,
        subject: `Payment Proof Rejected — ${requestNumber}`,
        html: requestPaymentRejectedEmailTemplate({
          clientName,
          requestNumber,
          amountINR,
          rejectionReason,
          resubmitUrl,
        }),
      }).catch(() => {});
      return { payment: updated };
    }
  },

  // ── Logistics payment flow ──────────────────────────────────────────────────

  async submitLogisticsPayment(userId: string, data: SubmitLogisticsPaymentInput) {
    const client = await prisma.client.findUnique({
      where: { userId },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });
    if (!client) throw ApiError.forbidden("Client profile not found");

    const logistics = await prisma.logisticsRequest.findFirst({
      where: { id: data.logisticsRequestId, clientId: client.id },
      select: { id: true, requestNumber: true, status: true },
    });
    if (!logistics) throw ApiError.notFound("Logistics request not found");
    if (logistics.status !== "ACCEPTED") {
      throw ApiError.badRequest("Payment can only be submitted after accepting the quote");
    }

    const payment = await paymentsRepository.createLogisticsPayment({
      logisticsRequestId: data.logisticsRequestId,
      type: data.type,
      amountINR: data.amountINR,
      proofUrl: data.proofUrl,
      proofThumbUrl: data.proofThumbUrl,
      proofImageBase64: data.proofImageBase64,
      proofFileName: data.proofFileName,
      notes: data.notes,
    });

    await prisma.logisticsRequest.update({
      where: { id: logistics.id },
      data: { status: "PAYMENT_PENDING" },
    });

    const companyName = client.companyName;
    const dashboardUrl = `${FRONTEND_URL}/admin/logistics/${logistics.id}`;
    const staffAndAdmins = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "STAFF"] }, isActive: true },
      select: { email: true, firstName: true },
    });
    for (const staff of staffAndAdmins) {
      sendEmail({
        to: staff.email,
        subject: `Logistics Payment Submitted: ${logistics.requestNumber} from ${companyName}`,
        html: `<p>Hi ${staff.firstName},</p><p><strong>${companyName}</strong> submitted payment proof of <strong>₹${data.amountINR.toLocaleString("en-IN")}</strong> for logistics order <strong>${logistics.requestNumber}</strong>.</p><p><a href="${dashboardUrl}">View &amp; verify</a></p>`,
      }).catch(() => {});
    }

    return payment;
  },

  async getLogisticsPayments(logisticsRequestId: string, userId: string, role: string) {
    if (role === "CLIENT") {
      const client = await prisma.client.findUnique({ where: { userId }, select: { id: true } });
      if (!client) throw ApiError.forbidden("No client profile found");
      const logistics = await prisma.logisticsRequest.findFirst({
        where: { id: logisticsRequestId, clientId: client.id },
        select: { id: true },
      });
      if (!logistics) throw ApiError.notFound("Logistics request not found");
    }
    const payments = await paymentsRepository.findByLogisticsId(logisticsRequestId);
    await signImageFields(payments, { singles: ["proofUrl", "proofThumbUrl"] });
    return payments;
  },

  async verifyLogisticsPayment(
    paymentId: string,
    staffUserId: string,
    action: VerifyPaymentInput["action"],
    rejectionReason?: string
  ) {
    const payment = await paymentsRepository.findLogisticsPaymentById(paymentId);
    if (!payment) throw ApiError.notFound("Payment not found");
    if (payment.status !== "SUBMITTED") {
      throw ApiError.badRequest("Only submitted payments can be verified or rejected");
    }

    const logistics = payment.logisticsRequest;
    const clientUserId = logistics.client?.userId;
    const clientEmail = logistics.client?.user?.email;
    const clientName = logistics.client?.user?.firstName ?? "there";
    const requestNumber = logistics.requestNumber;
    const amountINR = parseFloat(payment.amountINR.toString());

    if (action === "VERIFY") {
      const updated = await paymentsRepository.verifyLogisticsPayment(paymentId, staffUserId);

      if (clientUserId) {
        await notifyUser(clientUserId, {
          type: "logistics",
          title: `✅ Logistics Order Confirmed — ${requestNumber}`,
          message: "Payment verified. Your shipment is confirmed and now At Warehouse.",
          relatedType: "LOGISTICS",
          relatedId: logistics.id,
        }).catch(() => {});
      }
      if (clientEmail) {
        sendEmail({
          to: clientEmail,
          subject: `Logistics Payment Verified — ${requestNumber} Confirmed`,
          html: `<p>Hi ${clientName},</p><p>Your payment of <strong>₹${amountINR.toLocaleString("en-IN")}</strong> for logistics order <strong>${requestNumber}</strong> has been verified. Your shipment is confirmed and now at our warehouse.</p><p><a href="${FRONTEND_URL}/client-dashboard/logistics/${logistics.id}">Track your shipment</a></p>`,
        }).catch(() => {});
      }
      return { payment: updated };
    } else {
      if (!rejectionReason?.trim()) throw ApiError.badRequest("Rejection reason is required");
      const updated = await paymentsRepository.rejectLogisticsPayment(paymentId, staffUserId, rejectionReason);
      if (clientEmail) {
        sendEmail({
          to: clientEmail,
          subject: `Logistics Payment Rejected — ${requestNumber}`,
          html: `<p>Hi ${clientName},</p><p>We could not verify your payment proof for logistics order <strong>${requestNumber}</strong>.</p><p>Reason: ${rejectionReason}</p><p><a href="${FRONTEND_URL}/payment/logistics/${logistics.id}">Resubmit payment proof</a></p>`,
        }).catch(() => {});
      }
      return { payment: updated };
    }
  },
};

// ─── Inline email templates ───────────────────────────────────────────────────

function paymentSubmittedEmailTemplate(opts: {
  staffName: string;
  companyName: string;
  orderNumber: string;
  amountINR: number;
  paymentType: string;
  dashboardUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>Payment Proof Received</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#4A3B52;padding:28px 40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Payment Proof Received</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">${opts.orderNumber}</p>
        </td></tr>
        <tr><td style="padding:32px 40px 24px;">
          <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">Hi ${opts.staffName},</p>
          <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">
            <strong>${opts.companyName}</strong> has submitted payment proof for order <strong>${opts.orderNumber}</strong>.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px;">
            <tr style="background:#f9fafb;">
              <td style="padding:12px 16px;color:#6b7280;font-size:13px;font-weight:600;">Amount</td>
              <td style="padding:12px 16px;color:#111827;font-size:15px;font-weight:700;text-align:right;">₹${opts.amountINR.toLocaleString("en-IN")}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;color:#6b7280;font-size:13px;font-weight:600;">Type</td>
              <td style="padding:12px 16px;color:#374151;font-size:14px;text-align:right;">${opts.paymentType === "ADVANCE" ? "Advance Payment" : "Balance Payment"}</td>
            </tr>
          </table>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr><td align="center" style="border-radius:8px;background:#4A3B52;">
              <a href="${opts.dashboardUrl}" style="display:inline-block;padding:13px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">View &amp; Verify Payment</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:16px 40px 28px;border-top:1px solid #f3f4f6;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">Elios Wholesale · This is an automated notification</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

function paymentVerifiedEmailTemplate(opts: {
  clientName: string;
  orderNumber: string;
  amountINR: number;
  paymentType: "ADVANCE" | "BALANCE";
  orderUrl: string;
}): string {
  const nextStep =
    opts.paymentType === "ADVANCE"
      ? "Our team will now begin sourcing your products. You will receive updates as your order progresses."
      : "Your order is fully paid and will be shipped shortly.";

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>Payment Confirmed</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#1D9E75;padding:28px 40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">✓ Payment Confirmed!</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">${opts.orderNumber}</p>
        </td></tr>
        <tr><td style="padding:32px 40px 24px;">
          <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">Hi ${opts.clientName},</p>
          <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">
            Your ${opts.paymentType === "ADVANCE" ? "advance" : "balance"} payment of <strong>₹${opts.amountINR.toLocaleString("en-IN")}</strong> for order <strong>${opts.orderNumber}</strong> has been verified and confirmed.
          </p>
          <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">${nextStep}</p>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr><td align="center" style="border-radius:8px;background:#1D9E75;">
              <a href="${opts.orderUrl}" style="display:inline-block;padding:13px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">View Order</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:16px 40px 28px;border-top:1px solid #f3f4f6;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">Elios Wholesale · This is an automated notification</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

function requestPaymentSubmittedEmailTemplate(opts: {
  staffName: string;
  companyName: string;
  requestNumber: string;
  amountINR: number;
  paymentType: string;
  dashboardUrl: string;
}): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f4f5;padding:40px 0;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;">
<tr><td style="background:#4A3B52;padding:28px 40px;text-align:center;">
<h1 style="margin:0;color:#fff;font-size:20px;">Payment Proof Received</h1>
<p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">${opts.requestNumber}</p>
</td></tr>
<tr><td style="padding:32px 40px;">
<p style="color:#374151;font-size:15px;">Hi ${opts.staffName},</p>
<p style="color:#374151;font-size:15px;"><strong>${opts.companyName}</strong> has submitted payment proof for request <strong>${opts.requestNumber}</strong>.</p>
<p style="color:#374151;font-size:15px;">Amount: <strong>₹${opts.amountINR.toLocaleString("en-IN")}</strong> (${opts.paymentType === "FULL" ? "Full Payment" : "Advance Payment"})</p>
<a href="${opts.dashboardUrl}" style="display:inline-block;padding:13px 32px;background:#4A3B52;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">View &amp; Verify Payment</a>
</td></tr>
</table></td></tr></table></body></html>`.trim();
}

function requestPaymentVerifiedEmailTemplate(opts: {
  clientName: string;
  requestNumber: string;
  orderNumber: string;
  amountINR: number;
  orderUrl: string;
}): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f4f5;padding:40px 0;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;">
<tr><td style="background:#1D9E75;padding:28px 40px;text-align:center;">
<h1 style="margin:0;color:#fff;font-size:20px;">✓ Payment Verified — Order Created!</h1>
<p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">${opts.orderNumber}</p>
</td></tr>
<tr><td style="padding:32px 40px;">
<p style="color:#374151;font-size:15px;">Hi ${opts.clientName},</p>
<p style="color:#374151;font-size:15px;">Your payment of <strong>₹${opts.amountINR.toLocaleString("en-IN")}</strong> for request <strong>${opts.requestNumber}</strong> has been verified.</p>
<p style="color:#374151;font-size:15px;">Your order <strong>${opts.orderNumber}</strong> has been created and our team will begin sourcing your products shortly.</p>
<a href="${opts.orderUrl}" style="display:inline-block;padding:13px 32px;background:#1D9E75;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">View Order</a>
</td></tr>
</table></td></tr></table></body></html>`.trim();
}

function requestPaymentRejectedEmailTemplate(opts: {
  clientName: string;
  requestNumber: string;
  amountINR: number;
  rejectionReason: string;
  resubmitUrl: string;
}): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f4f5;padding:40px 0;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;">
<tr><td style="background:#dc2626;padding:28px 40px;text-align:center;">
<h1 style="margin:0;color:#fff;font-size:20px;">Payment Proof Rejected</h1>
<p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">${opts.requestNumber}</p>
</td></tr>
<tr><td style="padding:32px 40px;">
<p style="color:#374151;font-size:15px;">Hi ${opts.clientName},</p>
<p style="color:#374151;font-size:15px;">We could not verify your payment proof of <strong>₹${opts.amountINR.toLocaleString("en-IN")}</strong> for request <strong>${opts.requestNumber}</strong>.</p>
<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0;">
<p style="margin:0;color:#991b1b;font-weight:600;">Reason: ${opts.rejectionReason}</p>
</div>
<a href="${opts.resubmitUrl}" style="display:inline-block;padding:13px 32px;background:#dc2626;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Resubmit Payment Proof</a>
</td></tr>
</table></td></tr></table></body></html>`.trim();
}

function paymentRejectedEmailTemplate(opts: {
  clientName: string;
  orderNumber: string;
  amountINR: number;
  rejectionReason: string;
  resubmitUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>Payment Proof Needs Resubmission</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#dc2626;padding:28px 40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Payment Proof Needs Resubmission</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">${opts.orderNumber}</p>
        </td></tr>
        <tr><td style="padding:32px 40px 24px;">
          <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">Hi ${opts.clientName},</p>
          <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">
            Unfortunately, we were unable to verify your payment proof of <strong>₹${opts.amountINR.toLocaleString("en-IN")}</strong> for order <strong>${opts.orderNumber}</strong>.
          </p>
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:24px;">
            <p style="margin:0;color:#991b1b;font-size:14px;font-weight:600;">Reason for rejection:</p>
            <p style="margin:8px 0 0;color:#7f1d1d;font-size:14px;">${opts.rejectionReason}</p>
          </div>
          <p style="margin:0 0 24px;color:#374151;font-size:14px;line-height:1.6;">Please upload a clear screenshot of your payment confirmation and resubmit.</p>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr><td align="center" style="border-radius:8px;background:#dc2626;">
              <a href="${opts.resubmitUrl}" style="display:inline-block;padding:13px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">Resubmit Payment Proof</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:16px 40px 28px;border-top:1px solid #f3f4f6;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">Elios Wholesale · This is an automated notification</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}
