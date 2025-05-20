import type { HitTargets, Node, Relationship } from "@neo4j-nvl/base";
import { InteractiveNvlWrapper } from "@neo4j-nvl/react";
import type { MouseEventCallbacks } from "@neo4j-nvl/react";
import React, { FC, useState, useEffect, useMemo } from "react";
import { useNodesWithRelations } from "@api/apollo.ts";
import { useGraphView } from "@context/GraphViewContext";
import GraphSidebar from "./GraphSidebar";
import "./GraphView.css"; // For the slide animations

/**
 * Assigns vibrant colors to nodes based on their labels
 * @param {Array} nodes - The array of nodes to process
 * @returns {Array} The same nodes with colors assigned
 */
function assignColors(nodes) {
  // Vibrant colors that will "pop" against a gray-white background
  const glowColors = [
    "#FF006E", // Hot Pink
    "#3A86FF", // Bright Blue
    "#8338EC", // Vibrant Purple
    "#FB5607", // Vermilion
    "#06D6A0", // Mint
    "#FFBE0B", // Amber
    "#00BBF9", // Cyan
    "#9B5DE5", // Amethyst
    "#F15BB5", // Magenta
    "#00F5D4", // Aquamarine
    "#7209B7", // Deep Purple
  ];

  // Collect all unique labels
  const uniqueLabels = new Set();
  nodes.forEach((node) => {
    if (node.labels && node.labels.length > 0) {
      node.labels.forEach((label) => uniqueLabels.add(label));
    }
  });

  // Map labels to colors
  const labelColorMap = {};
  Array.from(uniqueLabels).forEach((label, index) => {
    labelColorMap[label] = glowColors[index % glowColors.length];
  });

  // Assign colors to nodes
  return nodes.map((node) => {
    // Default color for nodes without labels
    if (!node.labels || node.labels.length === 0) {
      return {
        ...node,
        color: "#A0AEC0", // Neutral gray
        size: 25,
        stroke: "#FFFFFF",
        strokeWidth: 3,
      };
    }

    // For nodes with one label, use that label's color
    if (node.labels.length === 1) {
      return {
        ...node,
        color: labelColorMap[node.labels[0]],
        size: 25,
        stroke: "#FFFFFF",
        strokeWidth: 3,
      };
    }

    // For nodes with multiple labels, use the first one's color
    return {
      ...node,
      color: labelColorMap[node.labels[0]],
      size: 25,
      stroke: "#FFFFFF",
      strokeWidth: 3,
    };
  });
}

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

  const [colorAssignments, setColorAssignments] = useState(null);
  useEffect(() => {
    if (data && data.nodes) {
      const assignments = assignColors(data.nodes);
      assignColors(assignments);
    }
  }, [data]);

  // Apply colors to nodes before rendering
  const nodesWithColors = useMemo(() => {
    if (data && data.nodes) {
      return assignColors(data.nodes);
    }
    return [];
  }, [data]);

  const mouseEventCallbacks: MouseEventCallbacks = {
    onHover: (
      element: Node | Relationship,
      hitTargets: HitTargets,
      evt: MouseEvent,
    ) => {},
    onRelationshipRightClick: (
      rel: Relationship,
      hitTargets: HitTargets,
      evt: MouseEvent,
    ) => {},
    onNodeClick: (node: Node, hitTargets: HitTargets, evt: MouseEvent) => {
      selectElement(node, "node");
    },
    onNodeRightClick: (
      node: Node,
      hitTargets: HitTargets,
      evt: MouseEvent,
    ) => {},
    onNodeDoubleClick: (
      node: Node,
      hitTargets: HitTargets,
      evt: MouseEvent,
    ) => {},
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
    ) => {},
    onCanvasClick: (evt: MouseEvent) => {
      closeSidebar();
    },
    onCanvasDoubleClick: (evt: MouseEvent) => {},
    onCanvasRightClick: (evt: MouseEvent) => {},
    onDrag: (nodes: Node[]) => {},
    onPan: (evt: MouseEvent) => {},
    onZoom: (zoomLevel: number) => {},
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-full bg-gray-50">
        <div className="flex items-center space-x-2 text-gray-600">
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span>Loading graph data...</span>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="p-4 bg-gray-50 text-gray-800">
        Error loading graph: {error.message}
      </div>
    );

  return (
    <div className="relative h-full w-full">
      <div className="h-full w-full">
        <InteractiveNvlWrapper
          nodes={nodesWithColors}
          rels={data ? data.rels : []}
          mouseEventCallbacks={mouseEventCallbacks}
          className="bg-gray-100 h-full filter drop-shadow-lg"
        />
      </div>

      {/* Show unified sidebar with specialized content based on element type */}
      {selectedElement && selectedElementType && (
        <div className="absolute top-0 right-0 h-full">
          <GraphSidebar
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
