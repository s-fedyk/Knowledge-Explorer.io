import React, { useMemo, useCallback } from "react";
import ChatWindow from "./ChatWindow";
import FileView from "./FileView";
import GraphView from "./GraphView";
import TabIcon from "./TabIcon";
import Tab from "./Tab";
import { useTabContext } from "@context/TabContext";
import { GraphViewProvider } from "@context/GraphViewContext";

const TabView = () => {
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
    <div className="h-full w-full flex flex-col bg-gray-200 overflow-hidden">
      {/* Tabs navigation */}
      <div className="flex flex-none bg-white border-b border-gray-400 overflow-x-auto text-lg">
        {tabs.map((tab) => (
          <Tab key={tab.id} tab={tab} />
        ))}
      </div>
      {/* Tab content area */}
      <div className="flex-1 overflow-auto bg-gray-100">{tabsContent}</div>
    </div>
  );
};

export default TabView;
