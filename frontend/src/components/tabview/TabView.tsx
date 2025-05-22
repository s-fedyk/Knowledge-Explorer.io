import React, { useMemo, useCallback } from "react";
import ChatWindow from "./ChatWindow";
import FileView from "./FileView";
import GraphView from "./GraphView";
import { Settings2 } from "lucide-react"; // This imports the hamburger icon
import TabIcon from "./TabIcon";
import Tab from "./Tab";
import { useTabContext } from "@context/TabContext";
import { GraphViewProvider } from "@context/GraphViewContext";
import { Github } from "lucide-react";

const TabView = ({ onToggleSidebar }) => {
  const { tabs, activeTabId } = useTabContext();

  const renderTabContent = useCallback((tab) => {
    switch (tab.type) {
      case "file":
        return <FileView file={tab.file} />;
      case "graph":
        return (
          <GraphViewProvider>
            <GraphView nodes={tab.nodes} />
          </GraphViewProvider>
        );
      default:
        return <ChatWindow />;
    }
  }, []);

  const tabsContent = useMemo(() => {
    return tabs.map((tab) => (
      <div
        key={tab.id}
        className={`h-full ${activeTabId === tab.id ? "block" : "hidden"}`}
      >
        {renderTabContent(tab)}
      </div>
    ));
  }, [tabs, activeTabId, renderTabContent]);

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div className="flex flex-none bg-white border-b border-gray-400 text-lg relative">
        {/* Add menu button for mobile */}
        <div className="md:hidden border-gray-400 border-r items-center">
          <button
            onClick={onToggleSidebar}
            className="select-none w-full h-full p-3 hover:bg-gray-100 md:hidden text-gray-500"
            aria-label="Toggle sidebar"
          >
            <Settings2 size={20} />
          </button>
        </div>
        <div className="flex overflow-x-auto pr-12 w-full">
          {tabs.map((tab) => (
            <Tab key={tab.id} tab={tab} />
          ))}
        </div>
        {/* ... existing GitHub link ... */}
      </div>
      <div className="flex-1 overflow-hidden bg-gray-100 relative">
        {tabsContent}
      </div>
    </div>
  );
};

export default TabView;
