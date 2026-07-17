"use client";

import { ArrowRight, CheckCircle2, Loader2, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { SkillMapLearningView } from "@/components/skillmap/skill-map-learning-view";
import { Button } from "@/components/ui/button";
import { createStudySkillMap, resetStudySkillMapNodeStatuses } from "@/lib/skillmap-progress";
import type { GenerateSkillMapResponse, GeneratedSkillMap } from "@/lib/skillmap-schema";
import type { StudySkillMapNode } from "@/types/node";
import type { SavedSkillMapDetail, SavedSkillMapSummary, StudySkillMapEdge } from "@/types/skillmap";

type GeneratorMode = "mock" | "openai";

type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

type SaveSkillMapResponse = {
  data: SavedSkillMapSummary;
};

type RenameSkillMapResponse = {
  data: SavedSkillMapSummary;
};

type LoadSkillMapResponse = {
  data: SavedSkillMapDetail;
};

type ListSkillMapsResponse = {
  data: SavedSkillMapSummary[];
};

type SkillMapGeneratorProps = {
  initialSavedSkillMaps: SavedSkillMapSummary[];
};

const EXAMPLES = ["Linux スキルマップ", "AWS SAA", "高校世界史", "高校数学I", "Python 初学者"];
const LAST_OPENED_SKILL_MAP_ID_KEY = "skillmap:last-opened-id";

export function SkillMapGenerator({ initialSavedSkillMaps }: SkillMapGeneratorProps) {
  const [theme, setTheme] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [skillMap, setSkillMap] = useState<StudySkillMapNode | null>(null);
  const [relatedEdges, setRelatedEdges] = useState<StudySkillMapEdge[]>([]);
  const [generatorMode, setGeneratorMode] = useState<GeneratorMode | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [savedSkillMapId, setSavedSkillMapId] = useState<string | null>(null);
  const [loadingSkillMapId, setLoadingSkillMapId] = useState<string | null>(null);
  const [renamingSkillMapId, setRenamingSkillMapId] = useState<string | null>(null);
  const [deletingSkillMapId, setDeletingSkillMapId] = useState<string | null>(null);
  const [isResettingProgress, setIsResettingProgress] = useState(false);
  const [savedSkillMaps, setSavedSkillMaps] =
    useState<SavedSkillMapSummary[]>(initialSavedSkillMaps);
  const [hasRestoredInitialMap, setHasRestoredInitialMap] = useState(false);
  const isBusy =
    isGenerating ||
    isSaving ||
    isResettingProgress ||
    loadingSkillMapId !== null ||
    renamingSkillMapId !== null ||
    deletingSkillMapId !== null;
  const hasSavedCurrentMap = savedSkillMapId !== null;

  useEffect(() => {
    let isMounted = true;

    async function refreshSavedSkillMaps() {
      try {
        const response = await fetch("/api/skillmaps", {
          cache: "no-store",
        });
        const payload: unknown = await response.json();

        if (!response.ok || !isListSkillMapsResponse(payload) || !isMounted) {
          return;
        }

        setSavedSkillMaps(payload.data);
      } catch {
        // Keep the server-rendered list if the client refresh fails.
      }
    }

    void refreshSavedSkillMaps();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (hasRestoredInitialMap || skillMap || savedSkillMaps.length === 0) {
      return;
    }

    const lastOpenedSkillMapId = window.localStorage.getItem(LAST_OPENED_SKILL_MAP_ID_KEY);
    const targetSkillMap =
      savedSkillMaps.find((savedSkillMap) => savedSkillMap.id === lastOpenedSkillMapId) ??
      savedSkillMaps[0];

    setHasRestoredInitialMap(true);
    void handleLoad(targetSkillMap.id);
    // Initial restore is guarded by hasRestoredInitialMap; handleLoad intentionally stays out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasRestoredInitialMap, savedSkillMaps, skillMap]);

  function handleChangeSkillMap(nextSkillMap: StudySkillMapNode) {
    setSkillMap(nextSkillMap);

    if (!savedSkillMapId) {
      return;
    }

    setSavedSkillMaps((current) =>
      current.map((savedSkillMap) =>
        savedSkillMap.id === savedSkillMapId
          ? {
              ...savedSkillMap,
              title: nextSkillMap.title,
              nodeCount: countSkillMapNodes(nextSkillMap),
            }
          : savedSkillMap,
      ),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTheme = theme.trim();

    if (trimmedTheme.length < 2) {
      setErrorMessage("テーマは2文字以上で入力してください。");
      return;
    }

    if (trimmedTheme.length > 100) {
      setErrorMessage("テーマは100文字以内で入力してください。");
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setSaveMessage(null);

    try {
      const response = await fetch("/api/skillmaps/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          theme: trimmedTheme,
        }),
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        setErrorMessage(getApiErrorMessage(payload));
        return;
      }

      const parsedPayload = payload as GenerateSkillMapResponse;
      const responseMode = response.headers.get("x-skillmap-generator-mode");

      setGeneratorMode(responseMode === "openai" ? "openai" : "mock");
      setSkillMap(createStudySkillMap(parsedPayload.data));
      setRelatedEdges([]);
      setGeneratedPrompt(trimmedTheme);
      setSavedSkillMapId(null);
    } catch {
      setErrorMessage("生成に失敗しました。時間をおいて再試行してください。");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSave() {
    if (!skillMap || !generatedPrompt) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSaveMessage(null);

    try {
      const response = await fetch("/api/skillmaps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: generatedPrompt,
          data: toGeneratedSkillMapForSave(skillMap),
        }),
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        setErrorMessage(getApiErrorMessage(payload));
        return;
      }

      const parsedPayload = payload as SaveSkillMapResponse;

      setSavedSkillMapId(parsedPayload.data.id);
      window.localStorage.setItem(LAST_OPENED_SKILL_MAP_ID_KEY, parsedPayload.data.id);
      setSavedSkillMaps((current) => [
        parsedPayload.data,
        ...current.filter((savedSkillMap) => savedSkillMap.id !== parsedPayload.data.id),
      ]);
      await loadSavedSkillMap(parsedPayload.data.id, "保存しました。");
    } catch {
      setErrorMessage("保存に失敗しました。時間をおいて再試行してください。");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLoad(savedSkillMapIdToLoad: string) {
    await loadSavedSkillMap(savedSkillMapIdToLoad, "保存済みマップを読み込みました。");
  }

  async function handleRename(savedSkillMap: SavedSkillMapSummary) {
    const nextTitle = window.prompt("新しいマップ名を入力してください。", savedSkillMap.title);

    if (nextTitle === null) {
      return;
    }

    const trimmedTitle = nextTitle.trim();

    if (!trimmedTitle) {
      setErrorMessage("マップ名は必須です。空白のみにはできません。");
      return;
    }

    setRenamingSkillMapId(savedSkillMap.id);
    setErrorMessage(null);
    setSaveMessage(null);

    try {
      const response = await fetch(`/api/skillmaps/${savedSkillMap.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: trimmedTitle,
        }),
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        setErrorMessage(getApiErrorMessage(payload));
        return;
      }

      const parsedPayload = payload as RenameSkillMapResponse;

      setSavedSkillMaps((current) =>
        current.map((currentSkillMap) =>
          currentSkillMap.id === parsedPayload.data.id ? parsedPayload.data : currentSkillMap,
        ),
      );

      if (savedSkillMapId === parsedPayload.data.id && skillMap) {
        setSkillMap({
          ...skillMap,
          title: parsedPayload.data.title,
        });
      }

      setSaveMessage("マップ名を変更しました。");
    } catch {
      setErrorMessage("マップ名の変更に失敗しました。時間をおいて再試行してください。");
    } finally {
      setRenamingSkillMapId(null);
    }
  }

  async function handleDelete(savedSkillMap: SavedSkillMapSummary) {
    const confirmed = window.confirm(
      `「${savedSkillMap.title}」を削除しますか？\nマップ、ノード、関連線、学習進捗が削除されます。この操作は元に戻せません。`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingSkillMapId(savedSkillMap.id);
    setErrorMessage(null);
    setSaveMessage(null);

    try {
      const response = await fetch(`/api/skillmaps/${savedSkillMap.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload: unknown = await response.json();
        setErrorMessage(getApiErrorMessage(payload));
        return;
      }

      setSavedSkillMaps((current) =>
        current.filter((currentSkillMap) => currentSkillMap.id !== savedSkillMap.id),
      );

      if (savedSkillMapId === savedSkillMap.id) {
        setSkillMap(null);
        setRelatedEdges([]);
        setSavedSkillMapId(null);
        setGeneratedPrompt("");
        setGeneratorMode(null);
        window.localStorage.removeItem(LAST_OPENED_SKILL_MAP_ID_KEY);
      }

      setSaveMessage("マップを削除しました。");
    } catch {
      setErrorMessage("マップの削除に失敗しました。時間をおいて再試行してください。");
    } finally {
      setDeletingSkillMapId(null);
    }
  }

  async function handleResetProgress() {
    if (!savedSkillMapId || !skillMap) {
      return;
    }

    const confirmed = window.confirm(
      "このマップ内の学習進捗をすべて未学習に戻しますか？\nノードと関連線は変更されません。",
    );

    if (!confirmed) {
      return;
    }

    setIsResettingProgress(true);
    setErrorMessage(null);
    setSaveMessage(null);

    try {
      const response = await fetch(`/api/skillmaps/${savedSkillMapId}/progress-reset`, {
        method: "POST",
      });

      if (!response.ok) {
        const payload: unknown = await response.json();
        setErrorMessage(getApiErrorMessage(payload));
        return;
      }

      setSkillMap(resetStudySkillMapNodeStatuses(skillMap));
      setSaveMessage("学習進捗をリセットしました。");
    } catch {
      setErrorMessage("学習進捗のリセットに失敗しました。時間をおいて再試行してください。");
    } finally {
      setIsResettingProgress(false);
    }
  }

  async function loadSavedSkillMap(savedSkillMapIdToLoad: string, successMessage: string) {
    setLoadingSkillMapId(savedSkillMapIdToLoad);
    setErrorMessage(null);
    setSaveMessage(null);

    try {
      const response = await fetch(`/api/skillmaps/${savedSkillMapIdToLoad}`);
      const payload: unknown = await response.json();

      if (!response.ok) {
        setErrorMessage(getApiErrorMessage(payload));
        return;
      }

      const parsedPayload = payload as LoadSkillMapResponse;

      setTheme(parsedPayload.data.prompt);
      setGeneratedPrompt(parsedPayload.data.prompt);
      setSkillMap(parsedPayload.data.skillMap);
      setRelatedEdges(parsedPayload.data.relatedEdges);
      setSavedSkillMapId(parsedPayload.data.id);
      window.localStorage.setItem(LAST_OPENED_SKILL_MAP_ID_KEY, parsedPayload.data.id);
      setGeneratorMode(null);
      setSaveMessage(successMessage);
    } catch {
      setErrorMessage("保存済みマップの読み込みに失敗しました。");
    } finally {
      setLoadingSkillMapId(null);
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-7rem)] gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-1">
      <form
        aria-busy={isGenerating}
        className="order-1 rounded-lg border bg-card p-4 shadow-sm sm:p-5"
        onSubmit={handleSubmit}
      >
        <label className="mb-2 block text-sm font-medium" htmlFor="topic">
          テーマを入力してください
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            disabled={isBusy}
            id="topic"
            name="topic"
            onChange={(event) => setTheme(event.target.value)}
            placeholder="Linux スキルマップ"
            type="text"
            value={theme}
          />
          <Button className="h-11 gap-2" disabled={isBusy} type="submit">
            {isGenerating ? (
              <>
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                生成中
              </>
            ) : (
              <>
                生成する
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
        {errorMessage ? (
          <p aria-live="assertive" className="mt-3 text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </form>

      <aside className="order-3 rounded-lg border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold">入力例</h2>
        <ExampleList onSelect={setTheme} />
      </aside>

      <section className="order-2 rounded-lg border bg-card p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">保存済みマップ</h2>
          <span className="text-xs text-muted-foreground">{savedSkillMaps.length}件</span>
        </div>
        {savedSkillMaps.length > 0 ? (
          <div className="grid gap-2">
            {savedSkillMaps.map((savedSkillMap) => (
              <div
                className={`rounded-md border p-2 transition-colors ${
                  savedSkillMap.id === savedSkillMapId ? "border-primary bg-muted" : ""
                }`}
                key={savedSkillMap.id}
              >
                <button
                  aria-current={savedSkillMap.id === savedSkillMapId ? "true" : undefined}
                  className="block w-full rounded px-1 py-1 text-left transition-colors hover:bg-background/80 disabled:cursor-wait disabled:opacity-70"
                  disabled={isBusy}
                  onClick={() => handleLoad(savedSkillMap.id)}
                  type="button"
                >
                  <span className="flex min-w-0 items-center justify-between gap-3">
                    <span className="block min-w-0 break-words text-sm font-medium">
                      {savedSkillMap.title}
                    </span>
                    {loadingSkillMapId === savedSkillMap.id ? (
                      <Loader2 aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin" />
                    ) : null}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {savedSkillMap.nodeCount}ノード / {formatDate(savedSkillMap.createdAt)}
                  </span>
                </button>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    className="h-8 gap-1 px-2 text-xs"
                    disabled={isBusy}
                    onClick={() => handleRename(savedSkillMap)}
                    type="button"
                    variant="outline"
                  >
                    {renamingSkillMapId === savedSkillMap.id ? (
                      <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                    )}
                    名前変更
                  </Button>
                  <Button
                    className="h-8 gap-1 px-2 text-xs"
                    disabled={isBusy}
                    onClick={() => handleDelete(savedSkillMap)}
                    type="button"
                    variant="outline"
                  >
                    {deletingSkillMapId === savedSkillMap.id ? (
                      <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                    )}
                    削除
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed bg-muted/30 p-4">
            <p className="text-sm font-medium">保存済みのスキルマップはまだありません。</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              テーマから生成したあとに保存すると、この一覧から再表示できます。
            </p>
          </div>
        )}
      </section>

      </aside>

      <main className="min-w-0">
      {skillMap ? (
        <section className="space-y-4">
          <div className="rounded-lg border bg-card p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">スキルマップ</h3>
                <span
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${
                    hasSavedCurrentMap
                      ? "border-accent/40 bg-accent/10 text-foreground"
                      : "border-border bg-muted text-muted-foreground"
                  }`}
                >
                  {hasSavedCurrentMap ? (
                    <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
                  ) : null}
                  {hasSavedCurrentMap ? "保存済み" : "未保存"}
                </span>
                {generatorMode === "mock" ? (
                  <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                    開発用モックデータを表示しています
                  </span>
                ) : null}
              </div>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <Button
                className="gap-2"
                disabled={isBusy || savedSkillMapId !== null}
                onClick={handleSave}
                type="button"
              >
                {isSaving ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
                {isSaving ? "保存中" : savedSkillMapId ? "保存済み" : "保存する"}
              </Button>
              <Button
                className="gap-2"
                disabled={isBusy || !savedSkillMapId}
                onClick={handleResetProgress}
                type="button"
                variant="outline"
              >
                {isResettingProgress ? (
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw aria-hidden="true" className="h-4 w-4" />
                )}
                進捗リセット
              </Button>
              {saveMessage ? (
                <p aria-live="polite" className="text-sm text-muted-foreground" role="status">
                  {saveMessage}
                </p>
              ) : null}
            </div>
            <SkillMapLearningView
              mapKey={savedSkillMapId ?? generatedPrompt}
              onChangeRelatedEdges={setRelatedEdges}
              onChangeSkillMap={handleChangeSkillMap}
              relatedEdges={relatedEdges}
              savedSkillMapId={savedSkillMapId}
              skillMap={skillMap}
            />
          </div>
        </section>
      ) : (
        <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground">
          生成結果はここに表示されます。
        </div>
      )}
      </main>
    </div>
  );
}

function countSkillMapNodes(skillMap: StudySkillMapNode): number {
  return skillMap.children.reduce((count, child) => count + countVisibleSkillMapNodes(child), 0);
}

function countVisibleSkillMapNodes(skillMap: StudySkillMapNode): number {
  return 1 + skillMap.children.reduce((count, child) => count + countVisibleSkillMapNodes(child), 0);
}

function toGeneratedSkillMapForSave(skillMap: StudySkillMapNode): GeneratedSkillMap {
  const rootNode = skillMap.children[0] ?? skillMap;

  return toGeneratedSkillMapNode(rootNode);
}

function toGeneratedSkillMapNode(node: StudySkillMapNode): GeneratedSkillMap {
  return {
    title: node.title,
    description: node.description,
    tags: node.tags,
    children: node.children.map(toGeneratedSkillMapNode),
  };
}

export function SkillMapExampleList() {
  return <ExampleList />;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function ExampleList({ onSelect }: { onSelect?: (example: string) => void }) {
  return (
    <div className="grid gap-2">
      {EXAMPLES.map((example) => (
        <button
          className="rounded-md border px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted"
          key={example}
          onClick={() => onSelect?.(example)}
          type="button"
        >
          {example}
        </button>
      ))}
    </div>
  );
}

function getApiErrorMessage(payload: unknown) {
  if (!isApiErrorResponse(payload)) {
    return "生成に失敗しました。";
  }

  return payload.error?.message ?? "生成に失敗しました。";
}

function isApiErrorResponse(payload: unknown): payload is ApiErrorResponse {
  return typeof payload === "object" && payload !== null && "error" in payload;
}

function isListSkillMapsResponse(payload: unknown): payload is ListSkillMapsResponse {
  if (typeof payload !== "object" || payload === null || !("data" in payload)) {
    return false;
  }

  const data = (payload as { data: unknown }).data;

  return Array.isArray(data);
}
