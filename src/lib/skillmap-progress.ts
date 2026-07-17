import type { GeneratedSkillMap } from "@/lib/skillmap-schema";
import type { ProgressStatus } from "@/types/progress";
import type { StudySkillMapNode } from "@/types/node";

export type SkillMapProgressStats = {
  completedCount: number;
  totalCount: number;
  percent: number;
};

type AutoArrangeDirection = "right" | "down" | "left" | "up";

type AutoArrangeBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

const AUTO_LAYOUT_PRIMARY_GAP = 320;
const AUTO_LAYOUT_PERPENDICULAR_GAP = 150;
const AUTO_LAYOUT_ROOT_GAP = 220;
const AUTO_LAYOUT_NODE_WIDTH = 240;
const AUTO_LAYOUT_NODE_HEIGHT = 96;
const AUTO_LAYOUT_DIRECTIONS: AutoArrangeDirection[] = ["right", "down", "left", "up"];

export function createStudySkillMap(skillMap: GeneratedSkillMap): StudySkillMapNode {
  return {
    nodeId: null,
    title: skillMap.title,
    description: skillMap.description,
    tags: skillMap.tags,
    progressStatus: "NOT_STARTED",
    positionX: null,
    positionY: null,
    parentLocked: false,
    parentEdgeSourcePosition: null,
    children: [createStudySkillMapNode(skillMap)],
  };
}

function createStudySkillMapNode(skillMap: GeneratedSkillMap): StudySkillMapNode {
  return {
    nodeId: null,
    title: skillMap.title,
    description: skillMap.description,
    tags: skillMap.tags,
    progressStatus: "NOT_STARTED",
    positionX: null,
    positionY: null,
    parentLocked: false,
    parentEdgeSourcePosition: null,
    children: skillMap.children.map(createStudySkillMapNode),
  };
}

export function updateStudySkillMapNodeStatus(
  skillMap: StudySkillMapNode,
  nodeId: string,
  status: ProgressStatus,
): StudySkillMapNode {
  if (skillMap.nodeId === nodeId) {
    return {
      ...skillMap,
      progressStatus: status,
    };
  }

  return {
    ...skillMap,
    children: skillMap.children.map((child) => updateStudySkillMapNodeStatus(child, nodeId, status)),
  };
}

export function resetStudySkillMapNodeStatuses(skillMap: StudySkillMapNode): StudySkillMapNode {
  return {
    ...skillMap,
    progressStatus: "NOT_STARTED",
    children: skillMap.children.map(resetStudySkillMapNodeStatuses),
  };
}

export function updateStudySkillMapNodeTitle(
  skillMap: StudySkillMapNode,
  path: string,
  title: string,
): StudySkillMapNode {
  return updateStudySkillMapNodeAtPath(skillMap, path, (node) => ({
    ...node,
    title,
  }));
}

export function updateStudySkillMapNodeDetails(
  skillMap: StudySkillMapNode,
  path: string,
  input: {
    title: string;
    description: string;
    tags: string[];
  },
): StudySkillMapNode {
  return updateStudySkillMapNodeAtPath(skillMap, path, (node) => ({
    ...node,
    title: input.title,
    description: input.description,
    tags: input.tags,
  }));
}

export function addStudySkillMapChildNode(
  skillMap: StudySkillMapNode,
  parentPath: string,
  childNode: StudySkillMapNode,
): StudySkillMapNode {
  return updateStudySkillMapNodeAtPath(skillMap, parentPath, (node) => ({
    ...node,
    children: [...node.children, childNode],
  }));
}

export function addStudySkillMapRootNode(
  skillMap: StudySkillMapNode,
  rootNode: StudySkillMapNode,
): StudySkillMapNode {
  return {
    ...skillMap,
    children: [...skillMap.children, rootNode],
  };
}

export function deleteStudySkillMapNodeAtPath(
  skillMap: StudySkillMapNode,
  path: string,
): StudySkillMapNode {
  return deleteStudySkillMapNodeAtPathWithMode(skillMap, path, "subtree");
}

