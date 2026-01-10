import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function createPrismaClient() {
  const isProduction = process.env.NODE_ENV === "production";

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Production pool settings
    max: isProduction ? 20 : 5,                    // Max connections in pool
    idleTimeoutMillis: 30000,                      // Close idle connections after 30s
    connectionTimeoutMillis: 5000,                 // Fail if can't connect in 5s
    allowExitOnIdle: !isProduction,                // Allow exit in dev
  });

  // Handle pool errors
  pool.on("error", (err) => {
    console.error("Unexpected database pool error:", err);
  });

  globalForPrisma.pool = pool;

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Alias for convenience
export const db = prisma;
export default prisma;
