"use client";

import type { NodeChange } from "@xyflow/react";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  SkillMapDetailDrawer,
  type ParentNodeOption,
} from "@/components/skillmap/skill-map-detail-drawer";
import { SkillMapFlowViewer } from "@/components/skillmap/skill-map-flow-viewer";
import { SkillMapListViewer } from "@/components/skillmap/skill-map-list-viewer";
import {
  addStudySkillMapChildNode,
  addStudySkillMapRootNode,
  deleteStudySkillMapNodeAtPathWithMode,
  getSkillMapProgressStats,
  reparentStudySkillMapNode,
  updateStudySkillMapNodeDetails,
  updateStudySkillMapNodeEdgeSourcePosition,
  updateStudySkillMapNodeParentLock,
  updateStudySkillMapNodePosition,
  updateStudySkillMapNodeStatus,
} from "@/lib/skillmap-progress";
import { createSkillMapFlowElements, type SkillMapFlowNode } from "@/lib/skillmap-flow";
import { autoArrangeStudySkillMap } from "@/lib/skillmap-layout";
import { getSkillMapNodeByPath, searchSkillMap } from "@/lib/skillmap-search";
import type { ChildNodeDirection, NodeConnectionPosition, StudySkillMapNode } from "@/types/node";
import type { ProgressStatus } from "@/types/progress";
import type { StudySkillMapEdge } from "@/types/skillmap";

type SkillMapLearningViewProps = {
  mapKey: string;
  onChangeRelatedEdges: (relatedEdges: StudySkillMapEdge[]) => void;
  onChangeSkillMap: (skillMap: StudySkillMapNode) => void;
  relatedEdges: StudySkillMapEdge[];
  savedSkillMapId: string | null;
  skillMap: StudySkillMapNode;
};

type SkillMapViewMode = "map" | "list";
type DeleteNodeMode = "subtree" | "single";

type SaveGraphResponse = {
  data: {
    skillMap: StudySkillMapNode;
    relatedEdges: StudySkillMapEdge[];
  };
};

