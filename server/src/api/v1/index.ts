import { Router } from "express";
import productsRouter from "./products/products.routes";
import categoriesRouter from "./categories/categories.routes";
import ordersRouter from "./orders/orders.routes";
import suppliersRouter from "./suppliers/suppliers.routes";
import authRouter from "./auth/auth.routes";
import adminRouter from "./admin/admin.routes";
import notificationsRouter from "./notifications/notifications.routes";
import inquiriesRouter from "./inquiries/inquiries.routes";
import requestsRouter from "./requests/requests.routes";
import paymentsRouter from "./payments/payments.routes";
import pushRouter from "./push/push.routes";
import disputesRouter from "./disputes/disputes.routes";
import trackingRouter from "./tracking/tracking.routes";
import uploadsRouter from "./uploads/uploads.routes";
import supportRouter from "./support/support.routes";
import logisticsRouter from "./logistics/logistics.routes";

const v1Router = Router();

v1Router.use("/auth", authRouter);
v1Router.use("/products", productsRouter);
v1Router.use("/categories", categoriesRouter);
v1Router.use("/orders", ordersRouter);
v1Router.use("/suppliers", suppliersRouter);
v1Router.use("/admin", adminRouter);
v1Router.use("/notifications", notificationsRouter);
v1Router.use("/inquiries", inquiriesRouter);
v1Router.use("/requests", requestsRouter);
v1Router.use("/payments", paymentsRouter);
v1Router.use("/push", pushRouter);
v1Router.use("/disputes", disputesRouter);
v1Router.use("/tracking", trackingRouter);
v1Router.use("/uploads", uploadsRouter);
v1Router.use("/support", supportRouter);
v1Router.use("/logistics", logisticsRouter);

export default v1Router;
