"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { SkillMapDetailDrawer } from "@/components/skillmap/skill-map-detail-drawer";
import { SkillMapFlowViewer } from "@/components/skillmap/skill-map-flow-viewer";
import { SkillMapListViewer } from "@/components/skillmap/skill-map-list-viewer";
import {
  getSkillMapProgressStats,
  updateStudySkillMapNodeStatus,
} from "@/lib/skillmap-progress";
import { searchSkillMap } from "@/lib/skillmap-search";
import type { ProgressStatus } from "@/types/progress";
import type { StudySkillMapNode } from "@/types/node";

type SkillMapLearningViewProps = {
  mapKey: string;
  onChangeSkillMap: (skillMap: StudySkillMapNode) => void;
  skillMap: StudySkillMapNode;
};

type SkillMapViewMode = "map" | "list";

export function SkillMapLearningView({ mapKey, onChangeSkillMap, skillMap }: SkillMapLearningViewProps) {
  const [viewMode, setViewMode] = useState<SkillMapViewMode>("map");
  const [selectedNode, setSelectedNode] = useState<StudySkillMapNode | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [updatingNodeId, setUpdatingNodeId] = useState<string | null>(null);
  const progressStats = getSkillMapProgressStats(skillMap);
  const searchResults = useMemo(() => searchSkillMap(skillMap, query), [query, skillMap]);
  const searchMatchPaths = useMemo(
    () => new Set(searchResults.map((result) => result.path)),
    [searchResults],
  );
  const activeSearchPath = searchResults[activeSearchIndex]?.path ?? null;

  useEffect(() => {
    setSelectedNode(null);
    setProgressError(null);
    setQuery("");
    setActiveSearchIndex(0);
  }, [mapKey]);

  useEffect(() => {
    setActiveSearchIndex(0);
  }, [query]);

  async function handleUpdateProgress(nodeId: string, status: ProgressStatus) {
    setUpdatingNodeId(nodeId);
    setProgressError(null);

    try {
      const response = await fetch(`/api/nodes/${nodeId}/progress`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        setProgressError("学習状態の保存に失敗しました。");
        return;
      }

      const nextSkillMap = updateStudySkillMapNodeStatus(skillMap, nodeId, status);
      const nextSelectedNode =
        selectedNode?.nodeId === nodeId
          ? {
              ...selectedNode,
              progressStatus: status,
            }
          : selectedNode;

      onChangeSkillMap(nextSkillMap);
      setSelectedNode(nextSelectedNode);
    } catch {
      setProgressError("学習状態の保存に失敗しました。");
    } finally {
      setUpdatingNodeId(null);
    }
  }

  function moveSearchResult(direction: "next" | "previous") {
    if (searchResults.length === 0) {
      return;
    }

    setActiveSearchIndex((currentIndex) => {
      if (direction === "next") {
        return (currentIndex + 1) % searchResults.length;
      }

      return (currentIndex - 1 + searchResults.length) % searchResults.length;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">ノードをクリックすると詳細を表示します。</p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="h-2 w-40 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${progressStats.percent}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              進捗 {progressStats.percent}% ({progressStats.completedCount}/{progressStats.totalCount})
            </p>
          </div>
          {progressError ? <p className="text-sm text-destructive">{progressError}</p> : null}
        </div>
        <div className="flex w-full flex-col gap-2 rounded-lg border bg-background p-3 lg:max-w-md">
          <label className="flex items-center gap-2 text-sm font-medium" htmlFor="skillmap-search">
            <Search aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
            マップ内検索
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              id="skillmap-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="タイトル・説明を検索"
              type="search"
              value={query}
            />
            <div className="flex gap-2">
              <button
                className="h-10 rounded-md border px-3 text-sm disabled:opacity-50"
                disabled={searchResults.length === 0}
                onClick={() => moveSearchResult("previous")}
                type="button"
              >
                前へ
              </button>
              <button
                className="h-10 rounded-md border px-3 text-sm disabled:opacity-50"
                disabled={searchResults.length === 0}
                onClick={() => moveSearchResult("next")}
                type="button"
              >
                次へ
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {query.trim()
              ? searchResults.length > 0
                ? `${activeSearchIndex + 1}/${searchResults.length}件`
                : "一致するノードはありません"
              : "検索文字列が空の場合は通常表示です"}
          </p>
        </div>
        <div className="flex rounded-md border bg-background p-1">
          <button
            className={`rounded px-3 py-1 text-sm transition-colors ${
              viewMode === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
            onClick={() => setViewMode("map")}
            type="button"
          >
            マップ
          </button>
          <button
            className={`rounded px-3 py-1 text-sm transition-colors ${
              viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
            onClick={() => setViewMode("list")}
            type="button"
          >
            リスト
          </button>
        </div>
      </div>

      {viewMode === "map" ? (
        <SkillMapFlowViewer
          activeSearchPath={activeSearchPath}
          onSelectNode={setSelectedNode}
          searchMatchPaths={searchMatchPaths}
          skillMap={skillMap}
        />
      ) : (
        <SkillMapListViewer
          activeSearchPath={activeSearchPath}
          onSelectNode={setSelectedNode}
          searchMatchPaths={searchMatchPaths}
          skillMap={skillMap}
        />
      )}

      <SkillMapDetailDrawer
        isUpdatingProgress={updatingNodeId === selectedNode?.nodeId}
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
        onUpdateProgress={handleUpdateProgress}
      />
    </div>
  );
}
