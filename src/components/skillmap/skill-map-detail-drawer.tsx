"use client";

import { X } from "lucide-react";
import ReactMarkdown from "react-markdown";

import { PROGRESS_STATUSES, PROGRESS_STATUS_LABELS, PROGRESS_STATUS_STYLES } from "@/constants/status";
import { Button } from "@/components/ui/button";
import type { ProgressStatus } from "@/types/progress";
import type { StudySkillMapNode } from "@/types/node";

type SkillMapDetailDrawerProps = {
  isUpdatingProgress: boolean;
  node: StudySkillMapNode | null;
  onClose: () => void;
  onUpdateProgress: (nodeId: string, status: ProgressStatus) => void;
};

export function SkillMapDetailDrawer({
  isUpdatingProgress,
  node,
  onClose,
  onUpdateProgress,
}: SkillMapDetailDrawerProps) {
  if (!node) {
    return null;
  }

  const nodeId = node.nodeId;

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="詳細を閉じる"
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={onClose}
        type="button"
      />
      <aside className="absolute bottom-0 right-0 flex max-h-[88vh] w-full flex-col border bg-card shadow-xl sm:top-0 sm:h-full sm:max-h-none sm:w-[420px]">
        <header className="flex items-start justify-between gap-3 border-b p-4">
          <div className="min-w-0 space-y-2">
            <h2 className="break-words text-lg font-semibold leading-7">{node.title}</h2>
            {node.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {node.tags.map((tag) => (
                  <span className="rounded-md bg-secondary px-2 py-1 text-xs" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <Button
            aria-label="閉じる"
            className="h-9 w-9 shrink-0 p-0"
            onClick={onClose}
            variant="outline"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </Button>
        </header>
        <div className="overflow-auto p-4">
          <section className="mb-5 rounded-lg border bg-background p-3">
            <h3 className="mb-3 text-sm font-semibold">学習状態</h3>
            {nodeId ? (
              <div className="grid grid-cols-3 gap-2">
                {PROGRESS_STATUSES.map((status) => (
                  <button
                    className={`rounded-md border px-2 py-2 text-sm transition-colors ${
                      node.progressStatus === status
                        ? PROGRESS_STATUS_STYLES[status]
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                    disabled={isUpdatingProgress}
                    key={status}
                    onClick={() => onUpdateProgress(nodeId, status)}
                    type="button"
                  >
                    {PROGRESS_STATUS_LABELS[status]}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                保存済みマップを開くと学習状態を変更できます。
              </p>
            )}
          </section>
          <div className="text-sm leading-7 text-foreground [&_a]:text-primary [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3 [&_strong]:font-semibold">
            <ReactMarkdown>{node.description}</ReactMarkdown>
          </div>
        </div>
      </aside>
    </div>
  );
}
