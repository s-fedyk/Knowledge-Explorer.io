import React, { useMemo, useCallback } from "react";
import ChatWindow from "./ChatWindow";
import FileView from "./FileView";
import GraphView from "./GraphView";
import TabIcon from "./TabIcon";
import Tab from "./Tab";
import { useTabContext } from "@context/TabContext";
// Context provider for GraphView specific state, used when a 'graph' type tab is active.
import { GraphViewProvider } from "@context/GraphViewContext";
// Lucide icons for GitHub and Settings (sidebar toggle).
import { Github, Settings2 } from "lucide-react";

// `GIT_URL` is likely a global constant or environment variable holding the project's GitHub URL.
// If it's not defined elsewhere, this would cause an error. Assuming it's defined globally.
// For example: const GIT_URL = "https://github.com/example/project";

// TabView component: Manages the display of multiple tabs and their content.
// It allows users to switch between different views like chat, file display, or graph visualization.
const TabView = ({ onToggleSidebar }) => {
  // `tabs`: An array of tab objects from TabContext, each defining a tab's id, type, and associated data.
  // `activeTabId`: The ID of the currently active tab.
  const { tabs, activeTabId } = useTabContext();

  // `renderTabContent`: A memoized callback function to render the content of a given tab
  // based on its `type`. This prevents re-renders if the tab object itself hasn't changed.
  const renderTabContent = useCallback((tab) => {
    switch (tab.type) {
      case "file":
        // If the tab type is 'file', render the FileView component with the file data.
        return <FileView file={tab.file} />;
      case "graph":
        // If the tab type is 'graph', render the GraphView component.
        // It's wrapped in GraphViewProvider to provide context specific to graph visualization.
        return (
          <GraphViewProvider>
            <GraphView nodes={tab.nodes} />
          </GraphViewProvider>
        );
      default:
        // By default, or if the type is 'chat' (or undefined), render the ChatWindow.
        return <ChatWindow />;
    }
  }, []); // Empty dependency array means this function is created once and never changes.

  // `tabsContent`: Memoized content for all tabs.
  // It maps over the `tabs` array and renders the content for each tab.
  // Only the active tab's content is made visible using CSS classes.
  const tabsContent = useMemo(() => {
    return tabs.map((tab) => (
      <div
        key={tab.id} // Unique key for each tab content wrapper.
        // Conditional styling: 'block' to show if active, 'hidden' otherwise.
        className={`h-full ${activeTabId === tab.id ? "block" : "hidden"}`}
      >
        {renderTabContent(tab)}
      </div>
    ));
  }, [tabs, activeTabId, renderTabContent]); // Re-compute only if these dependencies change.

  return (
    // Main container for the TabView, takes full height and width, uses flex column layout.
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Top bar area: contains the sidebar toggle button (mobile), scrollable tabs, and GitHub link. */}
      <div className="flex bg-white border-b border-gray-400 text-lg">
        {/* Sidebar Toggle Button (Mobile only) */}
        {/* `md:hidden` makes this button visible only on small screens (less than md breakpoint). */}
        <div className="border-gray-400 md:hidden border-r">
          <button
            onClick={onToggleSidebar} // Calls the function passed from App.tsx to toggle the sidebar.
            className="flex-shrink-0 p-3 w-full h-full hover:bg-gray-100 text-gray-500 border-r border-gray-400"
            aria-label="Toggle sidebar" // Accessibility label.
          >
            <Settings2 size={20} /> {/* Settings icon used for menu/sidebar toggle. */}
          </button>
        </div>

        {/* Scrollable Tabs Container */}
        {/* `overflow-x-auto` allows horizontal scrolling if there are too many tabs to fit. */}
        <div className="flex w-full overflow-x-auto h-full">
          {tabs.map((tab) => (
            // Renders an individual Tab component for each tab in the `tabs` array.
            <Tab key={tab.id} tab={tab} />
          ))}
        </div>

        {/* Fixed GitHub Icon Link */}
        {/* `flex-shrink-0` prevents this icon from shrinking if space is limited. */}
        <a
          href={GIT_URL} // Assumes GIT_URL is defined globally or passed as a prop.
          target="_blank" // Opens link in a new tab.
          rel="noopener noreferrer" // Security best practice for external links.
          className="flex-shrink-0 flex items-center text-gray-400 px-3 cursor-pointer bg-white border-l border-gray-400 hover:bg-gray-100 hover:text-black transition-colors duration-100"
        >
          <Github size={30} /> {/* GitHub icon. */}
        </a>
      </div>

      {/* Main Content Area for Tabs */}
      {/* `flex-1` allows this area to take up the remaining vertical space. */}
      {/* `overflow-auto` allows scrolling of the tab content if it exceeds the viewport. */}
      <div className="flex-1 overflow-auto bg-gray-100">{tabsContent}</div>
    </div>
  );
};

export default TabView;
