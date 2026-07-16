"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";

import { PROGRESS_STATUS_LABELS, PROGRESS_STATUS_STYLES } from "@/constants/status";
import { getSkillMapNodePath } from "@/lib/skillmap-search";
import type { StudySkillMapNode } from "@/types/node";

type SkillMapListViewerProps = {
  activeSearchPath: string | null;
  onSelectNode: (node: StudySkillMapNode, path: string) => void;
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
    <div className="rounded-lg border bg-background p-2 sm:p-3">
      {skillMap.children.length > 0 ? (
        <div className="space-y-2">
          {skillMap.children.map((child, index) => (
            <SkillMapListNode
              activeSearchPath={activeSearchPath}
              key={`${child.nodeId ?? child.title}-${index}`}
              node={child}
              nodePath={getSkillMapNodePath("", index)}
              onSelectNode={onSelectNode}
              searchMatchPaths={searchMatchPaths}
            />
          ))}
        </div>
      ) : (
        <p className="p-3 text-sm text-muted-foreground">ノードはまだありません。</p>
      )}
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
  onSelectNode: (node: StudySkillMapNode, path: string) => void;
  searchMatchPaths: Set<string>;
}) {
  const hasChildren = node.children.length > 0;
  const isSearchMatch = searchMatchPaths.has(nodePath);
  const isActiveSearchMatch = activeSearchPath === nodePath;
  const isForcedOpen = Boolean(activeSearchPath?.startsWith(`${nodePath}-`));
  const [isManuallyOpen, setIsManuallyOpen] = useState(isForcedOpen);
  const isOpen = isForcedOpen || isManuallyOpen;
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
        <button className="w-full text-left" onClick={() => onSelectNode(node, nodePath)} type="button">
          <span className="flex flex-wrap items-center gap-2">
            <span className="block min-w-0 break-words text-sm font-medium">{node.title}</span>
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
    <details
      className={`group ${itemClassName}`}
      onToggle={(event) => setIsManuallyOpen(event.currentTarget.open)}
      open={isOpen}
    >
      <summary
        className="flex cursor-pointer list-none items-start gap-2"
        onClick={() => onSelectNode(node, nodePath)}
      >
        <ChevronRight
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
        />
        <span className="min-w-0 flex-1 text-left">
          <span className="flex flex-wrap items-center gap-2">
            <span className="block min-w-0 break-words text-sm font-medium">{node.title}</span>
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
