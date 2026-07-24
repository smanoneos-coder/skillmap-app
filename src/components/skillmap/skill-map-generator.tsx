"use client";

import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { SkillMapLearningView } from "@/components/skillmap/skill-map-learning-view";
import { Button } from "@/components/ui/button";
import { createStudySkillMap, resetStudySkillMapNodeStatuses } from "@/lib/skillmap-progress";
import type { GenerateSkillMapResponse, GeneratedSkillMap } from "@/lib/skillmap-schema";
import type { StudySkillMapNode } from "@/types/node";
import type { SavedSkillMapDetail, SavedSkillMapSummary, StudySkillMapEdge } from "@/types/skillmap";

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
  initialSavedSkillMapsError?: string | null;
  userEmail: string | null;
};

const LAST_OPENED_SKILL_MAP_ID_KEY = "skillmap:last-opened-id";

export function SkillMapGenerator({
  initialSavedSkillMaps,
  initialSavedSkillMapsError = null,
  userEmail,
}: SkillMapGeneratorProps) {
  const [theme, setTheme] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedSkillMapsError, setSavedSkillMapsError] = useState<string | null>(
    initialSavedSkillMapsError,
  );
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [skillMap, setSkillMap] = useState<StudySkillMapNode | null>(null);
  const [relatedEdges, setRelatedEdges] = useState<StudySkillMapEdge[]>([]);
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
  const currentSavedSkillMap =
    savedSkillMapId === null
      ? null
      : savedSkillMaps.find((savedSkillMap) => savedSkillMap.id === savedSkillMapId) ?? null;

  useEffect(() => {
    let isMounted = true;

    async function refreshSavedSkillMaps() {
      try {
        const response = await fetch("/api/skillmaps", {
          cache: "no-store",
        });
        const payload: unknown = await response.json();

        if (!response.ok || !isListSkillMapsResponse(payload) || !isMounted) {
          setSavedSkillMapsError(getApiErrorMessage(payload));
          return;
        }

        setSavedSkillMaps(payload.data);
        setSavedSkillMapsError(null);
      } catch {
        if (isMounted) {
          setSavedSkillMapsError("Saved maps could not be refreshed.");
        }
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
      setErrorMessage("Theme must be at least 2 characters.");
      return;
    }

    if (trimmedTheme.length > 100) {
      setErrorMessage("Theme must be 100 characters or fewer.");
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

      setSkillMap(createStudySkillMap(parsedPayload.data));
      setRelatedEdges([]);
      setGeneratedPrompt(trimmedTheme);
      setSavedSkillMapId(null);
    } catch {
      setErrorMessage("Generation failed. Please try again later.");
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
      await loadSavedSkillMap(parsedPayload.data.id, "Saved.");
    } catch {
      setErrorMessage("Save failed. Please try again later.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLoad(savedSkillMapIdToLoad: string) {
    await loadSavedSkillMap(savedSkillMapIdToLoad, "Saved map loaded.");
  }

  async function handleRename(savedSkillMap: SavedSkillMapSummary) {
    const nextTitle = window.prompt("Enter a new map name.", savedSkillMap.title);

    if (nextTitle === null) {
      return;
    }

    const trimmedTitle = nextTitle.trim();

    if (!trimmedTitle) {
      setErrorMessage("Map name is required.");
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

      setSaveMessage("Map name updated.");
    } catch {
      setErrorMessage("Map rename failed. Please try again later.");
    } finally {
      setRenamingSkillMapId(null);
    }
  }

  async function handleDelete(savedSkillMap: SavedSkillMapSummary) {
    const confirmed = window.confirm(`Delete "${savedSkillMap.title}"?`);

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
        window.localStorage.removeItem(LAST_OPENED_SKILL_MAP_ID_KEY);
      }

      setSaveMessage("Map deleted.");
    } catch {
      setErrorMessage("Map deletion failed. Please try again later.");
    } finally {
      setDeletingSkillMapId(null);
    }
  }

  async function handleResetProgress() {
    if (!savedSkillMapId || !skillMap) {
      return;
    }

    const confirmed = window.confirm("Reset progress for this map?");

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
      setSaveMessage("Progress reset.");
    } catch {
      setErrorMessage("Progress reset failed. Please try again later.");
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
      setSaveMessage(successMessage);
    } catch {
      setErrorMessage("Saved map load failed.");
    } finally {
      setLoadingSkillMapId(null);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <header className="shrink-0 rounded-lg border bg-card px-3 py-2 shadow-sm">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-semibold leading-6">SkillMap AI</h1>
              {userEmail ? (
                <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
              ) : null}
            </div>
            <form action="/auth/logout" method="post">
              <Button className="h-9" type="submit" variant="outline">
                Log out
              </Button>
            </form>
          </div>

        <form
          aria-busy={isGenerating}
            className="flex min-w-0 flex-1 flex-col gap-2 xl:max-w-xl"
          onSubmit={handleSubmit}
        >
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <label className="shrink-0 text-sm font-medium" htmlFor="topic">
                Theme
              </label>
            <input
                className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              disabled={isBusy}
              id="topic"
              name="topic"
              onChange={(event) => setTheme(event.target.value)}
              placeholder="Linux Skillmap"
              type="text"
              value={theme}
            />
              <Button className="h-9 shrink-0 gap-2" disabled={isBusy} type="submit">
              {isGenerating ? (
                <>
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                  Generating
                </>
              ) : (
                <>
                  Generate
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
          {errorMessage ? (
              <p aria-live="assertive" className="text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </form>
        </div>
      </header>

      <main className="min-h-0 min-w-0 flex-1 overflow-hidden">
        {skillMap ? (
          <section className="h-full min-h-0">
            <div className="h-full min-h-0 rounded-lg border bg-card p-2">
              <SkillMapLearningView
                mapKey={savedSkillMapId ?? generatedPrompt}
                onChangeRelatedEdges={setRelatedEdges}
                onChangeSkillMap={handleChangeSkillMap}
                relatedEdges={relatedEdges}
                savedSkillMapId={savedSkillMapId}
                skillMap={skillMap}
                toolbarActions={
                  <>
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
                      {hasSavedCurrentMap ? "Saved" : "Unsaved"}
                    </span>
                    <Button
                      className="h-9 gap-2"
                      disabled={isBusy || savedSkillMapId !== null}
                      onClick={handleSave}
                      type="button"
                    >
                      {isSaving ? (
                        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                      ) : null}
                      {isSaving ? "Saving" : savedSkillMapId ? "Saved" : "Save"}
                    </Button>
                    <Button
                      className="h-9 gap-2"
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
                      Reset progress
                    </Button>
                    <Button
                      className="h-9 gap-2"
                      disabled={isBusy || !currentSavedSkillMap}
                      onClick={() => {
                        if (currentSavedSkillMap) {
                          void handleRename(currentSavedSkillMap);
                        }
                      }}
                      type="button"
                      variant="outline"
                    >
                      {currentSavedSkillMap && renamingSkillMapId === currentSavedSkillMap.id ? (
                        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                      ) : (
                        <Pencil aria-hidden="true" className="h-4 w-4" />
                      )}
                      Rename
                    </Button>
                    <Button
                      className="h-9 gap-2"
                      disabled={isBusy || !currentSavedSkillMap}
                      onClick={() => {
                        if (currentSavedSkillMap) {
                          void handleDelete(currentSavedSkillMap);
                        }
                      }}
                      type="button"
                      variant="outline"
                    >
                      {currentSavedSkillMap && deletingSkillMapId === currentSavedSkillMap.id ? (
                        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                      )}
                      Delete
                    </Button>
                    {saveMessage ? (
                      <p aria-live="polite" className="text-sm text-muted-foreground" role="status">
                        {saveMessage}
                      </p>
                    ) : null}
                  </>
                }
              />
            </div>
          </section>
        ) : (
          <div className="flex h-full min-h-[420px] items-center justify-center rounded-lg border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground">
            Generate or select a saved map to start.
          </div>
        )}
      </main>

      <section className="max-h-24 shrink-0 overflow-hidden rounded-lg border bg-card px-3 py-2">
        {savedSkillMapsError ? (
          <p aria-live="assertive" className="mb-2 text-sm text-destructive" role="alert">
            {savedSkillMapsError}
          </p>
        ) : null}
        {savedSkillMaps.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {savedSkillMaps.map((savedSkillMap) => (
              <div
                className={`w-56 shrink-0 rounded-md border px-3 py-2 transition-colors ${
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
                    <span className="block min-w-0 truncate text-sm font-medium">
                      {savedSkillMap.title}
                    </span>
                    {loadingSkillMapId === savedSkillMap.id ? (
                      <Loader2 aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin" />
                    ) : null}
                  </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                    {savedSkillMap.nodeCount} nodes / {formatDate(savedSkillMap.createdAt)}
                  </span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed bg-muted/30 p-3">
            <p className="text-sm font-medium">No saved maps yet.</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Save a generated map to reopen it here.
            </p>
          </div>
        )}
      </section>
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getApiErrorMessage(payload: unknown) {
  if (!isApiErrorResponse(payload)) {
    return "Request failed.";
  }

  return payload.error?.message ?? "Request failed.";
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
