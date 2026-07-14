export type ProgressStatus = "NOT_STARTED" | "LEARNING" | "COMPLETED";

export type UserNodeProgress = {
  id: string;
  userId: string;
  nodeId: string;
  status: ProgressStatus;
  updatedAt: Date;
};