export function SkillMapLearningView({
  mapKey,
  onChangeRelatedEdges,
  onChangeSkillMap,
  relatedEdges,
  savedSkillMapId,
  skillMap,
}: SkillMapLearningViewProps) {
  const [viewMode, setViewMode] = useState<SkillMapViewMode>("map");
  const [selectedNode, setSelectedNode] = useState<StudySkillMapNode | null>(null);
  const [selectedNodePath, setSelectedNodePath] = useState<string | null>(null);
  const [selectedRelatedEdgeId, setSelectedRelatedEdgeId] = useState<string | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [nodeEditError, setNodeEditError] = useState<string | null>(null);
  const [graphEditError, setGraphEditError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [updatingNodeId, setUpdatingNodeId] = useState<string | null>(null);
  const [isEditingNode, setIsEditingNode] = useState(false);
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [isDeletingNode, setIsDeletingNode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [draftSkillMap, setDraftSkillMap] = useState<StudySkillMapNode | null>(null);
  const [draftRelatedEdges, setDraftRelatedEdges] = useState<StudySkillMapEdge[] | null>(null);
  const [isSavingGraph, setIsSavingGraph] = useState(false);

  const visibleSkillMap = draftSkillMap ?? skillMap;
  const visibleRelatedEdges = draftRelatedEdges ?? relatedEdges;
  const progressStats = getSkillMapProgressStats(visibleSkillMap);
  const searchResults = useMemo(() => searchSkillMap(visibleSkillMap, query), [query, visibleSkillMap]);
  const searchMatchPaths = useMemo(
    () => new Set(searchResults.map((result) => result.path)),
    [searchResults],
  );
  const activeSearchPath = searchResults[activeSearchIndex]?.path ?? null;
  const hasSearchQuery = query.trim().length > 0;
  const selectedRelatedEdge = selectedRelatedEdgeId
    ? visibleRelatedEdges.find((edge) => edge.id === selectedRelatedEdgeId) ?? null
    : null;
  const currentParentPath = selectedNodePath ? getParentPath(selectedNodePath) : null;
  const parentOptions = useMemo(
    () =>
      selectedNodePath
        ? createParentOptions(visibleSkillMap, selectedNodePath)
        : [{ label: "ルートにする", path: null }],
    [selectedNodePath, visibleSkillMap],
  );

  useEffect(() => {
    setSelectedNode(null);
    setSelectedNodePath(null);
    setSelectedRelatedEdgeId(null);
    setProgressError(null);
    setNodeEditError(null);
    setGraphEditError(null);
    setEditMode(false);
    setDraftSkillMap(null);
    setDraftRelatedEdges(null);
    setQuery("");
    setActiveSearchIndex(0);
  }, [mapKey]);

  useEffect(() => {
    setActiveSearchIndex(0);
  }, [query]);

  useEffect(() => {
    if (!selectedNodePath) {
      return;
    }

    setSelectedNode(getSkillMapNodeByPath(visibleSkillMap, selectedNodePath));
  }, [selectedNodePath, visibleSkillMap]);

  async function handleUpdateProgress(nodeId: string, status: ProgressStatus) {
    if (isTemporaryNodeId(nodeId)) {
      setProgressError("新規ノードの学習状態は、変更を保存した後に更新できます。");
      return;
    }

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

      const nextSkillMap = updateStudySkillMapNodeStatus(visibleSkillMap, nodeId, status);
      applySkillMapChange(nextSkillMap);
      setSelectedNode(
        selectedNodePath ? getSkillMapNodeByPath(nextSkillMap, selectedNodePath) : selectedNode,
      );
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

    setActiveSearchIndex((currentIndex) =>
      direction === "next"
        ? (currentIndex + 1) % searchResults.length
        : (currentIndex - 1 + searchResults.length) % searchResults.length,
    );
  }

  function handleSelectNode(node: StudySkillMapNode, path: string) {
    setSelectedNode(node);
    setSelectedNodePath(path);
    setSelectedRelatedEdgeId(null);
    setNodeEditError(null);
  }

  function applySkillMapChange(nextSkillMap: StudySkillMapNode) {
    if (draftSkillMap) {
      setDraftSkillMap(nextSkillMap);
      return;
    }

    onChangeSkillMap(nextSkillMap);
  }

  function ensureEditMode() {
    if (draftSkillMap) {
      return {
        relatedEdges: visibleRelatedEdges,
        skillMap: draftSkillMap,
      };
    }

    if (!savedSkillMapId) {
      setGraphEditError("保存済みマップを開くと編集できます。");
      return null;
    }

    const nextDraftSkillMap = cloneStudySkillMap(skillMap);
    const nextDraftRelatedEdges = cloneRelatedEdges(relatedEdges);

    setDraftSkillMap(nextDraftSkillMap);
    setDraftRelatedEdges(nextDraftRelatedEdges);
    setEditMode(true);
    setSelectedRelatedEdgeId(null);
    setGraphEditError(null);

    return {
      relatedEdges: nextDraftRelatedEdges,
      skillMap: nextDraftSkillMap,
    };
  }

  function handleUpdateNodeDetails(input: {
    title: string;
    description: string;
    tags: string[];
  }) {
    const editState = ensureEditMode();

    if (!selectedNodePath || !editState) {
      setNodeEditError("編集モードでノードを編集してください。");
      return;
    }

    const title = input.title.trim();
    const description = input.description.trim();
    const tags = normalizeTags(input.tags);

    if (!title || title.length > 50) {
      setNodeEditError("ノード名は1〜50文字で入力してください。");
      return;
    }

    if (!description || description.length > 500) {
      setNodeEditError("説明は1〜500文字で入力してください。");
      return;
    }

    setIsEditingNode(true);
    setNodeEditError(null);

    try {
      const nextSkillMap = updateStudySkillMapNodeDetails(editState.skillMap, selectedNodePath, {
        title,
        description,
        tags,
      });
      setDraftSkillMap(nextSkillMap);
      setSelectedNode(getSkillMapNodeByPath(nextSkillMap, selectedNodePath));
    } finally {
      setIsEditingNode(false);
    }
  }

  function handleUpdateNodeParent(input: { parentLocked: boolean; parentPath: string | null }) {
    const editState = ensureEditMode();

    if (!selectedNodePath || !editState) {
      setNodeEditError("編集モードで親ノードを変更してください。");
      return;
    }

    const currentParent = getParentPath(selectedNodePath);
    const nextSkillMap =
      input.parentPath === currentParent
        ? updateStudySkillMapNodeParentLock(editState.skillMap, selectedNodePath, input.parentLocked)
        : reparentStudySkillMapNode(
            editState.skillMap,
            selectedNodePath,
            input.parentPath,
            input.parentLocked,
          );

    if (!nextSkillMap) {
      setNodeEditError("指定した親ノードへ移動できません。階層数や循環を確認してください。");
      return;
    }

    const nextSelectedPath =
      selectedNode?.nodeId ? findStudySkillMapNodePathByNodeId(nextSkillMap, selectedNode.nodeId) : null;

    setDraftSkillMap(nextSkillMap);
    setSelectedNodePath(nextSelectedPath);
    setSelectedNode(nextSelectedPath ? getSkillMapNodeByPath(nextSkillMap, nextSelectedPath) : null);
    setNodeEditError(null);
  }

  function handleUpdateNodeEdgeSourcePosition(position: NodeConnectionPosition | null) {
    const editState = ensureEditMode();

    if (!selectedNodePath || !editState) {
      setNodeEditError("編集モードで開始点を変更してください。");
      return;
    }

    const nextSkillMap = updateStudySkillMapNodeEdgeSourcePosition(
      editState.skillMap,
      selectedNodePath,
      position,
    );

    setDraftSkillMap(nextSkillMap);
    setSelectedNode(getSkillMapNodeByPath(nextSkillMap, selectedNodePath));
    setNodeEditError(null);
  }

  function handleDeleteNode() {
    const editState = ensureEditMode();

    if (!selectedNode || !selectedNodePath || !editState) {
      setNodeEditError("編集モードでノードを削除してください。");
      return;
    }

    const subtreeCount = countStudySkillMapNodes(selectedNode);
    const subtreeProgressCount = countPersistedStudySkillMapNodes(selectedNode);
    const singleProgressCount =
      selectedNode.nodeId && !isTemporaryNodeId(selectedNode.nodeId) ? 1 : 0;
    const answer = window.prompt(
      [
        `削除対象: ${selectedNode.title}`,
        `1: 選択ノードと配下をすべて削除 (${subtreeCount}件)`,
        `   保存時に削除される学習進捗: 最大${subtreeProgressCount}件`,
        "2: 選択ノードのみ削除",
        "   直接の子ノードはルートへ移動し、子孫構造と進捗は維持されます。",
        `   保存時に削除される学習進捗: 最大${singleProgressCount}件`,
        "実行する番号を入力してください。",
      ].join("\n"),
    );
    const mode: DeleteNodeMode | null =
      answer === "1" ? "subtree" : answer === "2" ? "single" : null;

    if (!mode) {
      return;
    }

    setIsDeletingNode(true);
    setNodeEditError(null);

    try {
      const removedNodeIds = new Set(collectRemovedNodeIds(selectedNode, mode));
      const nextSkillMap = deleteStudySkillMapNodeAtPathWithMode(
        editState.skillMap,
        selectedNodePath,
        mode,
      );
      const nextRelatedEdges = editState.relatedEdges.filter(
        (edge) => !removedNodeIds.has(edge.nodeAId) && !removedNodeIds.has(edge.nodeBId),
      );

      setDraftSkillMap(nextSkillMap);
      setDraftRelatedEdges(nextRelatedEdges);
      setSelectedNode(null);
      setSelectedNodePath(null);
      setSelectedRelatedEdgeId(null);
    } finally {
      setIsDeletingNode(false);
    }
  }

  function handleAddChildNode(title: string, direction: ChildNodeDirection) {
    addDraftNode(title, selectedNodePath, direction);
  }

  function handleAddRootNode() {
    const title = window.prompt("追加する独立ノード名を入力してください。");

    if (title === null) {
      return;
    }

    addDraftNode(title, null, "right");
  }

  function addDraftNode(
    title: string,
    parentPath: string | null,
    direction: ChildNodeDirection,
  ) {
    const editState = ensureEditMode();
    const trimmedTitle = title.trim();

    if (!trimmedTitle || trimmedTitle.length > 50) {
      setNodeEditError("追加するノード名は1〜50文字で入力してください。");
      return;
    }

    if (!editState) {
      setNodeEditError("編集モードでノードを追加してください。");
      return;
    }

    if (countVisibleSkillMapNodes(editState.skillMap) >= 50) {
      setNodeEditError("ノード数は50件までです。");
      return;
    }

    if (parentPath && parentPath.split("-").length >= 4) {
      setNodeEditError("ノードの階層は4階層までです。");
      return;
    }

    setIsAddingChild(true);
    setNodeEditError(null);

    try {
      const nextNode = createDraftNode(
        trimmedTitle,
        parentPath ? getChildNodePosition(editState.skillMap, parentPath, direction) : null,
      );
      const nextRootPath = String(editState.skillMap.children.length + 1);
      const nextSkillMap = parentPath
        ? addStudySkillMapChildNode(editState.skillMap, parentPath, nextNode)
        : addStudySkillMapRootNode(editState.skillMap, nextNode);

      setDraftSkillMap(nextSkillMap);
      setSelectedNode(parentPath ? getSkillMapNodeByPath(nextSkillMap, parentPath) : nextNode);
      setSelectedNodePath(parentPath ?? nextRootPath);
    } finally {
      setIsAddingChild(false);
    }
  }

  function startEditMode() {
    if (!savedSkillMapId) {
      setGraphEditError("保存済みマップを開くと編集できます。");
      return;
    }

    setDraftSkillMap(cloneStudySkillMap(skillMap));
    setDraftRelatedEdges(cloneRelatedEdges(relatedEdges));
    setEditMode(true);
    setSelectedRelatedEdgeId(null);
    setGraphEditError(null);
  }

  function cancelEditMode() {
    if (draftSkillMap && !window.confirm("保存していない編集内容を破棄しますか？")) {
      return;
    }

    setDraftSkillMap(null);
    setDraftRelatedEdges(null);
    setEditMode(false);
    setGraphEditError(null);
    setSelectedNode(null);
    setSelectedNodePath(null);
    setSelectedRelatedEdgeId(null);
    onChangeSkillMap(skillMap);
    onChangeRelatedEdges(relatedEdges);
  }

  async function saveGraph() {
    if (!savedSkillMapId || !draftSkillMap) {
      return;
    }

    setIsSavingGraph(true);
    setGraphEditError(null);

    try {
      const response = await fetch(`/api/skillmaps/${savedSkillMapId}/graph`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nodes: flattenSkillMapForGraphSave(draftSkillMap),
          relatedEdges: draftRelatedEdges ?? [],
        }),
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        setGraphEditError(getGraphApiErrorMessage(payload));
        return;
      }

      const parsedPayload = payload as SaveGraphResponse;

      onChangeSkillMap(parsedPayload.data.skillMap);
      onChangeRelatedEdges(parsedPayload.data.relatedEdges);
      setDraftSkillMap(null);
      setDraftRelatedEdges(null);
      setEditMode(false);
      setSelectedNode(null);
      setSelectedNodePath(null);
      setSelectedRelatedEdgeId(null);
    } catch {
      setGraphEditError("グラフの保存に失敗しました。");
    } finally {
      setIsSavingGraph(false);
    }
  }

  function handleNodePositionsChange(changes: NodeChange<SkillMapFlowNode>[]) {
    if (!editMode) {
      return;
    }

    setDraftSkillMap((currentDraft) => {
      if (!currentDraft) {
        return currentDraft;
      }

      return changes.reduce((nextSkillMap, change) => {
        if (change.type !== "position" || !change.position) {
          return nextSkillMap;
        }

        return updateStudySkillMapNodePosition(
          nextSkillMap,
          getPathFromFlowNodeId(change.id),
          change.position,
        );
      }, currentDraft);
    });
  }

  function handleAutoArrange() {
    if (!editMode || !draftSkillMap) {
      setGraphEditError("編集モードで自動整列してください。");
      return;
    }

    setDraftSkillMap(autoArrangeStudySkillMap(visibleSkillMap));
    setSelectedRelatedEdgeId(null);
    setGraphEditError(null);
  }

  function handleConnectRelatedEdge(firstNodeId: string, secondNodeId: string) {
    if (!editMode || !draftSkillMap) {
      setGraphEditError("編集モードで関連線を追加してください。");
      return;
    }

    const firstNode = getStudySkillMapNodeByNodeId(visibleSkillMap, firstNodeId);
    const secondNode = getStudySkillMapNodeByNodeId(visibleSkillMap, secondNodeId);

    if (!firstNode || !secondNode || firstNodeId === secondNodeId) {
      setGraphEditError("同じノード、または存在しないノードには接続できません。");
      return;
    }

    const pair = canonicalizeNodePair(firstNodeId, secondNodeId);

    if (isDirectHierarchyPair(visibleSkillMap, pair.nodeAId, pair.nodeBId)) {
      setGraphEditError("親子関係と同じ関連線は追加できません。");
      return;
    }

    if (visibleRelatedEdges.some((edge) => edge.nodeAId === pair.nodeAId && edge.nodeBId === pair.nodeBId)) {
      setGraphEditError("同じ関連線はすでに存在します。");
      return;
    }

    const nextRelatedEdges = [
      ...visibleRelatedEdges,
      {
        id: createTemporaryEdgeId(),
        nodeAId: pair.nodeAId,
        nodeBId: pair.nodeBId,
      },
    ];

    setDraftRelatedEdges(nextRelatedEdges);
    setSelectedRelatedEdgeId(null);
    setGraphEditError(null);
  }

  function handleDeleteSelectedRelatedEdge() {
    if (!editMode || !selectedRelatedEdge) {
      return;
    }

    const firstTitle = getStudySkillMapNodeByNodeId(visibleSkillMap, selectedRelatedEdge.nodeAId)?.title;
    const secondTitle = getStudySkillMapNodeByNodeId(visibleSkillMap, selectedRelatedEdge.nodeBId)?.title;
    const confirmed = window.confirm(
      `関連線「${firstTitle ?? "ノード"} - ${secondTitle ?? "ノード"}」を削除しますか？\nノード、階層、学習進捗は削除されません。`,
    );

    if (!confirmed) {
      return;
    }

    setDraftRelatedEdges(visibleRelatedEdges.filter((edge) => edge.id !== selectedRelatedEdge.id));
    setSelectedRelatedEdgeId(null);
    setGraphEditError(null);
  }

  return (
    <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="text-sm text-muted-foreground">ノードをクリックすると詳細を表示します。</p>
          <div className="flex flex-wrap items-center gap-3">
            <div
              aria-label={`進捗 ${progressStats.percent}%`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={progressStats.percent}
              className="h-2 w-40 overflow-hidden rounded-full bg-muted"
              role="progressbar"
            >
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${progressStats.percent}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              進捗 {progressStats.percent}% ({progressStats.completedCount}/{progressStats.totalCount})
            </p>
          </div>
          {progressError ? (
            <p aria-live="assertive" className="text-sm text-destructive" role="alert">
              {progressError}
            </p>
          ) : null}
          {graphEditError ? (
            <p aria-live="assertive" className="text-sm text-destructive" role="alert">
              {graphEditError}
            </p>
          ) : null}
        </div>

        <div className="flex w-full min-w-0 flex-col gap-2 rounded-lg border bg-background p-3 xl:max-w-md">
          <label className="flex items-center gap-2 text-sm font-medium" htmlFor="skillmap-search">
            <Search aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
            マップ内検索
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <input
                className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 pr-10 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                id="skillmap-search"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="タイトル・説明を検索"
                type="search"
                value={query}
              />
              {hasSearchQuery ? (
                <button
                  aria-label="検索文字列をクリア"
                  className="absolute right-1 top-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setQuery("")}
                  type="button"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <div className="flex gap-2">
              <button
                aria-label="前の検索結果へ移動"
                className="h-10 rounded-md border px-3 text-sm disabled:opacity-50"
                disabled={searchResults.length === 0}
                onClick={() => moveSearchResult("previous")}
                type="button"
              >
                前へ
              </button>
              <button
                aria-label="次の検索結果へ移動"
                className="h-10 rounded-md border px-3 text-sm disabled:opacity-50"
                disabled={searchResults.length === 0}
                onClick={() => moveSearchResult("next")}
                type="button"
              >
                次へ
              </button>
            </div>
          </div>
          <p aria-live="polite" className="text-xs text-muted-foreground" role="status">
            {hasSearchQuery
              ? searchResults.length > 0
                ? `${activeSearchIndex + 1}/${searchResults.length}件`
                : "一致するノードはありません"
              : "検索文字列が空の場合は通常表示です"}
          </p>
        </div>

        <div className="flex rounded-md border bg-background p-1">
          <button
            aria-pressed={viewMode === "map"}
            className={`rounded px-3 py-1 text-sm transition-colors ${
              viewMode === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
            onClick={() => setViewMode("map")}
            type="button"
          >
            マップ
          </button>
          <button
            aria-pressed={viewMode === "list"}
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

      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-background p-3">
        {editMode ? (
          <>
            <span className="text-sm font-medium">編集モード</span>
            <button
              className="rounded-md border bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
              disabled={isSavingGraph}
              onClick={saveGraph}
              type="button"
            >
              {isSavingGraph ? "保存中" : "変更を保存"}
            </button>
            <button
              className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
              disabled={isSavingGraph}
              onClick={cancelEditMode}
              type="button"
            >
              キャンセル
            </button>
            <button
              className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
              disabled={isSavingGraph || countVisibleSkillMapNodes(visibleSkillMap) >= 50}
              onClick={handleAddRootNode}
              type="button"
            >
              独立ノード追加
            </button>
            <button
              className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
              disabled={isSavingGraph}
              onClick={handleAutoArrange}
              type="button"
            >
              4方向自動整列
            </button>
            <button
              className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
              disabled={isSavingGraph || !selectedRelatedEdge}
              onClick={handleDeleteSelectedRelatedEdge}
              type="button"
            >
              選択した関連線を削除
            </button>
            <span className="text-xs text-muted-foreground">
              ノード間をドラッグすると、階層を変えずに関連線を追加します。
            </span>
          </>
        ) : (
          <>
            <button
              className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
              disabled={!savedSkillMapId}
              onClick={startEditMode}
              type="button"
            >
              編集モードへ
            </button>
            {!savedSkillMapId ? (
              <span className="text-xs text-muted-foreground">保存後に編集できます。</span>
            ) : null}
          </>
        )}
      </div>

      {viewMode === "map" ? (
        <SkillMapFlowViewer
          activeSearchPath={activeSearchPath}
          editMode={editMode}
          onConnectRelatedEdge={handleConnectRelatedEdge}
          onNodePositionsChange={handleNodePositionsChange}
          onSelectNode={handleSelectNode}
          onSelectRelatedEdge={setSelectedRelatedEdgeId}
          relatedEdges={visibleRelatedEdges}
          searchMatchPaths={searchMatchPaths}
          selectedRelatedEdgeId={selectedRelatedEdgeId}
          skillMap={visibleSkillMap}
        />
      ) : (
        <SkillMapListViewer
          activeSearchPath={activeSearchPath}
          onSelectNode={handleSelectNode}
          searchMatchPaths={searchMatchPaths}
          skillMap={visibleSkillMap}
        />
      )}

      </div>

      <div className="min-w-0 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:min-h-0">
      <SkillMapDetailDrawer
        currentParentPath={currentParentPath}
        editMode={editMode}
        isAddingChild={isAddingChild}
        isDeletingNode={isDeletingNode}
        isEditingNode={isEditingNode}
        isUpdatingProgress={updatingNodeId === selectedNode?.nodeId}
        node={selectedNode}
        nodeEditError={nodeEditError}
        onAddChildNode={handleAddChildNode}
        onClose={() => {
          setSelectedNode(null);
          setSelectedNodePath(null);
          setNodeEditError(null);
        }}
        onDeleteNode={handleDeleteNode}
        onUpdateNodeDetails={handleUpdateNodeDetails}
        onUpdateNodeEdgeSourcePosition={handleUpdateNodeEdgeSourcePosition}
        onUpdateNodeParent={handleUpdateNodeParent}
        onUpdateProgress={handleUpdateProgress}
        parentOptions={parentOptions}
        variant="panel"
      />
      </div>
    </div>
  );
}

function getGraphApiErrorMessage(payload: unknown) {
  if (!isApiErrorResponse(payload)) {
    return "グラフの保存に失敗しました。";
  }

  return payload.error?.message ?? "グラフの保存に失敗しました。";
}

function isApiErrorResponse(payload: unknown): payload is { error?: { message?: string } } {
  return typeof payload === "object" && payload !== null && "error" in payload;
}

function countStudySkillMapNodes(skillMap: StudySkillMapNode): number {
  return 1 + skillMap.children.reduce((count, child) => count + countStudySkillMapNodes(child), 0);
}

function countVisibleSkillMapNodes(skillMap: StudySkillMapNode): number {
  return skillMap.children.reduce((count, child) => count + countStudySkillMapNodes(child), 0);
}

function countPersistedStudySkillMapNodes(skillMap: StudySkillMapNode): number {
  const selfCount = skillMap.nodeId && !isTemporaryNodeId(skillMap.nodeId) ? 1 : 0;
  return (
    selfCount +
    skillMap.children.reduce((count, child) => count + countPersistedStudySkillMapNodes(child), 0)
  );
}

function collectRemovedNodeIds(skillMap: StudySkillMapNode, mode: DeleteNodeMode): string[] {
  if (!skillMap.nodeId) {
    return [];
  }

  if (mode === "single") {
    return [skillMap.nodeId];
  }

  return [
    skillMap.nodeId,
    ...skillMap.children.flatMap((child) => collectRemovedNodeIds(child, "subtree")),
  ];
}

function normalizeTags(tags: string[]) {
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean))).slice(0, 5);
}

function getPathFromFlowNodeId(nodeId: string) {
  return nodeId.startsWith("node-") ? nodeId.slice("node-".length) : nodeId;
}

function getParentPath(path: string) {
  const parts = path.split("-");

  if (parts.length <= 1) {
    return null;
  }

  return parts.slice(0, -1).join("-");
}

function createParentOptions(
  skillMap: StudySkillMapNode,
  selectedPath: string,
): ParentNodeOption[] {
  const selectedNode = getSkillMapNodeByPath(skillMap, selectedPath);
  const selectedDepth = selectedNode ? getStudySkillMapNodeDepth(selectedNode) : 1;
  const options: ParentNodeOption[] = [{ label: "ルートにする", path: null }];

  function visit(node: StudySkillMapNode, path: string, depth: number) {
    const isSelectedNode = path === selectedPath;
    const isSelectedDescendant = path.startsWith(`${selectedPath}-`);
    const wouldExceedMaxDepth = depth + selectedDepth > 4;

    if (!isSelectedNode && !isSelectedDescendant && !wouldExceedMaxDepth) {
      options.push({
        label: `${"　".repeat(Math.max(0, depth - 1))}${node.title}`,
        path,
      });
    }

    node.children.forEach((child, index) => {
      visit(child, path ? `${path}-${index + 1}` : String(index + 1), depth + 1);
    });
  }

  skillMap.children.forEach((child, index) => {
    visit(child, String(index + 1), 1);
  });

  return options;
}

function getStudySkillMapNodeDepth(node: StudySkillMapNode): number {
  if (node.children.length === 0) {
    return 1;
  }

  return 1 + Math.max(...node.children.map(getStudySkillMapNodeDepth));
}

function findStudySkillMapNodePathByNodeId(
  skillMap: StudySkillMapNode,
  nodeId: string,
): string | null {
  let foundPath: string | null = null;

  function visit(node: StudySkillMapNode, path: string) {
    if (foundPath) {
      return;
    }

    if (node.nodeId === nodeId) {
      foundPath = path;
      return;
    }

    node.children.forEach((child, index) => {
      visit(child, `${path}-${index + 1}`);
    });
  }

  skillMap.children.forEach((child, index) => {
    visit(child, String(index + 1));
  });

  return foundPath;
}

function createDraftNode(
  title: string,
  position: { x: number; y: number } | null = null,
): StudySkillMapNode {
  return {
    nodeId: createTemporaryNodeId(),
    title,
    description: `${title}について学習します。`,
    tags: [],
    progressStatus: "NOT_STARTED",
    positionX: position?.x ?? null,
    positionY: position?.y ?? null,
    parentLocked: false,
    parentEdgeSourcePosition: null,
    children: [],
  };
}

function getChildNodePosition(
  skillMap: StudySkillMapNode,
  parentPath: string,
  direction: ChildNodeDirection,
) {
  const parentPosition = getFlowNodePosition(skillMap, parentPath);
  const directionOffset = getDirectionOffset(direction);

  return {
    x: parentPosition.x + directionOffset.x,
    y: parentPosition.y + directionOffset.y,
  };
}

function getFlowNodePosition(skillMap: StudySkillMapNode, path: string) {
  const flowElements = createSkillMapFlowElements(skillMap);
  const flowNode = flowElements.nodes.find((node) => node.data.path === path);

  return flowNode?.position ?? { x: 0, y: 0 };
}

function getDirectionOffset(direction: ChildNodeDirection) {
  if (direction === "left") {
    return { x: -320, y: 0 };
  }

  if (direction === "down") {
    return { x: 0, y: 180 };
  }

  if (direction === "up") {
    return { x: 0, y: -180 };
  }

  return { x: 320, y: 0 };
}

function createTemporaryNodeId() {
  return `temp-${globalThis.crypto.randomUUID()}`;
}

function createTemporaryEdgeId() {
  return `temp-edge-${globalThis.crypto.randomUUID()}`;
}

function isTemporaryNodeId(nodeId: string) {
  return nodeId.startsWith("temp-");
}

function cloneStudySkillMap(skillMap: StudySkillMapNode): StudySkillMapNode {
  return {
    ...skillMap,
    tags: [...skillMap.tags],
    children: skillMap.children.map(cloneStudySkillMap),
  };
}

function cloneRelatedEdges(edges: StudySkillMapEdge[]) {
  return edges.map((edge) => ({ ...edge }));
}

function flattenSkillMapForGraphSave(skillMap: StudySkillMapNode) {
  const nodes: {
    id: string;
    parentId: string | null;
    title: string;
    description: string;
    tags: string[];
    order: number;
    positionX: number | null;
    positionY: number | null;
    parentLocked: boolean;
    parentEdgeSourcePosition: NodeConnectionPosition | null;
    isNew: boolean;
  }[] = [];

  function visit(node: StudySkillMapNode, parentId: string | null, order: number) {
    if (!node.nodeId) {
      return;
    }

    nodes.push({
      id: node.nodeId,
      parentId,
      title: node.title,
      description: node.description,
      tags: node.tags,
      order,
      positionX: node.positionX,
      positionY: node.positionY,
      parentLocked: node.parentLocked,
      parentEdgeSourcePosition: node.parentEdgeSourcePosition,
      isNew: isTemporaryNodeId(node.nodeId),
    });

    node.children.forEach((child, index) => visit(child, node.nodeId, index));
  }

  skillMap.children.forEach((child, index) => visit(child, null, index));

  return nodes;
}

function getStudySkillMapNodeByNodeId(
  skillMap: StudySkillMapNode,
  nodeId: string,
): StudySkillMapNode | null {
  let foundNode: StudySkillMapNode | null = null;

  function visit(node: StudySkillMapNode) {
    if (foundNode) {
      return;
    }

    if (node.nodeId === nodeId) {
      foundNode = node;
      return;
    }

    node.children.forEach(visit);
  }

  skillMap.children.forEach(visit);

  return foundNode;
}

function isDirectHierarchyPair(skillMap: StudySkillMapNode, firstNodeId: string, secondNodeId: string) {
  let isHierarchyPair = false;

  function visit(node: StudySkillMapNode) {
    if (isHierarchyPair || !node.nodeId) {
      return;
    }

    for (const child of node.children) {
      if (
        child.nodeId &&
        ((node.nodeId === firstNodeId && child.nodeId === secondNodeId) ||
          (node.nodeId === secondNodeId && child.nodeId === firstNodeId))
      ) {
        isHierarchyPair = true;
        return;
      }
    }

    node.children.forEach(visit);
  }

  skillMap.children.forEach(visit);

  return isHierarchyPair;
}

function canonicalizeNodePair(firstNodeId: string, secondNodeId: string) {
  const [nodeAId, nodeBId] =
    firstNodeId < secondNodeId ? [firstNodeId, secondNodeId] : [secondNodeId, firstNodeId];

  return {
    nodeAId,
    nodeBId,
  };
}
