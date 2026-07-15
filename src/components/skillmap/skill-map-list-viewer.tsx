"use client";

import { ChevronRight } from "lucide-react";

import { PROGRESS_STATUS_LABELS, PROGRESS_STATUS_STYLES } from "@/constants/status";
import type { StudySkillMapNode } from "@/types/node";

type SkillMapListViewerProps = {
  onSelectNode: (node: StudySkillMapNode) => void;
  skillMap: StudySkillMapNode;
};

export function SkillMapListViewer({ onSelectNode, skillMap }: SkillMapListViewerProps) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <SkillMapListNode defaultOpen node={skillMap} onSelectNode={onSelectNode} />
    </div>
  );
}

function SkillMapListNode({
  defaultOpen = false,
  node,
  onSelectNode,
}: {
  defaultOpen?: boolean;
  node: StudySkillMapNode;
  onSelectNode: (node: StudySkillMapNode) => void;
}) {
  const hasChildren = node.children.length > 0;

  if (!hasChildren) {
    return (
      <div className="rounded-md px-2 py-2">
        <button className="w-full text-left" onClick={() => onSelectNode(node)} type="button">
          <span className="flex flex-wrap items-center gap-2">
            <span className="block text-sm font-medium">{node.title}</span>
            <span className={`rounded-md border px-2 py-0.5 text-xs ${PROGRESS_STATUS_STYLES[node.progressStatus]}`}>
              {PROGRESS_STATUS_LABELS[node.progressStatus]}
            </span>
          </span>
          <span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted-foreground">
            {node.description}
          </span>
        </button>
      </div>
    );
  }

  return (
    <details className="group rounded-md px-2 py-2" open={defaultOpen}>
      <summary
        className="flex cursor-pointer list-none items-start gap-2"
        onClick={() => onSelectNode(node)}
      >
        <ChevronRight
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
        />
        <span className="min-w-0 flex-1 text-left">
          <span className="flex flex-wrap items-center gap-2">
            <span className="block text-sm font-medium">{node.title}</span>
            <span className={`rounded-md border px-2 py-0.5 text-xs ${PROGRESS_STATUS_STYLES[node.progressStatus]}`}>
              {PROGRESS_STATUS_LABELS[node.progressStatus]}
            </span>
          </span>
          <span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted-foreground">
            {node.description}
          </span>
        </span>
      </summary>
      <div className="ml-4 mt-2 space-y-1 border-l pl-3">
        {node.children.map((child, index) => (
          <SkillMapListNode
            key={`${node.title}-${child.title}-${index}`}
            node={child}
            onSelectNode={onSelectNode}
          />
        ))}
      </div>
    </details>
  );
}
