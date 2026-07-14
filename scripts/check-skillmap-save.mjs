import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

loadEnvFile();

const prisma = new PrismaClient();

const checkEmail = "day2-check@example.com";
const userId = process.env.CHECK_USER_ID ?? randomUUID();

try {
  await prisma.user.deleteMany({
    where: { email: checkEmail },
  });

  const user = await prisma.user.upsert({
    where: { id: userId },
    update: {
      email: checkEmail,
      name: "Day2 Check User",
    },
    create: {
      id: userId,
      email: checkEmail,
      name: "Day2 Check User",
    },
  });

  const skillMap = await prisma.skillMap.create({
    data: {
      title: "Day2 DB Connection Check",
      prompt: "Linux スキルマップ",
      userId: user.id,
      nodes: {
        create: [
          {
            title: "Linux 基礎",
            description: "Linux学習の入口です。",
            order: 0,
            tags: ["linux", "basic"],
          },
        ],
      },
    },
    include: {
      nodes: true,
    },
  });

  const parentNode = skillMap.nodes[0];

  if (!parentNode) {
    throw new Error("Parent node was not created.");
  }

  const childNode = await prisma.node.create({
    data: {
      skillMapId: skillMap.id,
      parentId: parentNode.id,
      title: "ファイル操作",
      description: "基本的なファイル操作を学習します。",
      order: 0,
      tags: ["linux", "filesystem"],
    },
  });

  const progress = await prisma.userNodeProgress.create({
    data: {
      userId: user.id,
      nodeId: childNode.id,
      status: "LEARNING",
    },
  });

  const savedSkillMap = await prisma.skillMap.findUniqueOrThrow({
    where: { id: skillMap.id },
    include: {
      nodes: {
        orderBy: [{ parentId: "asc" }, { order: "asc" }],
      },
    },
  });

  const savedProgress = await prisma.userNodeProgress.findUniqueOrThrow({
    where: {
      userId_nodeId: {
        userId: user.id,
        nodeId: childNode.id,
      },
    },
  });

  if (savedSkillMap.nodes.length !== 2) {
    throw new Error(`Expected 2 nodes, got ${savedSkillMap.nodes.length}.`);
  }

  if (savedProgress.status !== progress.status) {
    throw new Error(`Expected progress ${progress.status}, got ${savedProgress.status}.`);
  }

  await prisma.skillMap.delete({
    where: { id: skillMap.id },
  });

  const deletedSkillMap = await prisma.skillMap.findUnique({
    where: { id: skillMap.id },
  });
  const deletedChildNode = await prisma.node.findUnique({
    where: { id: childNode.id },
  });
  const deletedProgress = await prisma.userNodeProgress.findUnique({
    where: { id: progress.id },
  });

  if (deletedSkillMap || deletedChildNode || deletedProgress) {
    throw new Error("Cascade delete check failed.");
  }

  await prisma.user.delete({
    where: { id: user.id },
  });

  const deletedUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (deletedUser) {
    throw new Error("User cleanup check failed.");
  }

  console.log(`Day2 DB check passed for user ${user.id}.`);
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
    return "Day2 DB check failed with an unknown error.";
  }

  const code = "code" in error && typeof error.code === "string" ? ` (${error.code})` : "";
  const message = error.message
    .replaceAll(process.env.DATABASE_URL ?? "", "[DATABASE_URL]")
    .replaceAll(process.env.DIRECT_URL ?? "", "[DIRECT_URL]")
    .replace(/at `[^`]+`/g, "at [database host]")
    .replace(/server at [^\s.]+(?:\.[^\s.]+)*:\d+/g, "server at [database host]");

  return `Day2 DB check failed${code}: ${message}`;
}
