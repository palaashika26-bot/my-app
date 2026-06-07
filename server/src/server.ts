import app from "./app";
import config from "./config/env";
import prisma from "./config/prisma";

async function start() {
  try {
    await prisma.$connect();
    console.log("Database connected");

    app.listen(config.PORT, () => {
      console.log(`Elios server running on http://localhost:${config.PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();