export function deleteStudySkillMapNodeAtPathWithMode(
  skillMap: StudySkillMapNode,
  path: string,
  mode: "subtree" | "single",
): StudySkillMapNode {
  const indexes = path.split("-").map((value) => Number(value) - 1);

  if (indexes.some((index) => !Number.isInteger(index) || index < 0)) {
    return skillMap;
  }

  const targetIndex = indexes[indexes.length - 1];
  const parentPath = indexes.slice(0, -1).map((index) => String(index + 1)).join("-");

  if (!parentPath) {
    const targetNode = skillMap.children[targetIndex];

    if (!targetNode) {
      return skillMap;
    }

    return {
      ...skillMap,
      children:
        mode === "single"
          ? [
              ...skillMap.children.slice(0, targetIndex),
              ...targetNode.children,
              ...skillMap.children.slice(targetIndex + 1),
            ]
          : skillMap.children.filter((_, index) => index !== targetIndex),
    };
  }

  return updateStudySkillMapNodeAtPath(skillMap, parentPath, (node) => ({
    ...node,
    children:
      mode === "single" && node.children[targetIndex]
        ? [
            ...node.children.slice(0, targetIndex),
            ...node.children[targetIndex].children,
            ...node.children.slice(targetIndex + 1),
          ]
        : node.children.filter((_, index) => index !== targetIndex),
  }));
}

export function updateStudySkillMapNodePosition(
  skillMap: StudySkillMapNode,
  path: string,
  position: { x: number; y: number },
): StudySkillMapNode {
  return updateStudySkillMapNodeAtPath(skillMap, path, (node) => ({
    ...node,
    positionX: position.x,
    positionY: position.y,
  }));
}

export function updateStudySkillMapNodeParentLock(
  skillMap: StudySkillMapNode,
  path: string,
  parentLocked: boolean,
): StudySkillMapNode {
  return updateStudySkillMapNodeAtPath(skillMap, path, (node) => ({
    ...node,
    parentLocked,
  }));
}

export function updateStudySkillMapNodeEdgeSourcePosition(
  skillMap: StudySkillMapNode,
  path: string,
  parentEdgeSourcePosition: StudySkillMapNode["parentEdgeSourcePosition"],
): StudySkillMapNode {
  return updateStudySkillMapNodeAtPath(skillMap, path, (node) => ({
    ...node,
    parentEdgeSourcePosition,
  }));
}

export function autoArrangeStudySkillMap(skillMap: StudySkillMapNode): StudySkillMapNode {
  let nextRootTop = 0;
  const arrangedRoots = skillMap.children.map((rootNode) => {
    const arrangedRoot = arrangeRootNode(rootNode);
    const shiftX = -arrangedRoot.bounds.minX;
    const shiftY = nextRootTop - arrangedRoot.bounds.minY;
    const shiftedRoot = shiftStudySkillMapNode(arrangedRoot.node, shiftX, shiftY);

    nextRootTop += arrangedRoot.bounds.maxY - arrangedRoot.bounds.minY + AUTO_LAYOUT_ROOT_GAP;

    return shiftedRoot;
  });

  return {
    ...skillMap,
    positionX: null,
    positionY: null,
    children: arrangedRoots,
  };
}

export function reparentStudySkillMapNode(
  skillMap: StudySkillMapNode,
  nodePath: string,
  nextParentPath: string | null,
  parentLocked = false,
): StudySkillMapNode | null {
  if (nodePath === nextParentPath || (nextParentPath && nextParentPath.startsWith(`${nodePath}-`))) {
    return null;
  }

  const extracted = extractStudySkillMapNodeAtPath(skillMap, nodePath);

  if (!extracted) {
    return null;
  }

  if (getMaxDepth(extracted.node) + (nextParentPath ? nextParentPath.split("-").length : 0) > 4) {
    return null;
  }

  if (!nextParentPath) {
    return {
      ...extracted.skillMap,
      children: [...extracted.skillMap.children, { ...extracted.node, parentLocked }],
    };
  }

  const parentExists = getStudySkillMapNodeAtPath(extracted.skillMap, nextParentPath);

  if (!parentExists) {
    return null;
  }

  return updateStudySkillMapNodeAtPath(extracted.skillMap, nextParentPath, (node) => ({
    ...node,
    children: [...node.children, { ...extracted.node, parentLocked }],
  }));
}

export function getSkillMapProgressStats(skillMap: StudySkillMapNode): SkillMapProgressStats {
  let totalCount = 0;
  let completedCount = 0;

  function visit(node: StudySkillMapNode) {
    totalCount += 1;

    if (node.progressStatus === "COMPLETED") {
      completedCount += 1;
    }

    node.children.forEach(visit);
  }

  skillMap.children.forEach(visit);

  return {
    completedCount,
    totalCount,
    percent: totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100),
  };
}

