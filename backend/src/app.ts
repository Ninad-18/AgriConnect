import express, { Application } from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { createServer } from "http";
import { Server } from "socket.io";

import { env } from "./config/env";
import { apiLimiter } from "./middleware/rateLimiter";
import { notFoundHandler, errorMiddleware } from "./middleware";
import { initSocket } from "./config/socket";

import authRoutes from "./modules/auth/auth.routes";
import farmerRoutes from "./modules/farmers/farmer.routes";
import supplierRoutes from "./modules/suppliers/supplier.routes";
import customerRoutes from "./modules/customers/customer.routes";
import procurementRoutes from "./modules/procurement/procurement.routes";
import biddingRoutes from "./modules/bidding/bidding.routes";
import allocationRoutes from "./modules/allocation/allocation.routes";
import qualityRoutes from "./modules/quality/quality.routes";
import inventoryRoutes from "./modules/inventory/inventory.routes";
import productRoutes from "./modules/products/product.routes";
import orderRoutes from "./modules/orders/order.routes";
import paymentRoutes from "./modules/payments/payment.routes";
import notificationRoutes from "./modules/notifications/notification.routes";
import marketPriceRoutes from "./modules/market-prices/marketPrice.routes";
import trackingRoutes from "./modules/tracking/tracking.routes";

export function createApp(): Application {
  const app = express();
  const httpServer = createServer(app);

  initSocket(httpServer);

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  if (env.nodeEnv === "development") {
    app.use(morgan("dev"));
  }

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "agri-connect" });
  });

  // API v1 - apply rate limit to all /api routes
  app.use("/api", apiLimiter);
  const v1 = `/api/v1`;

  app.use(`${v1}/auth`, authRoutes);
  app.use(`${v1}/farmers`, farmerRoutes);
  app.use(`${v1}/suppliers`, supplierRoutes);
  app.use(`${v1}/customers`, customerRoutes);
  app.use(`${v1}/procurements`, procurementRoutes);
  app.use(`${v1}/bids`, biddingRoutes);
  app.use(`${v1}/procurements`, allocationRoutes);
  app.use(`${v1}/quality`, qualityRoutes);
  app.use(`${v1}/inventory`, inventoryRoutes);
  app.use(`${v1}/products`, productRoutes);
  app.use(`${v1}/orders`, orderRoutes);
  app.use(`${v1}/payments`, paymentRoutes);
  app.use(`${v1}/notifications`, notificationRoutes);
  app.use(`${v1}/market-prices`, marketPriceRoutes);
  app.use(`${v1}/tracking`, trackingRoutes);

  app.use(notFoundHandler);
  app.use(errorMiddleware);

  return app;
}
