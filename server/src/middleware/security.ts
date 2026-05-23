import { Application } from "express";
import helmet from "helmet";
import hpp from "hpp";

export const applySecurityMiddleware = (app: Application): void => {
  // Helmet sets secure HTTP response headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      // Disable COEP so API responses can be embedded cross-origin
      crossOriginEmbedderPolicy: false,
    })
  );

  // Prevent HTTP Parameter Pollution
  // e.g. ?role=CLIENT&role=ADMIN — only the last value is kept
  app.use(hpp());

  // Remove X-Powered-By so we don't advertise "Express"
  app.disable("x-powered-by");
};
