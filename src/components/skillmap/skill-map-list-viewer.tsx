"use client";

import { ChevronRight } from "lucide-react";

import { PROGRESS_STATUS_LABELS, PROGRESS_STATUS_STYLES } from "@/constants/status";
import { getSkillMapNodePath } from "@/lib/skillmap-search";
import type { StudySkillMapNode } from "@/types/node";

type SkillMapListViewerProps = {
  activeSearchPath: string | null;
  onSelectNode: (node: StudySkillMapNode) => void;
  searchMatchPaths: Set<string>;
  skillMap: StudySkillMapNode;
};

export function SkillMapListViewer({
  activeSearchPath,
  onSelectNode,
  searchMatchPaths,
  skillMap,
}: SkillMapListViewerProps) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <SkillMapListNode
        activeSearchPath={activeSearchPath}
        node={skillMap}
        nodePath="1"
        onSelectNode={onSelectNode}
        searchMatchPaths={searchMatchPaths}
      />
    </div>
  );
}

function SkillMapListNode({
  activeSearchPath,
  node,
  nodePath,
  onSelectNode,
  searchMatchPaths,
}: {
  activeSearchPath: string | null;
  node: StudySkillMapNode;
  nodePath: string;
  onSelectNode: (node: StudySkillMapNode) => void;
  searchMatchPaths: Set<string>;
}) {
  const hasChildren = node.children.length > 0;
  const isSearchMatch = searchMatchPaths.has(nodePath);
  const isActiveSearchMatch = activeSearchPath === nodePath;
  const shouldOpen = nodePath === "1" || Boolean(activeSearchPath?.startsWith(`${nodePath}-`));
  const itemClassName = `rounded-md px-2 py-2 ${
    isActiveSearchMatch
      ? "bg-destructive/10 ring-1 ring-destructive"
      : isSearchMatch
        ? "bg-primary/10 ring-1 ring-primary/40"
        : ""
  }`;

  if (!hasChildren) {
    return (
      <div className={itemClassName}>
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
    <details className={`group ${itemClassName}`} open={shouldOpen}>
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
            activeSearchPath={activeSearchPath}
            key={`${node.title}-${child.title}-${index}`}
            node={child}
            nodePath={getSkillMapNodePath(nodePath, index)}
            onSelectNode={onSelectNode}
            searchMatchPaths={searchMatchPaths}
          />
        ))}
      </div>
    </details>
  );
}
