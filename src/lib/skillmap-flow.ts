import { Position, type Edge, type Node } from "@xyflow/react";

import { getSkillMapNodePath } from "@/lib/skillmap-search";
import type { StudySkillMapNode } from "@/types/node";

export type SkillMapFlowNodeData = {
  label: string;
  description: string;
  tags: string[];
  depth: number;
  isActiveSearchMatch: boolean;
  isSearchMatch: boolean;
  skillMapNode: StudySkillMapNode;
};

export type SkillMapFlowNode = Node<SkillMapFlowNodeData>;

export type SkillMapFlowElements = {
  nodes: SkillMapFlowNode[];
  edges: Edge[];
};

const NODE_WIDTH = 220;
const HORIZONTAL_GAP = 280;
const VERTICAL_GAP = 96;

export function createSkillMapFlowElements(
  skillMap: StudySkillMapNode,
  options: {
    activeSearchPath?: string | null;
    searchMatchPaths?: Set<string>;
  } = {},
): SkillMapFlowElements {
  const nodes: SkillMapFlowNode[] = [];
  const edges: Edge[] = [];
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

    const y =
      childYPositions.length > 0
        ? (Math.min(...childYPositions) + Math.max(...childYPositions)) / 2
        : nextRow++ * VERTICAL_GAP;

    nodes.push({
      id: currentId,
      type: "default",
      position: {
        x: depth * HORIZONTAL_GAP,
        y,
      },
      data: {
        label: node.title,
        description: node.description,
        tags: node.tags,
        depth,
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
      },
    });

    if (parentId) {
      edges.push({
        id: `edge-${parentId}-${currentId}`,
        source: parentId,
        target: currentId,
        type: "smoothstep",
        animated: false,
        style: {
          stroke: "hsl(var(--muted-foreground))",
          strokeWidth: 1.5,
        },
      });
    }

    return y;
  }

  visit(skillMap, 0, null, "1");

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
