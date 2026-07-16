"use client";

import { X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

import { Button } from "@/components/ui/button";
import { PROGRESS_STATUSES, PROGRESS_STATUS_LABELS, PROGRESS_STATUS_STYLES } from "@/constants/status";
import type { StudySkillMapNode } from "@/types/node";
import type { ProgressStatus } from "@/types/progress";

type NodeDetailsInput = {
  title: string;
  description: string;
  tags: string[];
};

type SkillMapDetailDrawerProps = {
  isAddingChild: boolean;
  isDeletingNode: boolean;
  isEditingNode: boolean;
  isUpdatingProgress: boolean;
  nodeEditError: string | null;
  node: StudySkillMapNode | null;
  onAddChildNode: (title: string) => void;
  onClose: () => void;
  onDeleteNode: () => void;
  onUpdateNodeDetails: (input: NodeDetailsInput) => void;
  onUpdateProgress: (nodeId: string, status: ProgressStatus) => void;
};

export function SkillMapDetailDrawer({
  isAddingChild,
  isDeletingNode,
  isEditingNode,
  isUpdatingProgress,
  nodeEditError,
  node,
  onAddChildNode,
  onClose,
  onDeleteNode,
  onUpdateNodeDetails,
  onUpdateProgress,
}: SkillMapDetailDrawerProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [childTitle, setChildTitle] = useState("");

  useEffect(() => {
    setTitle(node?.title ?? "");
    setDescription(node?.description ?? "");
    setTagsText(node?.tags.join(", ") ?? "");
    setChildTitle("");
  }, [node]);

  if (!node) {
    return null;
  }

  const nodeId = node.nodeId;
  const tags = parseTagsText(tagsText);
  const isBusy = isAddingChild || isDeletingNode || isEditingNode || isUpdatingProgress;
  const hasNodeChanges =
    title.trim() !== node.title ||
    description.trim() !== node.description ||
    tags.join("\n") !== node.tags.join("\n");

  function handleNodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onUpdateNodeDetails({
      title,
      description,
      tags,
    });
  }

  function handleChildSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onAddChildNode(childTitle);
    setChildTitle("");
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="詳細を閉じる"
        className="absolute inset-0 bg-background/70"
        onClick={onClose}
        type="button"
      />
      <aside
        aria-label="ノード詳細"
        className="absolute bottom-0 right-0 flex max-h-[88vh] w-full flex-col rounded-t-lg border bg-card shadow-xl sm:top-0 sm:h-full sm:max-h-none sm:w-[420px] sm:rounded-none"
      >
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
            <h3 className="mb-3 text-sm font-semibold">ノード編集</h3>
            <form className="space-y-3" onSubmit={handleNodeSubmit}>
              <label className="block text-xs font-medium text-muted-foreground" htmlFor="node-title">
                ノード名
              </label>
              <input
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                disabled={isBusy}
                id="node-title"
                maxLength={50}
                onChange={(event) => setTitle(event.target.value)}
                value={title}
              />

              <label className="block text-xs font-medium text-muted-foreground" htmlFor="node-description">
                説明
              </label>
              <textarea
                className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                disabled={isBusy}
                id="node-description"
                maxLength={500}
                onChange={(event) => setDescription(event.target.value)}
                value={description}
              />

              <label className="block text-xs font-medium text-muted-foreground" htmlFor="node-tags">
                タグ（カンマ区切り、最大5件）
              </label>
              <input
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                disabled={isBusy}
                id="node-tags"
                onChange={(event) => setTagsText(event.target.value)}
                placeholder="Linux, CLI"
                value={tagsText}
              />

              <Button disabled={isBusy || !hasNodeChanges} type="submit">
                {isEditingNode ? "保存中" : "保存"}
              </Button>
            </form>

            <form className="mt-5 space-y-2 border-t pt-4" onSubmit={handleChildSubmit}>
              <label className="text-xs font-medium text-muted-foreground" htmlFor="child-node-title">
                子ノードを追加
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={isBusy}
                  id="child-node-title"
                  maxLength={50}
                  onChange={(event) => setChildTitle(event.target.value)}
                  placeholder="例: 基本コマンド"
                  value={childTitle}
                />
                <Button className="shrink-0" disabled={isBusy || !childTitle.trim()} type="submit">
                  {isAddingChild ? "追加中" : "追加"}
                </Button>
              </div>
            </form>

            <div className="mt-5 border-t pt-4">
              <Button
                disabled={isBusy || !node.nodeId}
                onClick={onDeleteNode}
                type="button"
                variant="outline"
              >
                {isDeletingNode ? "削除中" : "このノードを削除"}
              </Button>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                削除時に「配下ごと削除」または「選択ノードのみ削除」を選べます。
              </p>
            </div>

            {nodeEditError ? (
              <p aria-live="assertive" className="mt-3 text-sm text-destructive" role="alert">
                {nodeEditError}
              </p>
            ) : null}
          </section>

          <section className="mb-5 rounded-lg border bg-background p-3">
            <h3 className="mb-3 text-sm font-semibold">学習状態</h3>
            {nodeId ? (
              <div className="grid grid-cols-3 gap-2">
                {PROGRESS_STATUSES.map((status) => (
                  <button
                    aria-pressed={node.progressStatus === status}
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

          {isUpdatingProgress ? (
            <p aria-live="polite" className="mb-4 text-xs text-muted-foreground" role="status">
              学習状態を保存しています。
            </p>
          ) : null}
          <div className="break-words text-sm leading-7 text-foreground [&_a]:text-primary [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3 [&_strong]:font-semibold">
            <ReactMarkdown>{node.description}</ReactMarkdown>
          </div>
        </div>
      </aside>
    </div>
  );
}

function parseTagsText(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map((tag) => tag.slice(0, 30)),
    ),
  ).slice(0, 5);
}
