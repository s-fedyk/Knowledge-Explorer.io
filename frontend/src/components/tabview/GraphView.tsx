import type { HitTargets, Node, Relationship } from "@neo4j-nvl/base";
import { InteractiveNvlWrapper } from "@neo4j-nvl/react";
import type { MouseEventCallbacks } from "@neo4j-nvl/react";
import React, { FC, useState, useEffect, useMemo } from "react";
import { useNodesWithRelations } from "@api/apollo.ts";
import { useGraphView } from "@context/GraphViewContext";
import GraphSidebar from "./GraphSidebar";
// Custom CSS for graph view, potentially including slide animations for the sidebar.
import "./GraphView.css";

/**
 * @file GraphView.tsx
 * @description Component for rendering and interacting with a graph visualization
 * using Neo4j NVL (Neo4j Visual Library). It fetches graph data based on node IDs,
 * assigns colors to nodes, handles user interactions like clicks on nodes/relationships,
 * and displays a sidebar with details of the selected graph element.
 */

/**
 * Assigns distinct, vibrant colors to nodes based on their labels.
 * If a node has multiple labels, the color for the first label is used.
 * Nodes without labels get a default neutral color.
 * This helps in visually distinguishing different types of nodes in the graph.
 *
 * @param {Node[]} nodes - An array of node objects from the graph data.
 * Each node object is expected to have a `labels` array.
 * @returns {Node[]} The same array of nodes, with an added `color` property,
 * `size`, `stroke`, and `strokeWidth` for styling.
 */
function assignColors(nodes: Node[]): Node[] {
  // A curated list of vibrant colors for node visualization.
  const glowColors = [
    "#FF006E", // Hot Pink (Primary entities)
    "#3A86FF", // Bright Blue (Secondary entities/concepts)
    "#8338EC", // Vibrant Purple (Actions/Events)
    "#FB5607", // Vermilion (Important flags/warnings)
    "#06D6A0", // Mint (Data points/metrics)
    "#FFBE0B", // Amber (Categories/Groups)
    "#00BBF9", // Cyan (Locations/Sources)
    "#9B5DE5", // Amethyst (Users/People)
    "#F15BB5", // Magenta (Documents/Files)
    "#00F5D4", // Aquamarine (Temporal data/Timestamps)
    "#7209B7", // Deep Purple (Abstract concepts)
  ];

  // Collect all unique labels from the provided nodes.
  const uniqueLabels = new Set<string>();
  nodes.forEach((node) => {
    if (node.labels && node.labels.length > 0) {
      node.labels.forEach((label) => uniqueLabels.add(label));
    }
  });

  // Create a map from label to color.
  // Each unique label gets a color from the `glowColors` array in a round-robin fashion.
  const labelColorMap: Record<string, string> = {};
  Array.from(uniqueLabels).forEach((label, index) => {
    labelColorMap[label] = glowColors[index % glowColors.length];
  });

  // Assign visual properties (color, size, stroke) to each node.
  return nodes.map((node) => {
    const defaultVisuals = {
      size: 25, // Standard node size.
      stroke: "#FFFFFF", // White stroke for better contrast.
      strokeWidth: 3, // Stroke width.
    };

    // Assign a default neutral color if the node has no labels.
    if (!node.labels || node.labels.length === 0) {
      return {
        ...node,
        color: "#A0AEC0", // Neutral gray.
        ...defaultVisuals,
      };
    }

    // For nodes with labels, use the color mapped to their first label.
    // NVL typically visualizes based on the primary label if multiple exist.
    return {
      ...node,
      color: labelColorMap[node.labels[0]] || "#A0AEC0", // Fallback to default if label somehow not in map.
      ...defaultVisuals,
    };
  });
}

// Props for the GraphView component.
interface GraphViewProps {
  nodes: string[]; // An array of node IDs to be initially displayed or focused on in the graph.
}

