import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";

loadEnvFile();

const prisma = new PrismaClient();

try {
  const authUsers = await prisma.$queryRaw`
    SELECT
      id::text AS id,
      email,
      raw_user_meta_data ->> 'name' AS name,
      raw_user_meta_data ->> 'avatar_url' AS "avatarUrl"
    FROM auth.users
  `;

  for (const authUser of authUsers) {
    await prisma.user.upsert({
      where: { id: authUser.id },
      update: {
        email: authUser.email,
        name: authUser.name,
        avatarUrl: authUser.avatarUrl,
      },
      create: {
        id: authUser.id,
        email: authUser.email,
        name: authUser.name,
        avatarUrl: authUser.avatarUrl,
      },
    });
  }

  console.log(`Synced auth users to public.users: ${authUsers.length}`);
} catch (error) {
  console.error(sanitizeError(error));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

function loadEnvFile() {
  if (!existsSync(".env")) {
    return;
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

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const rawValue = trimmedLine.slice(separatorIndex + 1).trim();

    if (!key || process.env[key]) {
      continue;
    }

    process.env[key] = stripQuotes(rawValue);
  }
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function sanitizeError(error) {
  if (!(error instanceof Error)) {
    return "Auth user sync failed with an unknown error.";
  }

  const code = "code" in error && typeof error.code === "string" ? ` (${error.code})` : "";
  const message = error.message
    .replaceAll(process.env.DATABASE_URL ?? "", "[DATABASE_URL]")
    .replaceAll(process.env.DIRECT_URL ?? "", "[DIRECT_URL]")
    .replace(/at `[^`]+`/g, "at [database host]")
    .replace(/server at [^\s.]+(?:\.[^\s.]+)*:\d+/g, "server at [database host]");

  return `Auth user sync failed${code}: ${message}`;
}
