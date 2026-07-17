"use client";

import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  type Connection,
  type NodeChange,
  type Viewport,
  useReactFlow,
  useViewport,
} from "@xyflow/react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";

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

const FLOW_NODE_WIDTH = 220;
const FLOW_NODE_HEIGHT = 92;
const MINI_MAP_WIDTH = 200;
const MINI_MAP_HEIGHT = 150;
const MINI_MAP_PADDING = 12;

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
  const viewport = useViewport();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
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

  useEffect(() => {
    const element = containerRef.current;

    if (!element) {
      return;
    }

    const updateSize = () => {
      setContainerSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    };
    const resizeObserver = new ResizeObserver(updateSize);

    updateSize();
    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

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
    <div
      className="relative h-[460px] min-h-[360px] overflow-hidden rounded-lg border bg-background sm:h-[560px]"
      ref={containerRef}
    >
      <button
        aria-pressed={showMiniMap}
        className="absolute left-3 top-3 z-10 rounded-md border bg-background/95 px-3 py-1.5 text-xs font-medium shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setShowMiniMap((currentValue) => !currentValue)}
        type="button"
      >
        {showMiniMap ? "ミニマップ非表示" : "ミニマップ表示"}
      </button>
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
      </ReactFlow>
      {showMiniMap ? (
        <SkillMapMiniMap
          containerHeight={containerSize.height}
          containerWidth={containerSize.width}
          edges={edges}
          nodes={nodes}
          viewport={viewport}
        />
      ) : null}
    </div>
  );
}

function SkillMapMiniMap({
  containerHeight,
  containerWidth,
  edges,
  nodes,
  viewport,
}: {
  containerHeight: number;
  containerWidth: number;
  edges: SkillMapFlowEdge[];
  nodes: SkillMapFlowNode[];
  viewport: Viewport;
}) {
  const geometry = useMemo(
    () => createMiniMapGeometry(nodes, edges, viewport, containerWidth, containerHeight),
    [containerHeight, containerWidth, edges, nodes, viewport],
  );

  return (
    <div className="absolute bottom-4 left-4 z-10 overflow-hidden rounded-lg border border-border bg-card p-2 shadow-lg">
      <svg
        aria-label="ミニマップ"
        className="block"
        height={MINI_MAP_HEIGHT}
        role="img"
        viewBox={`0 0 ${MINI_MAP_WIDTH} ${MINI_MAP_HEIGHT}`}
        width={MINI_MAP_WIDTH}
      >
        <rect fill="#ffffff" height={MINI_MAP_HEIGHT} rx="8" width={MINI_MAP_WIDTH} x="0" y="0" />
        {geometry.edges.map((edge) => (
          <line
            key={edge.id}
            stroke={edge.kind === "related" ? "#94a3b8" : "#64748b"}
            strokeDasharray={edge.kind === "related" ? "3 2" : undefined}
            strokeLinecap="round"
            strokeWidth={edge.kind === "related" ? 1 : 1.5}
            x1={edge.x1}
            x2={edge.x2}
            y1={edge.y1}
            y2={edge.y2}
          />
        ))}
        {geometry.nodes.map((node) => (
          <rect
            fill="#2563eb"
            height={node.height}
            key={node.id}
            opacity={node.selected ? 1 : 0.9}
            rx="3"
            stroke={node.selected ? "#ef4444" : "#1e40af"}
            strokeWidth={node.selected ? 2 : 1}
            width={node.width}
            x={node.x}
            y={node.y}
          />
        ))}
        <rect
          fill="none"
          height={geometry.viewport.height}
          rx="2"
          stroke="#ef4444"
          strokeWidth="2"
          width={geometry.viewport.width}
          x={geometry.viewport.x}
          y={geometry.viewport.y}
        />
      </svg>
    </div>
  );
}

function createMiniMapGeometry(
  nodes: SkillMapFlowNode[],
  edges: SkillMapFlowEdge[],
  viewport: Viewport,
  containerWidth: number,
  containerHeight: number,
) {
  const nodeRects = nodes.map((node) => ({
    id: node.id,
    selected: Boolean(node.selected),
    x: node.position.x,
    y: node.position.y,
    width: FLOW_NODE_WIDTH,
    height: FLOW_NODE_HEIGHT,
  }));
  const nodeRectsById = new Map(nodeRects.map((node) => [node.id, node]));
  const visibleRect = {
    x: viewport.zoom === 0 ? 0 : -viewport.x / viewport.zoom,
    y: viewport.zoom === 0 ? 0 : -viewport.y / viewport.zoom,
    width: viewport.zoom === 0 ? containerWidth : containerWidth / viewport.zoom,
    height: viewport.zoom === 0 ? containerHeight : containerHeight / viewport.zoom,
  };
  const allRects = nodeRects.length > 0 ? [...nodeRects, visibleRect] : [visibleRect];
  const minX = Math.min(...allRects.map((rect) => rect.x));
  const minY = Math.min(...allRects.map((rect) => rect.y));
  const maxX = Math.max(...allRects.map((rect) => rect.x + rect.width));
  const maxY = Math.max(...allRects.map((rect) => rect.y + rect.height));
  const boundsWidth = Math.max(1, maxX - minX);
  const boundsHeight = Math.max(1, maxY - minY);
  const scale = Math.min(
    (MINI_MAP_WIDTH - MINI_MAP_PADDING * 2) / boundsWidth,
    (MINI_MAP_HEIGHT - MINI_MAP_PADDING * 2) / boundsHeight,
  );
  const offsetX = (MINI_MAP_WIDTH - boundsWidth * scale) / 2;
  const offsetY = (MINI_MAP_HEIGHT - boundsHeight * scale) / 2;
  const mapRect = (rect: { x: number; y: number; width: number; height: number }) => ({
    x: offsetX + (rect.x - minX) * scale,
    y: offsetY + (rect.y - minY) * scale,
    width: Math.max(2, rect.width * scale),
    height: Math.max(2, rect.height * scale),
  });

  return {
    edges: edges
      .map((edge) => {
        const sourceNode = nodeRectsById.get(edge.source);
        const targetNode = nodeRectsById.get(edge.target);

        if (!sourceNode || !targetNode) {
          return null;
        }

        const sourceRect = mapRect(sourceNode);
        const targetRect = mapRect(targetNode);

        return {
          id: edge.id,
          kind: edge.data?.kind ?? "hierarchy",
          x1: sourceRect.x + sourceRect.width / 2,
          y1: sourceRect.y + sourceRect.height / 2,
          x2: targetRect.x + targetRect.width / 2,
          y2: targetRect.y + targetRect.height / 2,
        };
      })
      .filter(isMiniMapEdge),
    nodes: nodeRects.map((node) => ({
      ...mapRect(node),
      id: node.id,
      selected: node.selected,
    })),
    viewport: mapRect(visibleRect),
  };
}

type MiniMapEdge = {
  id: string;
  kind: "hierarchy" | "related";
  x1: number;
  x2: number;
  y1: number;
  y2: number;
};

function isMiniMapEdge(edge: MiniMapEdge | null): edge is MiniMapEdge {
  return edge !== null;
}
