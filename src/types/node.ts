import type { ProgressStatus } from "@/types/progress";

export type SkillMapNode = {
  id: string;
  skillMapId: string;
  parentId: string | null;
  title: string;
  description: string;
  order: number;
  tags: string[];
  status?: ProgressStatus;
  children?: SkillMapNode[];
};

export type GeneratedSkillMapNode = {
  title: string;
  description: string;
  tags: string[];
  children: GeneratedSkillMapNode[];
};

export type StudySkillMapNode = {
  nodeId: string | null;
  title: string;
  description: string;
  tags: string[];
  progressStatus: ProgressStatus;
  children: StudySkillMapNode[];
};
