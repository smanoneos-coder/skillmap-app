import type { ProgressStatus } from "@/types/progress";

export type NodeConnectionPosition = "right" | "down" | "left" | "up";

export type SkillMapNode = {
  id: string;
  skillMapId: string;
  parentId: string | null;
  title: string;
  description: string;
  order: number;
  tags: string[];
  imageUrl: string | null;
  positionX: number | null;
  positionY: number | null;
  parentLocked: boolean;
  parentEdgeSourcePosition: NodeConnectionPosition | null;
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
  imageUrl: string | null;
  progressStatus: ProgressStatus;
  positionX: number | null;
  positionY: number | null;
  parentLocked: boolean;
  parentEdgeSourcePosition: NodeConnectionPosition | null;
  children: StudySkillMapNode[];
};

export type ChildNodeDirection = NodeConnectionPosition;
