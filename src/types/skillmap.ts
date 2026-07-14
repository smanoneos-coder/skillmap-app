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
