import type { GeneratedSkillMap } from "@/lib/skillmap-schema";
import type { ProgressStatus } from "@/types/progress";
import type { StudySkillMapNode } from "@/types/node";

export type SkillMapProgressStats = {
  completedCount: number;
  totalCount: number;
  percent: number;
};

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
