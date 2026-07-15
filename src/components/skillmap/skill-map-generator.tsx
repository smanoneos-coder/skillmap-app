"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";

import { SkillMapLearningView } from "@/components/skillmap/skill-map-learning-view";
import { Button } from "@/components/ui/button";
import { createStudySkillMap } from "@/lib/skillmap-progress";
import type { GenerateSkillMapResponse } from "@/lib/skillmap-schema";
import type { StudySkillMapNode } from "@/types/node";
import type { SavedSkillMapDetail, SavedSkillMapSummary } from "@/types/skillmap";

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

type LoadSkillMapResponse = {
  data: SavedSkillMapDetail;
};

type SkillMapGeneratorProps = {
  initialSavedSkillMaps: SavedSkillMapSummary[];
};

const EXAMPLES = ["Linux スキルマップ", "AWS SAA", "高校世界史", "高校数学I", "Python 初学者"];

export function SkillMapGenerator({ initialSavedSkillMaps }: SkillMapGeneratorProps) {
  const [theme, setTheme] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [skillMap, setSkillMap] = useState<StudySkillMapNode | null>(null);
  const [generatorMode, setGeneratorMode] = useState<GeneratorMode | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [savedSkillMapId, setSavedSkillMapId] = useState<string | null>(null);
  const [loadingSkillMapId, setLoadingSkillMapId] = useState<string | null>(null);
  const [savedSkillMaps, setSavedSkillMaps] =
    useState<SavedSkillMapSummary[]>(initialSavedSkillMaps);

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
          data: skillMap,
        }),
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        setErrorMessage(getApiErrorMessage(payload));
        return;
      }

      const parsedPayload = payload as SaveSkillMapResponse;

      setSavedSkillMapId(parsedPayload.data.id);
      setSavedSkillMaps((current) => [
        parsedPayload.data,
        ...current.filter((savedSkillMap) => savedSkillMap.id !== parsedPayload.data.id),
      ]);
      setSaveMessage("保存しました。");
    } catch {
      setErrorMessage("保存に失敗しました。時間をおいて再試行してください。");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLoad(savedSkillMapIdToLoad: string) {
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
      setSavedSkillMapId(parsedPayload.data.id);
      setGeneratorMode(null);
      setSaveMessage("保存済みマップを読み込みました。");
    } catch {
      setErrorMessage("保存済みマップの読み込みに失敗しました。");
    } finally {
      setLoadingSkillMapId(null);
    }
  }

  return (
    <div className="space-y-6">
      <form className="rounded-lg border bg-card p-4 shadow-sm sm:p-5" onSubmit={handleSubmit}>
        <label className="mb-2 block text-sm font-medium" htmlFor="topic">
          テーマを入力してください
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            disabled={isGenerating}
            id="topic"
            name="topic"
            onChange={(event) => setTheme(event.target.value)}
            placeholder="Linux スキルマップ"
            type="text"
            value={theme}
          />
          <Button className="h-11 gap-2" disabled={isGenerating} type="submit">
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
        {errorMessage ? <p className="mt-3 text-sm text-destructive">{errorMessage}</p> : null}
      </form>

      <aside className="rounded-lg border bg-card p-5 lg:hidden">
        <h2 className="mb-4 text-sm font-semibold">入力例</h2>
        <ExampleList onSelect={setTheme} />
      </aside>

      <section className="rounded-lg border bg-card p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">保存済みマップ</h2>
          <span className="text-xs text-muted-foreground">{savedSkillMaps.length}件</span>
        </div>
        {savedSkillMaps.length > 0 ? (
          <div className="grid gap-2">
            {savedSkillMaps.map((savedSkillMap) => (
              <button
                className={`rounded-md border px-3 py-2 text-left transition-colors hover:bg-muted ${
                  savedSkillMap.id === savedSkillMapId ? "border-primary bg-muted" : ""
                }`}
                disabled={loadingSkillMapId !== null}
                key={savedSkillMap.id}
                onClick={() => handleLoad(savedSkillMap.id)}
                type="button"
              >
                <span className="block text-sm font-medium">{savedSkillMap.title}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {savedSkillMap.nodeCount}ノード / {formatDate(savedSkillMap.createdAt)}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">保存済みのスキルマップはまだありません。</p>
        )}
      </section>

      {skillMap ? (
        <section className="space-y-4">
          <div className="rounded-lg border bg-card p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">スキルマップ</h3>
                {generatorMode === "mock" ? (
                  <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                    開発用モックデータを表示しています
                  </span>
                ) : null}
              </div>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <Button disabled={isSaving || savedSkillMapId !== null} onClick={handleSave} type="button">
                {isSaving ? "保存中" : savedSkillMapId ? "保存済み" : "保存する"}
              </Button>
              {saveMessage ? <p className="text-sm text-muted-foreground">{saveMessage}</p> : null}
            </div>
            <SkillMapLearningView
              mapKey={savedSkillMapId ?? generatedPrompt}
              onChangeSkillMap={setSkillMap}
              skillMap={skillMap}
            />
          </div>
        </section>
      ) : (
        <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground">
          生成結果はここに表示されます。
        </div>
      )}
    </div>
  );
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
