import type { StudySkillMapNode } from "@/types/node";

export type SkillMapSearchResult = {
  node: StudySkillMapNode;
  path: string;
};

export function getSkillMapNodePath(parentPath: string, index: number) {
  return parentPath ? `${parentPath}-${index + 1}` : `${index + 1}`;
}

export function searchSkillMap(skillMap: StudySkillMapNode, query: string): SkillMapSearchResult[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  if (!normalizedQuery) {
    return [];
  }

  const results: SkillMapSearchResult[] = [];

  function visit(node: StudySkillMapNode, path: string) {
    const isMatch =
      node.title.toLocaleLowerCase().includes(normalizedQuery) ||
      node.description.toLocaleLowerCase().includes(normalizedQuery);

    if (isMatch) {
      results.push({
        node,
        path,
      });
    }

    node.children.forEach((child, index) => {
      visit(child, getSkillMapNodePath(path, index));
    });
  }

  skillMap.children.forEach((child, index) => {
    visit(child, getSkillMapNodePath("", index));
  });

  return results;
}

export function getSkillMapNodeByPath(skillMap: StudySkillMapNode, path: string) {
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
