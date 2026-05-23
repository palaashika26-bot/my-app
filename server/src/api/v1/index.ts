import { Router } from "express";
import productsRouter from "./products/products.routes";
import categoriesRouter from "./categories/categories.routes";
import ordersRouter from "./orders/orders.routes";
import suppliersRouter from "./suppliers/suppliers.routes";
import authRouter from "./auth/auth.routes";

const v1Router = Router();

v1Router.use("/auth", authRouter);
v1Router.use("/products", productsRouter);
v1Router.use("/categories", categoriesRouter);
v1Router.use("/orders", ordersRouter);
v1Router.use("/suppliers", suppliersRouter);

export default v1Router;
