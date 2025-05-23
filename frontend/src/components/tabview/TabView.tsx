import React, { useMemo, useCallback } from "react";
import ChatWindow from "./ChatWindow";
import FileView from "./FileView";
import GraphView from "./GraphView";
import TabIcon from "./TabIcon";
import Tab from "./Tab";
import { useTabContext } from "@context/TabContext";
import { GraphViewProvider } from "@context/GraphViewContext";
import { Github, Settings2 } from "lucide-react";

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
      <div className="flex bg-white border-b border-gray-400 text-lg">
        {/* Menu button for mobile */}
        <div className="border-gray-400 md:hidden border-r">
          <button
            onClick={onToggleSidebar}
            className="flex-shrink-0 p-3 w-full h-full hover:bg-gray-100 border-gray-400 text-gray-500 border-r border-gray-400"
            aria-label="Toggle sidebar"
          >
            <Settings2 size={20} />
          </button>
        </div>

        {/* Scrollable tabs container */}
        <div className="flex w-full overflow-x-auto h-full">
          {tabs.map((tab) => (
            <Tab key={tab.id} tab={tab} />
          ))}
        </div>

        {/* Fixed GitHub icon */}
        <a
          href={GIT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 flex items-center text-gray-400 px-3 cursor-pointer bg-white border-l border-gray-400 hover:bg-gray-100 hover:text-black transition-colors duration-100"
        >
          <Github size={30} />
        </a>
      </div>

      <div className="flex-1 overflow-auto bg-gray-100">{tabsContent}</div>
    </div>
  );
};

export default TabView;
