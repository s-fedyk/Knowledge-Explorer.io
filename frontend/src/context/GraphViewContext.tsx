import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import type { Node, Relationship } from "@api/apollo.ts";

// Define a union type for selected elements
type SelectedElement = Node | Relationship;

// Define the context state type
interface GraphViewContextState {
  // Selected element state
  selectedElement: SelectedElement | null;
  selectedElementType: "node" | "relationship" | null;
  isExitingSidebar: boolean;
  // Action methods
  selectElement: (
    element: SelectedElement,
    type: "node" | "relationship",
  ) => void;
  closeSidebar: () => void;
}

// Create the context with default values
const GraphViewContext = createContext<GraphViewContextState>({
  selectedElement: null,
  selectedElementType: null,
  isExitingSidebar: false,
  selectElement: () => {},
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
  // State for the selected element and animation
  const [selectedElement, setSelectedElement] =
    useState<SelectedElement | null>(null);
  const [selectedElementType, setSelectedElementType] = useState<
    "node" | "relationship" | null
  >(null);
  const [isExitingSidebar, setIsExitingSidebar] = useState(false);

  // Handle selecting an element (node or relationship)
  const selectElement = useCallback(
    (element: SelectedElement, type: "node" | "relationship") => {
      setIsExitingSidebar(false);
      setSelectedElement(element);
      setSelectedElementType(type);
    },
    [],
  );

  // Handle closing the sidebar with animation
  const closeSidebar = useCallback(() => {
    if (!selectedElement && !isExitingSidebar) return;

    setIsExitingSidebar(true);

    // Wait for animation to complete before removing component
    setTimeout(() => {
      setIsExitingSidebar(false);
      setSelectedElement(null);
      setSelectedElementType(null);
    }, 300); // match this with animation duration
  }, [selectedElement, isExitingSidebar]);

  // Create the context value object
  const contextValue: GraphViewContextState = {
    selectedElement,
    selectedElementType,
    isExitingSidebar,
    selectElement,
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
