"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";

import type { SkillMapFlowNode } from "@/lib/skillmap-flow";

export function EditableSkillMapNode({ data, selected }: NodeProps<SkillMapFlowNode>) {
  return (
    <div
      className={`relative rounded-lg border bg-card p-3 text-left text-card-foreground shadow-sm ${
        selected ? "ring-2 ring-ring" : ""
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