function arrangeRootNode(node: StudySkillMapNode): {
  node: StudySkillMapNode;
  bounds: AutoArrangeBounds;
} {
  const childEntriesByDirection = new Map<
    AutoArrangeDirection,
    { child: StudySkillMapNode; index: number }[]
  >();

  AUTO_LAYOUT_DIRECTIONS.forEach((direction) => {
    childEntriesByDirection.set(direction, []);
  });

  node.children.forEach((child, index) => {
    const direction = AUTO_LAYOUT_DIRECTIONS[index % AUTO_LAYOUT_DIRECTIONS.length];
    childEntriesByDirection.get(direction)?.push({ child, index });
  });

  const arrangedChildrenByIndex = new Map<number, StudySkillMapNode>();
  let bounds = getNodeBounds(0, 0);

  for (const direction of AUTO_LAYOUT_DIRECTIONS) {
    const entries = childEntriesByDirection.get(direction) ?? [];
    const arrangedEntries = arrangeDirectionalChildren(entries, direction, 0, 1);

    arrangedEntries.forEach((entry) => {
      arrangedChildrenByIndex.set(entry.index, entry.node);
      bounds = mergeBounds(bounds, entry.bounds);
    });
  }

  return {
    node: {
      ...node,
      positionX: 0,
      positionY: 0,
      children: node.children.map((_, index) => arrangedChildrenByIndex.get(index)).filter(isStudySkillMapNode),
    },
    bounds,
  };
}

function arrangeDirectionalChildren(
  entries: { child: StudySkillMapNode; index: number }[],
  direction: AutoArrangeDirection,
  parentPerpendicularOffset: number,
  depth: number,
) {
  const totalSpan = entries.reduce(
    (span, entry) => span + measureDirectionalSpan(entry.child) * AUTO_LAYOUT_PERPENDICULAR_GAP,
    0,
  );
  let cursor = parentPerpendicularOffset - totalSpan / 2;

  return entries.map((entry) => {
    const childSpan = measureDirectionalSpan(entry.child) * AUTO_LAYOUT_PERPENDICULAR_GAP;
    const perpendicularOffset = cursor + childSpan / 2;
    const arrangedNode = arrangeDirectionalNode(entry.child, direction, perpendicularOffset, depth);

    cursor += childSpan;

    return {
      index: entry.index,
      ...arrangedNode,
    };
  });
}

function arrangeDirectionalNode(
  node: StudySkillMapNode,
  direction: AutoArrangeDirection,
  perpendicularOffset: number,
  depth: number,
): { node: StudySkillMapNode; bounds: AutoArrangeBounds } {
  const position = getDirectionalPosition(direction, depth, perpendicularOffset);
  let bounds = getNodeBounds(position.x, position.y);
  const childEntries = node.children.map((child, index) => ({ child, index }));
  const arrangedChildren = arrangeDirectionalChildren(
    childEntries,
    direction,
    perpendicularOffset,
    depth + 1,
  );
  const arrangedChildrenByIndex = new Map<number, StudySkillMapNode>();

  arrangedChildren.forEach((entry) => {
    arrangedChildrenByIndex.set(entry.index, entry.node);
    bounds = mergeBounds(bounds, entry.bounds);
  });

  return {
    node: {
      ...node,
      positionX: position.x,
      positionY: position.y,
      children: node.children.map((_, index) => arrangedChildrenByIndex.get(index)).filter(isStudySkillMapNode),
    },
    bounds,
  };
}

function measureDirectionalSpan(node: StudySkillMapNode): number {
  if (node.children.length === 0) {
    return 1;
  }

  return Math.max(1, node.children.reduce((span, child) => span + measureDirectionalSpan(child), 0));
}

function getDirectionalPosition(
  direction: AutoArrangeDirection,
  depth: number,
  perpendicularOffset: number,
) {
  if (direction === "right") {
    return {
      x: depth * AUTO_LAYOUT_PRIMARY_GAP,
      y: perpendicularOffset,
    };
  }

  if (direction === "left") {
    return {
      x: -depth * AUTO_LAYOUT_PRIMARY_GAP,
      y: perpendicularOffset,
    };
  }

  if (direction === "down") {
    return {
      x: perpendicularOffset,
      y: depth * AUTO_LAYOUT_PRIMARY_GAP,
    };
  }

  return {
    x: perpendicularOffset,
    y: -depth * AUTO_LAYOUT_PRIMARY_GAP,
  };
}

