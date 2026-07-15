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
    children: skillMap.children.map(createStudySkillMap),
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

  visit(skillMap);

  return {
    completedCount,
    totalCount,
    percent: totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100),
  };
}
