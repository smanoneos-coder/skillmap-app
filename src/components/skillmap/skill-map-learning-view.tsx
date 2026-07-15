"use client";

import { useEffect, useState } from "react";

import { SkillMapDetailDrawer } from "@/components/skillmap/skill-map-detail-drawer";
import { SkillMapFlowViewer } from "@/components/skillmap/skill-map-flow-viewer";
import { SkillMapListViewer } from "@/components/skillmap/skill-map-list-viewer";
import {
  getSkillMapProgressStats,
  updateStudySkillMapNodeStatus,
} from "@/lib/skillmap-progress";
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
  const [updatingNodeId, setUpdatingNodeId] = useState<string | null>(null);
  const progressStats = getSkillMapProgressStats(skillMap);

  useEffect(() => {
    setSelectedNode(null);
    setProgressError(null);
  }, [mapKey]);

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
        <SkillMapFlowViewer onSelectNode={setSelectedNode} skillMap={skillMap} />
      ) : (
        <SkillMapListViewer onSelectNode={setSelectedNode} skillMap={skillMap} />
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
