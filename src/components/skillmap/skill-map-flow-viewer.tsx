"use client";

import { Background, Controls, MiniMap, ReactFlow } from "@xyflow/react";
import { useMemo } from "react";

import { createSkillMapFlowElements, type SkillMapFlowNode } from "@/lib/skillmap-flow";
import type { StudySkillMapNode } from "@/types/node";

type SkillMapFlowViewerProps = {
  onSelectNode: (node: StudySkillMapNode) => void;
  skillMap: StudySkillMapNode;
};

export function SkillMapFlowViewer({ onSelectNode, skillMap }: SkillMapFlowViewerProps) {
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
        onNodeClick={(_, node: SkillMapFlowNode) => onSelectNode(node.data.skillMapNode)}
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
