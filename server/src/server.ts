import app from "./app";
import config from "./config/env";
import prisma from "./config/prisma";

async function start() {
  try {
    await prisma.$connect();
    console.log("Database connected");

    const server = app.listen(config.PORT, () => {
      console.log(`Elios server running on http://localhost:${config.PORT}`);
    });

    const shutdown = async (signal: string) => {
      console.log(`Received ${signal}, shutting down gracefully...`);
      server.close(() => {
        console.log("HTTP server closed");
      });
      await prisma.$disconnect();
      process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();
