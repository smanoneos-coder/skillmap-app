import { Position, type Edge, type Node } from "@xyflow/react";

import { getSkillMapNodePath } from "@/lib/skillmap-search";
import type { NodeConnectionPosition, StudySkillMapNode } from "@/types/node";
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
  relationshipHighlight: "parent" | "child" | null;
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
    selectedNodePath?: string | null;
  } = {},
): SkillMapFlowElements {
  const nodes: SkillMapFlowNode[] = [];
  const edges: SkillMapFlowEdge[] = [];
  const flowNodesByStudyNodeId = new Map<string, SkillMapFlowNode>();
  let nextRow = 0;

  function visit(
    node: StudySkillMapNode,
    depth: number,
    indexPath: string,
  ): number {
    const currentId = getFlowNodeId(indexPath);
    const childPaths = node.children.map((_, index) => getSkillMapNodePath(indexPath, index));
    const childYPositions = node.children.map((child, index) =>
      visit(child, depth + 1, childPaths[index]),
    );
    const isSearchMatch = options.searchMatchPaths?.has(indexPath) ?? false;
    const isActiveSearchMatch = options.activeSearchPath === indexPath;
    const relationshipHighlight = getRelationshipHighlight(
      indexPath,
      options.selectedNodePath ?? null,
    );

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
        relationshipHighlight,
        skillMapNode: node,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      style: {
        width: NODE_WIDTH,
        borderRadius: 8,
        borderColor: getNodeFlowBorderColor({
          isActiveSearchMatch,
          isSearchMatch,
          relationshipHighlight,
          status: node.progressStatus,
        }),
        background: getNodeFlowBackground({
          isActiveSearchMatch,
          isSearchMatch,
          relationshipHighlight,
          status: node.progressStatus,
        }),
        color: "hsl(var(--card-foreground))",
        boxShadow: getNodeFlowBoxShadow(relationshipHighlight),
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

    for (const childPath of childPaths) {
      const childId = getFlowNodeId(childPath);
      const childNode = nodes.find((candidate) => candidate.id === childId);

      if (!childNode) {
        continue;
      }

      const edgePositions = getHierarchyEdgePositions(
        childNode.data.skillMapNode.parentEdgeSourcePosition,
        flowNode.position,
        childNode.position,
      );

      edges.push({
        id: `hierarchy:${currentId}:${childId}`,
        source: currentId,
        target: childId,
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
    visit(child, 0, getSkillMapNodePath("", index));
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

function getNodeFlowBorderColor({
  isActiveSearchMatch,
  isSearchMatch,
  relationshipHighlight,
  status,
}: {
  isActiveSearchMatch: boolean;
  isSearchMatch: boolean;
  relationshipHighlight: SkillMapFlowNodeData["relationshipHighlight"];
  status: StudySkillMapNode["progressStatus"];
}) {
  if (isActiveSearchMatch) {
    return "hsl(var(--destructive))";
  }

  if (relationshipHighlight === "parent") {
    return "rgb(239 68 68)";
  }

  if (relationshipHighlight === "child") {
    return "rgb(16 185 129)";
  }

  if (isSearchMatch) {
    return "hsl(var(--primary))";
  }

  return getNodeBorderColor(status);
}

function getNodeFlowBackground({
  isActiveSearchMatch,
  isSearchMatch,
  relationshipHighlight,
  status,
}: {
  isActiveSearchMatch: boolean;
  isSearchMatch: boolean;
  relationshipHighlight: SkillMapFlowNodeData["relationshipHighlight"];
  status: StudySkillMapNode["progressStatus"];
}) {
  if (isActiveSearchMatch) {
    return "hsl(var(--destructive) / 0.12)";
  }

  if (relationshipHighlight === "parent") {
    return "rgb(254 242 242)";
  }

  if (relationshipHighlight === "child") {
    return "rgb(236 253 245)";
  }

  if (isSearchMatch) {
    return "hsl(var(--primary) / 0.16)";
  }

  return getNodeBackground(status);
}

function getNodeFlowBoxShadow(relationshipHighlight: SkillMapFlowNodeData["relationshipHighlight"]) {
  if (relationshipHighlight === "parent") {
    return "0 0 0 3px rgb(239 68 68 / 0.35), 0 8px 18px rgb(239 68 68 / 0.16)";
  }

  if (relationshipHighlight === "child") {
    return "0 0 0 3px rgb(16 185 129 / 0.35), 0 8px 18px rgb(16 185 129 / 0.16)";
  }

  return "0 1px 2px rgb(15 23 42 / 0.08)";
}

function getRelationshipHighlight(path: string, selectedPath: string | null) {
  if (!selectedPath || path === selectedPath) {
    return null;
  }

  const selectedParts = selectedPath.split("-");
  const pathParts = path.split("-");
  const parentPath =
    selectedParts.length > 1 ? selectedParts.slice(0, selectedParts.length - 1).join("-") : null;

  if (parentPath && path === parentPath) {
    return "parent";
  }

  if (
    pathParts.length === selectedParts.length + 1 &&
    pathParts.slice(0, selectedParts.length).join("-") === selectedPath
  ) {
    return "child";
  }

  return null;
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

function getHierarchyEdgePositions(
  fixedSourcePosition: NodeConnectionPosition | null,
  sourcePosition: { x: number; y: number },
  targetPosition: { x: number; y: number },
) {
  if (!fixedSourcePosition) {
    return getEdgePositions(sourcePosition, targetPosition);
  }

  const sourceHandlePosition = toReactFlowPosition(fixedSourcePosition);

  return {
    sourcePosition: sourceHandlePosition,
    targetPosition: getOppositePosition(sourceHandlePosition),
  };
}

function toReactFlowPosition(position: NodeConnectionPosition) {
  if (position === "left") {
    return Position.Left;
  }

  if (position === "down") {
    return Position.Bottom;
  }

  if (position === "up") {
    return Position.Top;
  }

  return Position.Right;
}

function getOppositePosition(position: Position) {
  if (position === Position.Left) {
    return Position.Right;
  }

  if (position === Position.Right) {
    return Position.Left;
  }

  if (position === Position.Top) {
    return Position.Bottom;
  }

  return Position.Top;
}
