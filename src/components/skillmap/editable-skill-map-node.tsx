"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { memo } from "react";

import type { SkillMapFlowNode } from "@/lib/skillmap-flow";

function EditableSkillMapNodeComponent({ data, selected }: NodeProps<SkillMapFlowNode>) {
  const relationshipClassName = getRelationshipClassName(data.relationshipHighlight);

  return (
    <div
      className={`relative rounded-lg border bg-card p-3 text-left text-card-foreground shadow-sm transition-shadow ${relationshipClassName} ${
        selected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
      }`}
    >
      <ConnectionHandles editMode={data.editMode} prefix="target" />
      <ConnectionHandles editMode={data.editMode} prefix="source" />
      <div className="break-words text-sm font-semibold leading-5">{data.label}</div>
      <div className="mt-1 line-clamp-2 break-words text-xs leading-5 text-muted-foreground">
        {data.description}
      </div>
      {data.tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {data.tags.slice(0, 3).map((tag) => (
            <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px]" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export const EditableSkillMapNode = memo(EditableSkillMapNodeComponent, areNodePropsEqual);

function areNodePropsEqual(
  previousProps: NodeProps<SkillMapFlowNode>,
  nextProps: NodeProps<SkillMapFlowNode>,
) {
  return (
    previousProps.selected === nextProps.selected &&
    previousProps.data.label === nextProps.data.label &&
    previousProps.data.description === nextProps.data.description &&
    previousProps.data.depth === nextProps.data.depth &&
    previousProps.data.editMode === nextProps.data.editMode &&
    previousProps.data.isActiveSearchMatch === nextProps.data.isActiveSearchMatch &&
    previousProps.data.isSearchMatch === nextProps.data.isSearchMatch &&
    previousProps.data.path === nextProps.data.path &&
    previousProps.data.relationshipHighlight === nextProps.data.relationshipHighlight &&
    previousProps.data.tags.length === nextProps.data.tags.length &&
    previousProps.data.tags.every((tag, index) => tag === nextProps.data.tags[index])
  );
}

function getRelationshipClassName(relationshipHighlight: SkillMapFlowNode["data"]["relationshipHighlight"]) {
  if (relationshipHighlight === "parent") {
    return "border-red-500 ring-2 ring-red-500/70 ring-offset-2 ring-offset-background";
  }

  if (relationshipHighlight === "child") {
    return "border-emerald-500 ring-2 ring-emerald-500/70 ring-offset-2 ring-offset-background";
  }

  return "";
}

function ConnectionHandles({
  editMode,
  prefix,
}: {
  editMode: boolean;
  prefix: "source" | "target";
}) {
  const type = prefix === "source" ? "source" : "target";
  const className = editMode
    ? "h-2.5 w-2.5 border border-background bg-primary"
    : "h-2.5 w-2.5 border-0 bg-transparent opacity-0";

  return (
    <>
      <Handle className={className} id={`${prefix}-left`} position={Position.Left} type={type} />
      <Handle className={className} id={`${prefix}-right`} position={Position.Right} type={type} />
      <Handle className={className} id={`${prefix}-top`} position={Position.Top} type={type} />
      <Handle className={className} id={`${prefix}-bottom`} position={Position.Bottom} type={type} />
    </>
  );
}
