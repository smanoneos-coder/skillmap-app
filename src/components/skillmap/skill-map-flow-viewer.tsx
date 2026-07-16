"use client";

import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Connection,
  type NodeChange,
  useReactFlow,
} from "@xyflow/react";
import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";

import { EditableSkillMapNode } from "@/components/skillmap/editable-skill-map-node";
import {
  createSkillMapFlowElements,
  getFlowNodeId,
  type SkillMapFlowEdge,
  type SkillMapFlowNode,
} from "@/lib/skillmap-flow";
import type { StudySkillMapNode } from "@/types/node";
import type { StudySkillMapEdge } from "@/types/skillmap";

type SkillMapFlowViewerProps = {
  activeSearchPath: string | null;
  editMode: boolean;
  onConnectRelatedEdge: (firstNodeId: string, secondNodeId: string) => void;
  onNodePositionsChange: (changes: NodeChange<SkillMapFlowNode>[]) => void;
  onSelectNode: (node: StudySkillMapNode, path: string) => void;
  onSelectRelatedEdge: (edgeId: string | null) => void;
  relatedEdges: StudySkillMapEdge[];
  searchMatchPaths: Set<string>;
  selectedRelatedEdgeId: string | null;
  skillMap: StudySkillMapNode;
};

const nodeTypes = {
  skillMap: EditableSkillMapNode,
};

export function SkillMapFlowViewer({
  activeSearchPath,
  editMode,
  onConnectRelatedEdge,
  onNodePositionsChange,
  onSelectNode,
  onSelectRelatedEdge,
  relatedEdges,
  searchMatchPaths,
  selectedRelatedEdgeId,
  skillMap,
}: SkillMapFlowViewerProps) {
  return (
    <ReactFlowProvider>
      <SkillMapFlowCanvas
        activeSearchPath={activeSearchPath}
        editMode={editMode}
        onConnectRelatedEdge={onConnectRelatedEdge}
        onNodePositionsChange={onNodePositionsChange}
        onSelectNode={onSelectNode}
        onSelectRelatedEdge={onSelectRelatedEdge}
        relatedEdges={relatedEdges}
        searchMatchPaths={searchMatchPaths}
        selectedRelatedEdgeId={selectedRelatedEdgeId}
        skillMap={skillMap}
      />
    </ReactFlowProvider>
  );
}

function SkillMapFlowCanvas({
  activeSearchPath,
  editMode,
  onConnectRelatedEdge,
  onNodePositionsChange,
  onSelectNode,
  onSelectRelatedEdge,
  relatedEdges,
  searchMatchPaths,
  selectedRelatedEdgeId,
  skillMap,
}: SkillMapFlowViewerProps) {
  const { fitView } = useReactFlow();
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const { nodes: flowNodes, edges } = useMemo(
    () =>
      createSkillMapFlowElements(skillMap, {
        activeSearchPath,
        editMode,
        relatedEdges,
        searchMatchPaths,
        selectedRelatedEdgeId,
      }),
    [activeSearchPath, editMode, relatedEdges, searchMatchPaths, selectedRelatedEdgeId, skillMap],
  );
  const nodes = useMemo(
    () =>
      flowNodes.map((node) => ({
        ...node,
        selected: editMode && selectedNodeIds.has(node.id),
      })),
    [editMode, flowNodes, selectedNodeIds],
  );

  useEffect(() => {
    if (!editMode) {
      setSelectedNodeIds(new Set());
      onSelectRelatedEdge(null);
    }
  }, [editMode, onSelectRelatedEdge]);

  function handleNodesChange(changes: NodeChange<SkillMapFlowNode>[]) {
    const selectionChanges = changes.filter((change) => change.type === "select");

    if (selectionChanges.length > 0) {
      setSelectedNodeIds((currentSelectedNodeIds) => {
        const nextSelectedNodeIds = new Set(currentSelectedNodeIds);

        for (const change of selectionChanges) {
          if (change.selected) {
            nextSelectedNodeIds.add(change.id);
          } else {
            nextSelectedNodeIds.delete(change.id);
          }
        }

        return nextSelectedNodeIds;
      });
    }

    onNodePositionsChange(changes);
  }

  function handleConnect(connection: Connection) {
    if (!connection.source || !connection.target || connection.source === connection.target) {
      return;
    }

    const sourceNode = flowNodes.find((node) => node.id === connection.source);
    const targetNode = flowNodes.find((node) => node.id === connection.target);
    const sourceNodeId = sourceNode?.data.skillMapNode.nodeId;
    const targetNodeId = targetNode?.data.skillMapNode.nodeId;

    if (!sourceNodeId || !targetNodeId) {
      return;
    }

    onConnectRelatedEdge(sourceNodeId, targetNodeId);
  }

  function handleEdgeClick(event: ReactMouseEvent, edge: SkillMapFlowEdge) {
    event.stopPropagation();

    if (edge.data?.kind !== "related" || !edge.data.relatedEdgeId) {
      onSelectRelatedEdge(null);
      return;
    }

    onSelectRelatedEdge(edge.data.relatedEdgeId);
  }

  function handleNodeClick(event: ReactMouseEvent, node: SkillMapFlowNode) {
    if (editMode && (event.ctrlKey || event.metaKey || event.shiftKey)) {
      return;
    }

    onSelectRelatedEdge(null);
    onSelectNode(node.data.skillMapNode, node.data.path);
  }

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
    <div className="h-[460px] min-h-[360px] overflow-hidden rounded-lg border bg-background sm:h-[560px]">
      <ReactFlow
        colorMode="system"
        deleteKeyCode={null}
        edges={edges}
        fitView
        fitViewOptions={{
          padding: 0.2,
        }}
        maxZoom={1.6}
        minZoom={0.25}
        nodes={nodes}
        nodesConnectable={editMode}
        nodesDraggable={editMode}
        nodeTypes={nodeTypes}
        onConnect={editMode ? handleConnect : undefined}
        onEdgeClick={editMode ? handleEdgeClick : undefined}
        onNodesChange={editMode ? handleNodesChange : undefined}
        onNodeClick={handleNodeClick}
        multiSelectionKeyCode={["Meta", "Control", "Shift"]}
        panOnDrag
        panOnScroll={false}
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
