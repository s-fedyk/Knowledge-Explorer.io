import type { HitTargets, Node, Relationship } from "@neo4j-nvl/base";
import { InteractiveNvlWrapper } from "@neo4j-nvl/react";
import type { MouseEventCallbacks } from "@neo4j-nvl/react";
import React from "react";
import { useNodesWithRelations } from "@api/apollo.ts";
import { useGraphView } from "@context/GraphViewContext";
import "./GraphView.css"; // For the slide animations

// NodeSidebar component to display node information
const NodeSidebar = ({ node, onClose, isExiting }) => {
  if (!node) return null;

  return (
    <div
      className={`h-full w-64 border-l node-sidebar overflow-y-auto border-gray-400 ${isExiting ? "animate-slide-out" : "animate-slide-in"}`}
    >
      <div className="flex justify-between items-center mb-4">
        <button onClick={onClose} className="text-gray-500 hover:text-gray-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M13 17l5-5-5-5M6 17l5-5-5-5" />
          </svg>
        </button>
        <h2 className="text-lg font-medium">Node Details</h2>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500">ID</h3>
          <p className="mt-1 text-sm text-gray-900">{node.id}</p>
        </div>

        {node.caption && (
          <div>
            <h3 className="text-sm font-medium text-gray-500">Caption</h3>
            <p className="mt-1 text-sm text-gray-900">{node.caption}</p>
          </div>
        )}

        {node.description && (
          <div>
            <h3 className="text-sm font-medium text-gray-500">Description</h3>
            <div className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
              {node.description}
            </div>
          </div>
        )}

        {/* You can add more node properties here as needed */}
      </div>
    </div>
  );
};

function GraphView({ nodes }) {
  const { loading, error, data } = useNodesWithRelations(nodes);
  // Get access to the GraphView context
  const { selectedNode, isExitingSidebar, selectNode, closeSidebar } =
    useGraphView();

  const mouseEventCallbacks: MouseEventCallbacks = {
    onHover: (
      element: Node | Relationship,
      hitTargets: HitTargets,
      evt: MouseEvent,
    ) => console.log("onHover", element, hitTargets, evt),
    onRelationshipRightClick: (
      rel: Relationship,
      hitTargets: HitTargets,
      evt: MouseEvent,
    ) => console.log("onRelationshipRightClick", rel, hitTargets, evt),
    onNodeClick: (node: Node, hitTargets: HitTargets, evt: MouseEvent) => {
      selectNode(node);
    },
    onNodeRightClick: (node: Node, hitTargets: HitTargets, evt: MouseEvent) =>
      console.log("onNodeRightClick", node, hitTargets, evt),
    onNodeDoubleClick: (node: Node, hitTargets: HitTargets, evt: MouseEvent) =>
      console.log("onNodeDoubleClick", node, hitTargets, evt),
    onRelationshipClick: (
      rel: Relationship,
      hitTargets: HitTargets,
      evt: MouseEvent,
    ) => console.log("onRelationshipClick", rel, hitTargets, evt),
    onRelationshipDoubleClick: (
      rel: Relationship,
      hitTargets: HitTargets,
      evt: MouseEvent,
    ) => console.log("onRelationshipDoubleClick", rel, hitTargets, evt),
    onCanvasClick: (evt: MouseEvent) => {
      closeSidebar();
    },
    onCanvasDoubleClick: (evt: MouseEvent) =>
      console.log("onCanvasDoubleClick", evt),
    onCanvasRightClick: (evt: MouseEvent) =>
      console.log("onCanvasRightClick", evt),
    onDrag: (nodes: Node[]) => console.log("onDrag", nodes),
    onPan: (evt: MouseEvent) => console.log("onPan", evt),
    onZoom: (zoomLevel: number) => console.log("onZoom", zoomLevel),
  };

  if (loading) return <div>Loading graph data...</div>;
  if (error) return <div>Error loading graph: {error.message}</div>;

  return (
    <div className="relative h-full w-full">
      <div className="h-full w-full">
        <InteractiveNvlWrapper
          nodes={data ? data.nodes : []}
          rels={data ? data.rels : []}
          mouseEventCallbacks={mouseEventCallbacks}
          className="bg-gray-100 h-full"
        />
      </div>

      {(selectedNode || isExitingSidebar) && (
        <div className="absolute top-0 right-0 h-full">
          <NodeSidebar
            node={selectedNode}
            onClose={closeSidebar}
            isExiting={isExitingSidebar}
          />
        </div>
      )}
    </div>
  );
}

export default GraphView;
