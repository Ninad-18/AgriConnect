import { connectDatabases, disconnectDatabases } from "./config/connect";
import { connectRedis } from "./config/redis";
import { createApp } from "./app";
import { env } from "./config/env";

async function main(): Promise<void> {
  await connectDatabases();
  await connectRedis();

  const app = createApp();

  const server = app.listen(env.port, () => {
    console.log(`[server] AgriConnect API listening on http://localhost:${env.port}`);
    console.log(`[server] environment: ${env.nodeEnv}`);
  });

  const shutdown = async () => {
    console.log("\n[server] shutting down...");
    server.close(async () => {
      await disconnectDatabases();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[server] failed to start", err);
  process.exit(1);
});
