import { Prisma, type Node as PrismaNode } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { GeneratedSkillMap } from "@/lib/skillmap-schema";
import type { SavedSkillMapDetail, SavedSkillMapSummary } from "@/types/skillmap";

type SaveSkillMapInput = {
  userId: string;
  prompt: string;
  skillMap: GeneratedSkillMap;
};

export async function saveSkillMap({ userId, prompt, skillMap }: SaveSkillMapInput) {
  return prisma.$transaction(async (tx) => {
    const savedSkillMap = await tx.skillMap.create({
      data: {
        title: skillMap.title,
        prompt,
        userId,
      },
    });

    await createNodeTree(tx, {
      skillMapId: savedSkillMap.id,
      parentId: null,
      node: skillMap,
      order: 0,
    });

    const nodeCount = await tx.node.count({
      where: {
        skillMapId: savedSkillMap.id,
      },
    });

    return toSavedSkillMapSummary({
      id: savedSkillMap.id,
      title: savedSkillMap.title,
      prompt: savedSkillMap.prompt,
      createdAt: savedSkillMap.createdAt,
      nodeCount,
    });
  });
}

export async function listSavedSkillMaps(userId: string): Promise<SavedSkillMapSummary[]> {
  const skillMaps = await prisma.skillMap.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      _count: {
        select: {
          nodes: true,
        },
      },
    },
  });

  return skillMaps.map((skillMap) =>
    toSavedSkillMapSummary({
      id: skillMap.id,
      title: skillMap.title,
      prompt: skillMap.prompt,
      createdAt: skillMap.createdAt,
      nodeCount: skillMap._count.nodes,
    }),
  );
}

export async function getSavedSkillMapDetail(
  userId: string,
  skillMapId: string,
): Promise<SavedSkillMapDetail | null> {
  const skillMap = await prisma.skillMap.findFirst({
    where: {
      id: skillMapId,
      userId,
    },
    include: {
      nodes: {
        orderBy: [{ parentId: "asc" }, { order: "asc" }],
      },
    },
  });

  if (!skillMap) {
    return null;
  }

  return {
    id: skillMap.id,
    title: skillMap.title,
    prompt: skillMap.prompt,
    createdAt: skillMap.createdAt.toISOString(),
    skillMap: buildSkillMapTree(skillMap.nodes),
  };
}

async function createNodeTree(
  tx: Prisma.TransactionClient,
  input: {
    skillMapId: string;
    parentId: string | null;
    node: GeneratedSkillMap;
    order: number;
  },
) {
  const savedNode = await tx.node.create({
    data: {
      skillMapId: input.skillMapId,
      parentId: input.parentId,
      title: input.node.title,
      description: input.node.description,
      order: input.order,
      tags: input.node.tags,
    },
  });

  for (const [index, child] of input.node.children.entries()) {
    await createNodeTree(tx, {
      skillMapId: input.skillMapId,
      parentId: savedNode.id,
      node: child,
      order: index,
    });
  }
}

function buildSkillMapTree(nodes: PrismaNode[]): GeneratedSkillMap {
  const rootNode = nodes.find((node) => node.parentId === null);

  if (!rootNode) {
    throw new Error("Saved skill map does not contain a root node.");
  }

  return buildNode(rootNode, nodes);
}

function buildNode(node: PrismaNode, allNodes: PrismaNode[]): GeneratedSkillMap {
  const children = allNodes
    .filter((candidate) => candidate.parentId === node.id)
    .sort((left, right) => left.order - right.order)
    .map((child) => buildNode(child, allNodes));

  return {
    title: node.title,
    description: node.description,
    tags: parseTags(node.tags),
    children,
  };
}

function parseTags(value: Prisma.JsonValue) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((tag): tag is string => typeof tag === "string");
}

function toSavedSkillMapSummary(input: {
  id: string;
  title: string;
  prompt: string;
  createdAt: Date;
  nodeCount: number;
}): SavedSkillMapSummary {
  return {
    id: input.id,
    title: input.title,
    prompt: input.prompt,
    createdAt: input.createdAt.toISOString(),
    nodeCount: input.nodeCount,
  };
}
