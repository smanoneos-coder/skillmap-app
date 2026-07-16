import { Prisma, type Node as PrismaNode, type ProgressStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { MAX_SKILLMAP_DEPTH, MAX_SKILLMAP_NODES } from "@/lib/skillmap-schema";
import type { GeneratedSkillMap } from "@/lib/skillmap-schema";
import type { StudySkillMapNode } from "@/types/node";
import type { SavedSkillMapDetail, SavedSkillMapSummary, StudySkillMapEdge } from "@/types/skillmap";

type SaveSkillMapInput = {
  userId: string;
  prompt: string;
  skillMap: GeneratedSkillMap;
};

export type SkillMapGraphNodeInput = {
  id: string;
  parentId: string | null;
  title: string;
  description: string;
  tags: string[];
  order: number;
  positionX: number | null;
  positionY: number | null;
  isNew: boolean;
};

export type SkillMapGraphRelatedEdgeInput = {
  id: string;
  nodeAId: string;
  nodeBId: string;
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
        include: {
          progresses: {
            where: {
              userId,
            },
          },
        },
      },
      edges: {
        orderBy: {
          createdAt: "asc",
        },
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
    skillMap: buildSkillMapTree({
      title: skillMap.title,
      description: skillMap.prompt,
      nodes: skillMap.nodes,
    }),
    relatedEdges: skillMap.edges.map(toStudySkillMapEdge),
  };
}

export async function updateNodeProgress(input: {
  userId: string;
  nodeId: string;
  status: ProgressStatus;
}) {
  const node = await prisma.node.findFirst({
    where: {
      id: input.nodeId,
      skillMap: {
        userId: input.userId,
      },
    },
    select: {
      id: true,
    },
  });

  if (!node) {
    return null;
  }

  return prisma.userNodeProgress.upsert({
    where: {
      userId_nodeId: {
        userId: input.userId,
        nodeId: input.nodeId,
      },
    },
    update: {
      status: input.status,
    },
    create: {
      userId: input.userId,
      nodeId: input.nodeId,
      status: input.status,
    },
    select: {
      nodeId: true,
      status: true,
      updatedAt: true,
    },
  });
}

