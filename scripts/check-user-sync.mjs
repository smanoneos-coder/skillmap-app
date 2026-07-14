import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";

loadEnvFile();

const prisma = new PrismaClient();

try {
  const authUsers = await prisma.$queryRaw`
    SELECT id::text AS id, email
    FROM auth.users
    ORDER BY created_at DESC
  `;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const duplicateEmails = findDuplicateEmails(users.map((user) => user.email));
  const duplicateIds = findDuplicateValues(users.map((user) => user.id));
  const authUserIds = new Set(authUsers.map((user) => user.id));
  const publicUserIds = new Set(users.map((user) => user.id));
  const syncedAuthUserCount = users.filter((user) => authUserIds.has(user.id)).length;
  const missingPublicUserCount = authUsers.filter((user) => !publicUserIds.has(user.id)).length;

  console.log(`auth.users count: ${authUsers.length}`);
  console.log(`public.users count: ${users.length}`);
  console.log(`synced auth/public user count: ${syncedAuthUserCount}`);
  console.log(`auth users missing in public.users count: ${missingPublicUserCount}`);
  console.log(`duplicate id count: ${duplicateIds.length}`);
  console.log(`duplicate email count: ${duplicateEmails.length}`);
  console.log(
    JSON.stringify(
      users.slice(0, 5).map((user) => ({
        id: maskUuid(user.id),
        email: maskEmail(user.email),
        hasName: Boolean(user.name),
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      })),
      null,
      2,
    ),
  );
} catch (error) {
  console.error(sanitizeError(error));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

function findDuplicateValues(values) {
  const counts = new Map();

  values.forEach((value) => {
    if (!value) {
      return;
    }

    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  return Array.from(counts.entries()).filter(([, count]) => count > 1);
}

function findDuplicateEmails(emails) {
  return findDuplicateValues(emails);
}

function maskUuid(value) {
  return `${value.slice(0, 8)}-****-****-****-${value.slice(-12)}`;
}

function maskEmail(value) {
  if (!value) {
    return null;
  }

  const [localPart, domain] = value.split("@");

  if (!localPart || !domain) {
    return "[masked-email]";
  }

  return `${localPart.slice(0, 2)}***@${domain}`;
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
    return "User sync check failed with an unknown error.";
  }

  const code = "code" in error && typeof error.code === "string" ? ` (${error.code})` : "";
  const message = error.message
    .replaceAll(process.env.DATABASE_URL ?? "", "[DATABASE_URL]")
    .replaceAll(process.env.DIRECT_URL ?? "", "[DIRECT_URL]")
    .replace(/at `[^`]+`/g, "at [database host]")
    .replace(/server at [^\s.]+(?:\.[^\s.]+)*:\d+/g, "server at [database host]");

  return `User sync check failed${code}: ${message}`;
}
