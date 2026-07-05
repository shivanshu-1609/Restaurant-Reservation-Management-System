import { assertRuntimeEnv, env } from "./config/env.js";
import { connectDatabase } from "./config/db.js";
import { app } from "./app.js";
import { seedAdmin, seedTables } from "./services/seedService.js";

async function startServer() {
  assertRuntimeEnv();
  await connectDatabase(env.mongoUri);
  await seedTables();
  await seedAdmin();

  app.listen(env.port, () => {
    console.log(`API listening on port ${env.port}`);
  });
}

startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