// GraphView functional component.
function GraphView({ nodes: initialNodeIds }: GraphViewProps) {
  // Fetch graph data (nodes and relationships) using a custom Apollo hook (`useNodesWithRelations`).
  // This hook likely takes an array of node IDs and fetches these nodes along with their direct relationships.
  const { loading, error, data } = useNodesWithRelations(initialNodeIds);

  // Access state and functions from GraphViewContext.
  // This context manages UI state related to the graph, like selected elements and sidebar visibility.
  const {
    selectedElement,      // Currently selected node or relationship.
    selectedElementType,  // Type of the selected element ('node' or 'relationship').
    isExitingSidebar,     // Boolean to manage sidebar exit animation.
    selectElement,        // Function to set the selected element.
    closeSidebar,         // Function to close the details sidebar.
  } = useGraphView();

  // The `colorAssignments` state and associated `useEffect` seem to be unused or redundant
  // because `nodesWithColors` directly calls `assignColors` within `useMemo`.
  // Consider removing if not planned for other purposes.
  // const [colorAssignments, setColorAssignments] = useState(null);
  // useEffect(() => {
  //   if (data && data.nodes) {
  //     const assignments = assignColors(data.nodes);
  //     setColorAssignments(assignments); // This state isn't directly used for rendering NVL.
  //   }
  // }, [data]);

  // Memoize the node coloring process.
  // `nodesWithColors` will only be recomputed if the fetched `data` (specifically `data.nodes`) changes.
  const nodesWithColors = useMemo(() => {
    if (data && data.nodes) {
      return assignColors(data.nodes); // Assign colors to the fetched nodes.
    }
    return []; // Return an empty array if no data.
  }, [data]); // Dependency: re-run when `data` changes.

  // Define callbacks for mouse interactions with the graph (nodes, relationships, canvas).
  const mouseEventCallbacks: MouseEventCallbacks = {
    // Placeholder for hover events. Can be used to show tooltips or highlight elements.
    onHover: (element, hitTargets, evt) => {},
    // Placeholder for right-clicking on a relationship.
    onRelationshipRightClick: (rel, hitTargets, evt) => {},
    // When a node is clicked, select it to display its details in the sidebar.
    onNodeClick: (node, hitTargets, evt) => {
      selectElement(node, "node"); // Update context with the selected node.
    },
    // Placeholder for right-clicking on a node.
    onNodeRightClick: (node, hitTargets, evt) => {},
    // Placeholder for double-clicking on a node.
    onNodeDoubleClick: (node, hitTargets, evt) => {},
    // When a relationship is clicked, select it for the sidebar.
    onRelationshipClick: (rel, hitTargets, evt) => {
      selectElement(rel, "relationship"); // Update context with the selected relationship.
    },
    // Placeholder for double-clicking on a relationship.
    onRelationshipDoubleClick: (rel, hitTargets, evt) => {},
    // When the canvas (background) is clicked, close the sidebar.
    onCanvasClick: (evt) => {
      closeSidebar(); // Clear selection and hide sidebar.
    },
    // Placeholders for other canvas interactions and graph events.
    onCanvasDoubleClick: (evt) => {},
    onCanvasRightClick: (evt) => {},
    onDrag: (nodes) => {}, // Called when nodes are dragged.
    onPan: (evt) => {},   // Called when the canvas is panned.
    onZoom: (zoomLevel) => {}, // Called when zoom level changes.
  };

  // Display a loading indicator while graph data is being fetched.
  if (loading)
    return (
      <div className="flex justify-center items-center h-full bg-gray-50">
        {/* Animated spinner and text for loading state. */}
        <div className="flex items-center space-x-2 text-gray-600">
          <svg /* SVG for spinner */ >...</svg>
          <span>Loading graph data...</span>
        </div>
      </div>
    );

  // Display an error message if data fetching fails.
  if (error)
    return (
      <div className="p-4 bg-gray-50 text-gray-800">
        Error loading graph: {error.message}
      </div>
    );

  // Render the graph visualization once data is available.
  return (
    // Relative positioning for the main container to allow absolute positioning of the sidebar.
    <div className="relative h-full w-full">
      {/* Container for the Neo4j NVL graph visualization. */}
      <div className="h-full w-full">
        <InteractiveNvlWrapper
          nodes={nodesWithColors} // Pass nodes with assigned colors.
          rels={data ? data.rels : []} // Pass relationships from fetched data.
          mouseEventCallbacks={mouseEventCallbacks} // Attach interaction callbacks.
          // Styling for the NVL wrapper.
          className="bg-gray-100 h-full filter drop-shadow-lg"
        />
      </div>

      {/* Conditional rendering of the GraphSidebar. */}
      {/* Display the sidebar if an element (node or relationship) is selected. */}
      {selectedElement && selectedElementType && (
        // Position the sidebar absolutely on the top-right of the graph view.
        <div className="absolute top-0 right-0 h-full">
          <GraphSidebar
            element={selectedElement} // Pass the selected graph element.
            elementType={selectedElementType} // Pass the type of the element.
            onClose={closeSidebar} // Pass callback to close the sidebar.
            isExiting={isExitingSidebar} // Pass state for exit animation.
          />
        </div>
      )}
    </div>
  );
}

export default GraphView;
