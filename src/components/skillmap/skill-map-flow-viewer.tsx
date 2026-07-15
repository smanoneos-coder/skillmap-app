"use client";

import { Background, Controls, MiniMap, ReactFlow } from "@xyflow/react";
import { useMemo } from "react";

import { createSkillMapFlowElements } from "@/lib/skillmap-flow";
import type { GeneratedSkillMap } from "@/lib/skillmap-schema";

type SkillMapFlowViewerProps = {
  skillMap: GeneratedSkillMap;
};

export function SkillMapFlowViewer({ skillMap }: SkillMapFlowViewerProps) {
  const { nodes, edges } = useMemo(() => createSkillMapFlowElements(skillMap), [skillMap]);

  return (
    <div className="h-[560px] min-h-[420px] overflow-hidden rounded-lg border bg-background">
      <ReactFlow
        colorMode="system"
        edges={edges}
        fitView
        fitViewOptions={{
          padding: 0.2,
        }}
        maxZoom={1.6}
        minZoom={0.25}
        nodes={nodes}
        nodesDraggable={false}
        nodesConnectable={false}
        panOnDrag
        proOptions={{
          hideAttribution: true,
        }}
        zoomOnDoubleClick
        zoomOnPinch
        zoomOnScroll
      >
        <Background color="hsl(var(--border))" gap={18} />
        <Controls position="bottom-right" showInteractive={false} />
        <MiniMap
          nodeColor="hsl(var(--primary))"
          nodeStrokeColor="hsl(var(--border))"
          pannable
          position="bottom-left"
          zoomable
        />
      </ReactFlow>
    </div>
  );
}
