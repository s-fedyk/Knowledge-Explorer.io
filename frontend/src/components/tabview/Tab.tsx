import { useMemo } from "react";
import { useTabContext } from "@context/TabContext";
import TabIcon from "./TabIcon";
import { X } from "lucide-react"; // Importing X icon from lucide-react

function Tab({ tab }) {
  const { activeTabId, handleTabClick, handleCloseTab } = useTabContext();
  const active = activeTabId === tab.id;
  const textColor = active ? "text-black" : "text-gray-400";

  const classes = useMemo(() => {
    return `px-6 py-4 flex items-center cursor-pointer border-r border-gray-200 ${
      activeTabId === tab.id
        ? "bg-gray-100 text-gray-400"
        : "hover:bg-gray-50 text-gray-400"
    }`;
  }, [activeTabId, tab.id]);

  // Handle close button click without triggering tab selection
  const onCloseClick = (e) => {
    e.stopPropagation(); // Prevent event from bubbling up to parent div
    handleCloseTab(tab);
  };

  return (
    <div
      key={tab.id}
      className={classes}
      onClick={() => handleTabClick(tab.id)}
    >
      <TabIcon type={tab.type} active={active} />
      <span className={`pl-2 truncate border:none ${textColor}`}>
        {tab.name}
      </span>
      {/* Only show close button if not the default chat tab */}
      {tab.close && (
        <div
          className="ml-2 transition-colors duration-150"
          onClick={onCloseClick}
        >
          <X
            size={16}
            className="text-gray-500 hover:text-red-500 transition-colors duration-150"
          />
        </div>
      )}
    </div>
  );
}

export default Tab;
