import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import type { Node, Relationship } from "@api/apollo.ts";

// Define the context state type
interface GraphViewContextState {
  // Selected node state
  selectedNode: Node | null;
  isExitingSidebar: boolean;

  // Action methods
  selectNode: (node: Node) => void;
  closeSidebar: () => void;
}

// Create the context with default values
const GraphViewContext = createContext<GraphViewContextState>({
  selectedNode: null,
  isExitingSidebar: false,
  selectNode: () => {},
  closeSidebar: () => {},
});

// Props for the context provider
interface GraphViewProviderProps {
  children: ReactNode;
}

/**
 * Provider component for the GraphView context
 */
export const GraphViewProvider: React.FC<GraphViewProviderProps> = ({
  children,
}) => {
  // State for the selected node and animation
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isExitingSidebar, setIsExitingSidebar] = useState(false);

  // Handle selecting a node
  const selectNode = useCallback(
    (node: Node) => {
      setSelectedNode(node);
    },
    [selectedNode],
  );

  // Handle closing the sidebar with animation
  const closeSidebar = useCallback(() => {
    if (!selectedNode && !isExitingSidebar) return;

    setIsExitingSidebar(true);
    // Wait for animation to complete before removing component
    setTimeout(() => {
      setIsExitingSidebar(false);
      setSelectedNode(null);
    }, 300); // match this with animation duration
  }, [selectedNode, isExitingSidebar]);

  // Create the context value object
  const contextValue: GraphViewContextState = {
    selectedNode,
    isExitingSidebar,
    selectNode,
    closeSidebar,
  };

  return (
    <GraphViewContext.Provider value={contextValue}>
      {children}
    </GraphViewContext.Provider>
  );
};

/**
 * Custom hook to use the GraphView context
 */
export const useGraphView = () => {
  const context = useContext(GraphViewContext);
  if (!context) {
    throw new Error("useGraphView must be used within a GraphViewProvider");
  }
  return context;
};
