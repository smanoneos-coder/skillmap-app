import { Position, type Edge, type Node } from "@xyflow/react";

import { getSkillMapNodePath } from "@/lib/skillmap-search";
import type { StudySkillMapNode } from "@/types/node";
import type { StudySkillMapEdge } from "@/types/skillmap";

export type SkillMapFlowNodeData = {
  label: string;
  description: string;
  tags: string[];
  depth: number;
  editMode: boolean;
  path: string;
  isActiveSearchMatch: boolean;
  isSearchMatch: boolean;
  skillMapNode: StudySkillMapNode;
};

export type SkillMapFlowEdgeData = {
  kind: "hierarchy" | "related";
  relatedEdgeId?: string;
};

export type SkillMapFlowNode = Node<SkillMapFlowNodeData>;
export type SkillMapFlowEdge = Edge<SkillMapFlowEdgeData>;

export type SkillMapFlowElements = {
  nodes: SkillMapFlowNode[];
  edges: SkillMapFlowEdge[];
};

const NODE_WIDTH = 220;
const HORIZONTAL_GAP = 280;
const VERTICAL_GAP = 96;

export function createSkillMapFlowElements(
  skillMap: StudySkillMapNode,
  options: {
    activeSearchPath?: string | null;
    editMode?: boolean;
    relatedEdges?: StudySkillMapEdge[];
    searchMatchPaths?: Set<string>;
    selectedRelatedEdgeId?: string | null;
  } = {},
): SkillMapFlowElements {
  const nodes: SkillMapFlowNode[] = [];
  const edges: SkillMapFlowEdge[] = [];
  const flowNodesByStudyNodeId = new Map<string, SkillMapFlowNode>();
  let nextRow = 0;

  function visit(
    node: StudySkillMapNode,
    depth: number,
    parentId: string | null,
    indexPath: string,
  ): number {
    const currentId = getFlowNodeId(indexPath);
    const childYPositions = node.children.map((child, index) =>
      visit(child, depth + 1, currentId, getSkillMapNodePath(indexPath, index)),
    );
    const isSearchMatch = options.searchMatchPaths?.has(indexPath) ?? false;
    const isActiveSearchMatch = options.activeSearchPath === indexPath;

    const layoutY =
      childYPositions.length > 0
        ? (Math.min(...childYPositions) + Math.max(...childYPositions)) / 2
        : nextRow++ * VERTICAL_GAP;
    const x = node.positionX ?? depth * HORIZONTAL_GAP;
    const y = node.positionY ?? layoutY;
    const flowNode: SkillMapFlowNode = {
      id: currentId,
      type: "skillMap",
      position: {
        x,
        y,
      },
      data: {
        label: node.title,
        description: node.description,
        tags: node.tags,
        depth,
        editMode: options.editMode ?? false,
        path: indexPath,
        isActiveSearchMatch,
        isSearchMatch,
        skillMapNode: node,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      style: {
        width: NODE_WIDTH,
        borderRadius: 8,
        borderColor: isActiveSearchMatch
          ? "hsl(var(--destructive))"
          : isSearchMatch
            ? "hsl(var(--primary))"
            : getNodeBorderColor(node.progressStatus),
        background: isActiveSearchMatch
          ? "hsl(var(--destructive) / 0.12)"
          : isSearchMatch
            ? "hsl(var(--primary) / 0.16)"
            : getNodeBackground(node.progressStatus),
        color: "hsl(var(--card-foreground))",
        boxShadow: "0 1px 2px rgb(15 23 42 / 0.08)",
        fontSize: 13,
        fontWeight: depth === 0 ? 700 : 600,
        padding: 12,
        textAlign: "left",
        whiteSpace: "normal",
        wordBreak: "break-word",
      },
    };

    nodes.push(flowNode);

    if (node.nodeId) {
      flowNodesByStudyNodeId.set(node.nodeId, flowNode);
    }

    if (parentId) {
      const parentNode = nodes.find((candidate) => candidate.id === parentId);
      const edgePositions = parentNode
        ? getEdgePositions(parentNode.position, { x, y })
        : {
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
          };

      edges.push({
        id: `hierarchy:${parentId}:${currentId}`,
        source: parentId,
        target: currentId,
        sourceHandle: `source-${edgePositions.sourcePosition.toLowerCase()}`,
        targetHandle: `target-${edgePositions.targetPosition.toLowerCase()}`,
        type: "smoothstep",
        animated: false,
        data: {
          kind: "hierarchy",
        },
        style: {
          stroke: "hsl(var(--muted-foreground))",
          strokeWidth: 1.5,
        },
      });
    }

    return y;
  }

  skillMap.children.forEach((child, index) => {
    visit(child, 0, null, getSkillMapNodePath("", index));
  });

  for (const relatedEdge of options.relatedEdges ?? []) {
    const firstNode = flowNodesByStudyNodeId.get(relatedEdge.nodeAId);
    const secondNode = flowNodesByStudyNodeId.get(relatedEdge.nodeBId);

    if (!firstNode || !secondNode) {
      continue;
    }

    const edgePositions = getEdgePositions(firstNode.position, secondNode.position);
    const selected = options.selectedRelatedEdgeId === relatedEdge.id;

    edges.push({
      id: `related:${relatedEdge.id}`,
      source: firstNode.id,
      target: secondNode.id,
      sourceHandle: `source-${edgePositions.sourcePosition.toLowerCase()}`,
      targetHandle: `target-${edgePositions.targetPosition.toLowerCase()}`,
      type: "straight",
      animated: false,
      data: {
        kind: "related",
        relatedEdgeId: relatedEdge.id,
      },
      style: {
        stroke: selected ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
        strokeDasharray: "6 4",
        strokeWidth: selected ? 2.6 : 1.6,
      },
    });
  }

  return {
    nodes,
    edges,
  };
}

export function getFlowNodeId(path: string) {
  return `node-${path}`;
}

function getNodeBorderColor(status: StudySkillMapNode["progressStatus"]) {
  if (status === "COMPLETED") {
    return "hsl(var(--accent))";
  }

  if (status === "LEARNING") {
    return "hsl(var(--primary))";
  }

  return "hsl(var(--border))";
}

function getNodeBackground(status: StudySkillMapNode["progressStatus"]) {
  if (status === "COMPLETED") {
    return "hsl(var(--accent) / 0.12)";
  }

  if (status === "LEARNING") {
    return "hsl(var(--primary) / 0.12)";
  }

  return "hsl(var(--card))";
}

function getEdgePositions(
  sourcePosition: { x: number; y: number },
  targetPosition: { x: number; y: number },
) {
  const deltaX = targetPosition.x - sourcePosition.x;
  const deltaY = targetPosition.y - sourcePosition.y;

  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    return deltaX >= 0
      ? {
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        }
      : {
          sourcePosition: Position.Left,
          targetPosition: Position.Right,
        };
  }

  return deltaY >= 0
    ? {
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      }
    : {
        sourcePosition: Position.Top,
        targetPosition: Position.Bottom,
      };
}
