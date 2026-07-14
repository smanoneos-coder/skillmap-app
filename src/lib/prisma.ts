import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: getRequiredDatabaseUrl(),
      },
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

function getRequiredDatabaseUrl() {
  const databaseUrl =
    process.env.NODE_ENV === "development"
      ? (readEnvFileValue("DATABASE_URL") ?? process.env.DATABASE_URL)
      : process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("Prisma datasource URL is not configured.");
  }

  return databaseUrl;
}

function readEnvFileValue(key: string) {
  if (!existsSync(".env")) {
    return null;
  }

  const lines = readFileSync(".env", "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const envKey = trimmedLine.slice(0, separatorIndex).trim();

    if (envKey !== key) {
      continue;
    }

    return stripQuotes(trimmedLine.slice(separatorIndex + 1).trim());
  }

  return null;
}

function stripQuotes(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
