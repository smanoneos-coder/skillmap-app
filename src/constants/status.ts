import type { ProgressStatus } from "@/types/progress";

export const PROGRESS_STATUSES = ["NOT_STARTED", "LEARNING", "COMPLETED"] as const;

export const PROGRESS_STATUS_LABELS: Record<ProgressStatus, string> = {
  NOT_STARTED: "未学習",
  LEARNING: "学習中",
  COMPLETED: "習得済み",
};

export const PROGRESS_STATUS_STYLES: Record<ProgressStatus, string> = {
  NOT_STARTED: "border-border bg-card text-card-foreground",
  LEARNING: "border-primary bg-primary/10 text-foreground",
  COMPLETED: "border-accent bg-accent/10 text-foreground",
};
