import type { HitTargets, Node, Relationship } from "@neo4j-nvl/base";
import { InteractiveNvlWrapper } from "@neo4j-nvl/react";
import type { MouseEventCallbacks } from "@neo4j-nvl/react";
import React, { FC } from "react";
import { useNodesWithRelations } from "@api/apollo.ts";
import { useGraphView } from "@context/GraphViewContext";
import "./GraphView.css"; // For the slide animations

// Component for displaying node content
interface NodeContentProps {
  node: Node;
}

const NodeContent: FC<NodeContentProps> = ({ node }) => {
  return (
    <div className="space-y-4">
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

      {/* Node properties */}
      {node.properties && Object.keys(node.properties).length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500">Properties</h3>
          <div className="mt-1 text-sm text-gray-900">
            {Object.entries(node.properties).map(([key, value]) => (
              <div key={key} className="mb-2">
                <span className="font-medium">{key}: </span>
                <span>{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Component for displaying relationship content
interface RelationshipContentProps {
  relationship: Relationship;
}

const RelationshipContent: FC<RelationshipContentProps> = ({
  relationship,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-500">ID</h3>
        <p className="mt-1 text-sm text-gray-900">{relationship.id}</p>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-500">Type</h3>
        <p className="mt-1 text-sm text-gray-900">{relationship.caption}</p>
      </div>

      {relationship.description && (
        <div>
          <h3 className="text-sm font-medium text-gray-500">Description</h3>
          <p className="mt-1 text-sm text-gray-900">
            {relationship.description}
          </p>
        </div>
      )}

      <div>
        <h3 className="text-sm font-medium text-gray-500">Source</h3>
        <p className="mt-1 text-sm text-gray-900">{relationship.from}</p>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-500">Target</h3>
        <p className="mt-1 text-sm text-gray-900">{relationship.to}</p>
      </div>

      {/* Relationship properties */}
      {relationship.properties &&
        Object.keys(relationship.properties).length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-500">Properties</h3>
            <div className="mt-1 text-sm text-gray-900">
              {Object.entries(relationship.properties).map(([key, value]) => (
                <div key={key} className="mb-2">
                  <span className="font-medium">{key}: </span>
                  <span>{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  );
};

// Unified sidebar that uses the appropriate content component
interface ElementSidebarProps {
  element: Node | Relationship;
  elementType: "node" | "relationship";
  onClose: () => void;
  isExiting: boolean;
}

const ElementSidebar: FC<ElementSidebarProps> = ({
  element,
  elementType,
  onClose,
  isExiting,
}) => {
  if (!element) return null;

  // Determine title based on element type
  const title =
    elementType === "node" ? "Node Details" : "Relationship Details";

  return (
    <div
      className={`h-full w-64 border-l element-sidebar overflow-y-auto border-gray-400 ${
        isExiting ? "animate-slide-out" : "animate-slide-in"
      }`}
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
        <h2 className="text-lg font-medium">{title}</h2>
      </div>

      <div className="p-4">
        {elementType === "node" ? (
          <NodeContent node={element as Node} />
        ) : (
          <RelationshipContent relationship={element as Relationship} />
        )}
      </div>
    </div>
  );
};

interface GraphViewProps {
  nodes: string[];
}

function GraphView({ nodes }: GraphViewProps) {
  const { loading, error, data } = useNodesWithRelations(nodes);

  // Get access to the GraphView context
  const {
    selectedElement,
    selectedElementType,
    isExitingSidebar,
    selectElement,
    closeSidebar,
  } = useGraphView();

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
      selectElement(node, "node");
    },
    onNodeRightClick: (node: Node, hitTargets: HitTargets, evt: MouseEvent) =>
      console.log("onNodeRightClick", node, hitTargets, evt),
    onNodeDoubleClick: (node: Node, hitTargets: HitTargets, evt: MouseEvent) =>
      console.log("onNodeDoubleClick", node, hitTargets, evt),
    onRelationshipClick: (
      rel: Relationship,
      hitTargets: HitTargets,
      evt: MouseEvent,
    ) => {
      selectElement(rel, "relationship");
    },
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

  console.log(data);

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

      {/* Show unified sidebar with specialized content based on element type */}
      {selectedElement && selectedElementType && (
        <div className="absolute top-0 right-0 h-full">
          <ElementSidebar
            element={selectedElement}
            elementType={selectedElementType}
            onClose={closeSidebar}
            isExiting={isExitingSidebar}
          />
        </div>
      )}
    </div>
  );
}

export default GraphView;
