import type { GeneratedSkillMapNode, SkillMapNode } from "@/types/node";

export type SkillMap = {
  id: string;
  title: string;
  prompt: string;
  userId: string;
  createdAt: Date;
  nodes?: SkillMapNode[];
};

export type GeneratedSkillMap = GeneratedSkillMapNode;

export type SavedSkillMapSummary = {
  id: string;
  title: string;
  prompt: string;
  createdAt: string;
  nodeCount: number;
};

export type SavedSkillMapDetail = {
  id: string;
  title: string;
  prompt: string;
  createdAt: string;
  skillMap: GeneratedSkillMap;
};
