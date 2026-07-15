import { Position, type Edge, type Node } from "@xyflow/react";

import type { GeneratedSkillMap } from "@/lib/skillmap-schema";

export type SkillMapFlowNodeData = {
  label: string;
  description: string;
  tags: string[];
  depth: number;
};

export type SkillMapFlowNode = Node<SkillMapFlowNodeData>;

export type SkillMapFlowElements = {
  nodes: SkillMapFlowNode[];
  edges: Edge[];
};

const NODE_WIDTH = 220;
const HORIZONTAL_GAP = 280;
const VERTICAL_GAP = 96;

export function createSkillMapFlowElements(skillMap: GeneratedSkillMap): SkillMapFlowElements {
  const nodes: SkillMapFlowNode[] = [];
  const edges: Edge[] = [];
  let nextRow = 0;

  function visit(
    node: GeneratedSkillMap,
    depth: number,
    parentId: string | null,
    indexPath: string,
  ): number {
    const currentId = `node-${indexPath}`;
    const childYPositions = node.children.map((child, index) =>
      visit(child, depth + 1, currentId, `${indexPath}-${index + 1}`),
    );

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
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      style: {
        width: NODE_WIDTH,
        borderRadius: 8,
        borderColor: "hsl(var(--border))",
        background: "hsl(var(--card))",
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