export async function saveSkillMapGraph(input: {
  userId: string;
  skillMapId: string;
  nodes: SkillMapGraphNodeInput[];
  relatedEdges: SkillMapGraphRelatedEdgeInput[];
}): Promise<SavedSkillMapDetail | null> {
  return prisma.$transaction(async (tx) => {
    const skillMap = await tx.skillMap.findFirst({
      where: {
        id: input.skillMapId,
        userId: input.userId,
      },
      select: {
        id: true,
      },
    });

    if (!skillMap) {
      return null;
    }

    const existingNodes = await tx.node.findMany({
      where: {
        skillMapId: input.skillMapId,
      },
      select: {
        id: true,
      },
    });
    const existingNodeIds = new Set(existingNodes.map((node) => node.id));
    const requestNodeIds = new Set(input.nodes.map((node) => node.id));

    if (requestNodeIds.size !== input.nodes.length) {
      throw new SkillMapGraphValidationError("Node ids must be unique.");
    }

    for (const node of input.nodes) {
      if (!node.isNew && !existingNodeIds.has(node.id)) {
        throw new SkillMapGraphValidationError("Graph contains an invalid node id.");
      }

      if (node.parentId && !requestNodeIds.has(node.parentId)) {
        throw new SkillMapGraphValidationError("Graph contains an invalid parent id.");
      }

      if (node.parentId === node.id) {
        throw new SkillMapGraphValidationError("Node cannot be its own parent.");
      }
    }

    assertGraphHasNoCycles(input.nodes);

    const deletedNodeIds = Array.from(existingNodeIds).filter((nodeId) => !requestNodeIds.has(nodeId));

    if (deletedNodeIds.length > 0) {
      await tx.userNodeProgress.deleteMany({
        where: {
          nodeId: {
            in: deletedNodeIds,
          },
        },
      });
      await tx.node.deleteMany({
        where: {
          id: {
            in: deletedNodeIds,
          },
          skillMapId: input.skillMapId,
        },
      });
    }

    const persistedNodeIdsByRequestId = new Map<string, string>();

    for (const node of input.nodes) {
      if (!node.isNew) {
        persistedNodeIdsByRequestId.set(node.id, node.id);
      }
    }

    const pendingNewNodes = new Map(input.nodes.filter((node) => node.isNew).map((node) => [node.id, node]));

    while (pendingNewNodes.size > 0) {
      let createdInPass = 0;

      for (const [requestId, node] of Array.from(pendingNewNodes.entries())) {
        const parentId = node.parentId ? persistedNodeIdsByRequestId.get(node.parentId) : null;

        if (node.parentId && !parentId) {
          continue;
        }

        const createdNode = await tx.node.create({
          data: {
            skillMapId: input.skillMapId,
            parentId,
            title: node.title,
            description: node.description,
            tags: node.tags,
            order: node.order,
            positionX: node.positionX,
            positionY: node.positionY,
          },
          select: {
            id: true,
          },
        });

        persistedNodeIdsByRequestId.set(requestId, createdNode.id);
        pendingNewNodes.delete(requestId);
        createdInPass += 1;
      }

      if (createdInPass === 0) {
        throw new SkillMapGraphValidationError("Graph contains an invalid new node parent.");
      }
    }

    await Promise.all(
      input.nodes
        .filter((node) => !node.isNew)
        .map((node) =>
          tx.node.update({
            where: {
              id: node.id,
            },
            data: {
              parentId: node.parentId ? persistedNodeIdsByRequestId.get(node.parentId) ?? null : null,
              title: node.title,
              description: node.description,
              tags: node.tags,
              order: node.order,
              positionX: node.positionX,
              positionY: node.positionY,
            },
          }),
        ),
    );

    const hierarchyPairs = new Set(
      input.nodes
        .filter((node) => node.parentId)
        .map((node) => {
          const childId = persistedNodeIdsByRequestId.get(node.id);
          const parentId = node.parentId ? persistedNodeIdsByRequestId.get(node.parentId) : null;

          if (!childId || !parentId) {
            throw new SkillMapGraphValidationError("Graph contains an invalid hierarchy edge.");
          }

          return canonicalizeNodePair(parentId, childId).key;
        }),
    );
    const relatedEdgePairs = new Map<string, { nodeAId: string; nodeBId: string }>();

    for (const edge of input.relatedEdges) {
      const firstNodeId = persistedNodeIdsByRequestId.get(edge.nodeAId);
      const secondNodeId = persistedNodeIdsByRequestId.get(edge.nodeBId);

      if (!firstNodeId || !secondNodeId) {
        throw new SkillMapGraphValidationError("Related edge contains an invalid node id.");
      }

      if (firstNodeId === secondNodeId) {
        throw new SkillMapGraphValidationError("Related edge cannot connect a node to itself.");
      }

      const pair = canonicalizeNodePair(firstNodeId, secondNodeId);

      if (hierarchyPairs.has(pair.key)) {
        throw new SkillMapGraphValidationError("Related edge cannot duplicate a hierarchy edge.");
      }

      relatedEdgePairs.set(pair.key, {
        nodeAId: pair.nodeAId,
        nodeBId: pair.nodeBId,
      });
    }

    await tx.skillMapEdge.deleteMany({
      where: {
        skillMapId: input.skillMapId,
      },
    });

    if (relatedEdgePairs.size > 0) {
      await tx.skillMapEdge.createMany({
        data: Array.from(relatedEdgePairs.values()).map((edge) => ({
          skillMapId: input.skillMapId,
          nodeAId: edge.nodeAId,
          nodeBId: edge.nodeBId,
        })),
      });
    }

    const rootNode = input.nodes.find((node) => node.parentId === null);
    await tx.skillMap.update({
      where: {
        id: input.skillMapId,
      },
      data: {
        title: rootNode?.title ?? "無題のスキルマップ",
      },
    });

    const updatedSkillMap = await tx.skillMap.findFirst({
      where: {
        id: input.skillMapId,
        userId: input.userId,
      },
      include: {
        nodes: {
          orderBy: [{ parentId: "asc" }, { order: "asc" }],
          include: {
            progresses: {
              where: {
                userId: input.userId,
              },
            },
          },
        },
        edges: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!updatedSkillMap) {
      return null;
    }

    return {
      id: updatedSkillMap.id,
      title: updatedSkillMap.title,
      prompt: updatedSkillMap.prompt,
      createdAt: updatedSkillMap.createdAt.toISOString(),
      skillMap: buildSkillMapTree({
        title: updatedSkillMap.title,
        description: updatedSkillMap.prompt,
        nodes: updatedSkillMap.nodes,
      }),
      relatedEdges: updatedSkillMap.edges.map(toStudySkillMapEdge),
    };
  });
}

export async function updateNodeDetails(input: {
  userId: string;
  nodeId: string;
  title: string;
  description: string;
  tags: string[];
}) {
  return prisma.$transaction(async (tx) => {
    const node = await tx.node.findFirst({
      where: {
        id: input.nodeId,
        skillMap: {
          userId: input.userId,
        },
      },
      select: {
        id: true,
        parentId: true,
        skillMapId: true,
      },
    });

    if (!node) {
      return null;
    }

    const updatedNode = await tx.node.update({
      where: {
        id: node.id,
      },
      data: {
        title: input.title,
        description: input.description,
        tags: input.tags,
      },
      select: {
        id: true,
        title: true,
        description: true,
        tags: true,
      },
    });

    if (node.parentId === null) {
      await tx.skillMap.update({
        where: {
          id: node.skillMapId,
        },
        data: {
          title: input.title,
        },
      });
    }

    return updatedNode;
  });
}

export async function updateNodeTitle(input: {
  userId: string;
  nodeId: string;
  title: string;
}) {
  const node = await prisma.node.findUnique({
    where: {
      id: input.nodeId,
    },
    select: {
      description: true,
      tags: true,
    },
  });

  if (!node) {
    return null;
  }

  return updateNodeDetails({
    userId: input.userId,
    nodeId: input.nodeId,
    title: input.title,
    description: node.description,
    tags: parseTags(node.tags),
  });
}

export async function deleteNode(input: { userId: string; nodeId: string }) {
  return prisma.$transaction(async (tx) => {
    const node = await tx.node.findFirst({
      where: {
        id: input.nodeId,
        skillMap: {
          userId: input.userId,
        },
      },
      select: {
        id: true,
        skillMapId: true,
        parentId: true,
        order: true,
      },
    });

    if (!node) {
      return {
        status: "NOT_FOUND" as const,
      };
    }

    if (!node.parentId) {
      return {
        status: "ROOT_NODE" as const,
      };
    }

    await tx.node.delete({
      where: {
        id: node.id,
      },
    });

    await tx.node.updateMany({
      where: {
        skillMapId: node.skillMapId,
        parentId: node.parentId,
        order: {
          gt: node.order,
        },
      },
      data: {
        order: {
          decrement: 1,
        },
      },
    });

    return {
      status: "DELETED" as const,
    };
  });
}

export async function createChildNode(input: {
  userId: string;
  parentId: string;
  title: string;
  description: string;
}) {
  return prisma.$transaction(async (tx) => {
    const parentNode = await tx.node.findFirst({
      where: {
        id: input.parentId,
        skillMap: {
          userId: input.userId,
        },
      },
      select: {
        id: true,
        skillMapId: true,
        parentId: true,
      },
    });

    if (!parentNode) {
      return {
        status: "NOT_FOUND" as const,
      };
    }

    const [nodeCount, depth, childCount] = await Promise.all([
      tx.node.count({
        where: {
          skillMapId: parentNode.skillMapId,
        },
      }),
      getNodeDepth(tx, parentNode.id),
      tx.node.count({
        where: {
          parentId: parentNode.id,
        },
      }),
    ]);

    if (nodeCount >= MAX_SKILLMAP_NODES) {
      return {
        status: "TOO_MANY_NODES" as const,
      };
    }

    if (depth >= MAX_SKILLMAP_DEPTH) {
      return {
        status: "TOO_DEEP" as const,
      };
    }

    const node = await tx.node.create({
      data: {
        skillMapId: parentNode.skillMapId,
        parentId: parentNode.id,
        title: input.title,
        description: input.description,
        order: childCount,
        tags: [],
        positionX: null,
        positionY: null,
      },
      select: {
        id: true,
        title: true,
        description: true,
        tags: true,
        positionX: true,
        positionY: true,
      },
    });

    return {
      status: "CREATED" as const,
      node: {
        nodeId: node.id,
        title: node.title,
        description: node.description,
        tags: parseTags(node.tags),
        progressStatus: "NOT_STARTED" as const,
        positionX: node.positionX,
        positionY: node.positionY,
        children: [],
      },
    };
  });
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
        positionX: null,
        positionY: null,
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

async function getNodeDepth(tx: Prisma.TransactionClient, nodeId: string) {
  let depth = 1;
  let currentNode = await tx.node.findUnique({
    where: {
      id: nodeId,
    },
    select: {
      parentId: true,
    },
  });

  while (currentNode?.parentId) {
    depth += 1;
    currentNode = await tx.node.findUnique({
      where: {
        id: currentNode.parentId,
      },
      select: {
        parentId: true,
      },
    });
  }

  return depth;
}

type PrismaNodeWithProgress = PrismaNode & {
  progresses: {
    status: ProgressStatus;
  }[];
};

function buildSkillMapTree(input: {
  title: string;
  description: string;
  nodes: PrismaNodeWithProgress[];
}): StudySkillMapNode {
  const rootNodes = input.nodes
    .filter((node) => node.parentId === null)
    .sort((left, right) => left.order - right.order)
    .map((node) => buildNode(node, input.nodes));

  return {
    nodeId: null,
    title: input.title,
    description: input.description,
    tags: [],
    progressStatus: "NOT_STARTED",
    positionX: null,
    positionY: null,
    children: rootNodes,
  };
}

function buildNode(node: PrismaNodeWithProgress, allNodes: PrismaNodeWithProgress[]): StudySkillMapNode {
  const children = allNodes
    .filter((candidate) => candidate.parentId === node.id)
    .sort((left, right) => left.order - right.order)
    .map((child) => buildNode(child, allNodes));

  return {
    nodeId: node.id,
    title: node.title,
    description: node.description,
    tags: parseTags(node.tags),
    progressStatus: node.progresses[0]?.status ?? "NOT_STARTED",
    positionX: node.positionX,
    positionY: node.positionY,
    children,
  };
}

function parseTags(value: Prisma.JsonValue) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((tag): tag is string => typeof tag === "string");
}

function toStudySkillMapEdge(edge: { id: string; nodeAId: string; nodeBId: string }): StudySkillMapEdge {
  return {
    id: edge.id,
    nodeAId: edge.nodeAId,
    nodeBId: edge.nodeBId,
  };
}

function canonicalizeNodePair(firstNodeId: string, secondNodeId: string) {
  const [nodeAId, nodeBId] =
    firstNodeId < secondNodeId ? [firstNodeId, secondNodeId] : [secondNodeId, firstNodeId];

  return {
    key: `${nodeAId}:${nodeBId}`,
    nodeAId,
    nodeBId,
  };
}

export class SkillMapGraphValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SkillMapGraphValidationError";
  }
}

function assertGraphHasNoCycles(nodes: SkillMapGraphNodeInput[]) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));

  for (const node of nodes) {
    const visitedNodeIds = new Set<string>();
    let currentParentId = node.parentId;

    while (currentParentId) {
      if (currentParentId === node.id || visitedNodeIds.has(currentParentId)) {
        throw new SkillMapGraphValidationError("Graph cannot contain cycles.");
      }

      visitedNodeIds.add(currentParentId);
      currentParentId = nodesById.get(currentParentId)?.parentId ?? null;
    }
  }
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
