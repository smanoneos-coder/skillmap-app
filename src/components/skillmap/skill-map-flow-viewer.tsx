"use client";

import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import { useEffect, useMemo } from "react";

import {
  createSkillMapFlowElements,
  getFlowNodeId,
  type SkillMapFlowNode,
} from "@/lib/skillmap-flow";
import type { StudySkillMapNode } from "@/types/node";

type SkillMapFlowViewerProps = {
  activeSearchPath: string | null;
  onSelectNode: (node: StudySkillMapNode) => void;
  searchMatchPaths: Set<string>;
  skillMap: StudySkillMapNode;
};

export function SkillMapFlowViewer({
  activeSearchPath,
  onSelectNode,
  searchMatchPaths,
  skillMap,
}: SkillMapFlowViewerProps) {
  return (
    <ReactFlowProvider>
      <SkillMapFlowCanvas
        activeSearchPath={activeSearchPath}
        onSelectNode={onSelectNode}
        searchMatchPaths={searchMatchPaths}
        skillMap={skillMap}
      />
    </ReactFlowProvider>
  );
}

function SkillMapFlowCanvas({
  activeSearchPath,
  onSelectNode,
  searchMatchPaths,
  skillMap,
}: SkillMapFlowViewerProps) {
  const { fitView } = useReactFlow();
  const { nodes, edges } = useMemo(
    () =>
      createSkillMapFlowElements(skillMap, {
        activeSearchPath,
        searchMatchPaths,
      }),
    [activeSearchPath, searchMatchPaths, skillMap],
  );

  useEffect(() => {
    if (!activeSearchPath) {
      return;
    }

    window.requestAnimationFrame(() => {
      fitView({
        duration: 450,
        maxZoom: 1.2,
        nodes: [{ id: getFlowNodeId(activeSearchPath) }],
        padding: 0.4,
      });
    });
  }, [activeSearchPath, fitView]);

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