function getNodeBounds(x: number, y: number): AutoArrangeBounds {
  return {
    minX: x - AUTO_LAYOUT_NODE_WIDTH / 2,
    maxX: x + AUTO_LAYOUT_NODE_WIDTH / 2,
    minY: y - AUTO_LAYOUT_NODE_HEIGHT / 2,
    maxY: y + AUTO_LAYOUT_NODE_HEIGHT / 2,
  };
}

function mergeBounds(left: AutoArrangeBounds, right: AutoArrangeBounds): AutoArrangeBounds {
  return {
    minX: Math.min(left.minX, right.minX),
    maxX: Math.max(left.maxX, right.maxX),
    minY: Math.min(left.minY, right.minY),
    maxY: Math.max(left.maxY, right.maxY),
  };
}

function shiftStudySkillMapNode(
  node: StudySkillMapNode,
  shiftX: number,
  shiftY: number,
): StudySkillMapNode {
  return {
    ...node,
    positionX: node.positionX === null ? null : node.positionX + shiftX,
    positionY: node.positionY === null ? null : node.positionY + shiftY,
    children: node.children.map((child) => shiftStudySkillMapNode(child, shiftX, shiftY)),
  };
}

function isStudySkillMapNode(value: StudySkillMapNode | undefined): value is StudySkillMapNode {
  return Boolean(value);
}

function extractStudySkillMapNodeAtPath(
  skillMap: StudySkillMapNode,
  path: string,
): { skillMap: StudySkillMapNode; node: StudySkillMapNode } | null {
  const indexes = path.split("-").map((value) => Number(value) - 1);

  if (indexes.some((index) => !Number.isInteger(index) || index < 0)) {
    return null;
  }

  const targetIndex = indexes[indexes.length - 1];
  const parentPath = indexes.slice(0, -1).map((index) => String(index + 1)).join("-");

  if (!parentPath) {
    const node = skillMap.children[targetIndex];

    if (!node) {
      return null;
    }

    return {
      node,
      skillMap: {
        ...skillMap,
        children: skillMap.children.filter((_, index) => index !== targetIndex),
      },
    };
  }

  const parentNode = getStudySkillMapNodeAtPath(skillMap, parentPath);

  if (!parentNode?.children[targetIndex]) {
    return null;
  }

  return {
    node: parentNode.children[targetIndex],
    skillMap: updateStudySkillMapNodeAtPath(skillMap, parentPath, (node) => ({
      ...node,
      children: node.children.filter((_, index) => index !== targetIndex),
    })),
  };
}

function getStudySkillMapNodeAtPath(skillMap: StudySkillMapNode, path: string) {
  const indexes = path.split("-").map((value) => Number(value) - 1);

  if (indexes.some((index) => !Number.isInteger(index) || index < 0)) {
    return null;
  }

  let currentNode = skillMap.children[indexes[0]];

  if (!currentNode) {
    return null;
  }

  for (const index of indexes.slice(1)) {
    const nextNode = currentNode.children[index];

    if (!nextNode) {
      return null;
    }

    currentNode = nextNode;
  }

  return currentNode;
}

function getMaxDepth(node: StudySkillMapNode): number {
  if (node.children.length === 0) {
    return 1;
  }

  return 1 + Math.max(...node.children.map(getMaxDepth));
}

function updateStudySkillMapNodeAtPath(
  skillMap: StudySkillMapNode,
  path: string,
  updater: (node: StudySkillMapNode) => StudySkillMapNode,
): StudySkillMapNode {
  const indexes = path.split("-").map((value) => Number(value) - 1);

  if (indexes.some((index) => !Number.isInteger(index) || index < 0)) {
    return skillMap;
  }

  if (indexes.length === 0) {
    return skillMap;
  }

  const rootIndex = indexes[0];

  function visit(node: StudySkillMapNode, depth: number): StudySkillMapNode {
    if (depth === indexes.length) {
      return updater(node);
    }

    const childIndex = indexes[depth];

    return {
      ...node,
      children: node.children.map((child, index) =>
        index === childIndex ? visit(child, depth + 1) : child,
      ),
    };
  }

  return {
    ...skillMap,
    children: skillMap.children.map((child, index) =>
      index === rootIndex ? visit(child, 1) : child,
    ),
  };
}
