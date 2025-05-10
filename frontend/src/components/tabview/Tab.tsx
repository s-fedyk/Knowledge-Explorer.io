import { useMemo } from "React";
import { useTabContext } from "@context/TabContext";
import TabIcon from "./TabIcon";

function Tab({ tab }) {
  const { activeTabId, handleTabClick } = useTabContext();
  const active = activeTabId == tab.id;
  const textColor = active ? "text-black" : "text-gray-400";

  const classes = useMemo(() => {
    return `px-6 py-4 flex items-center cursor-pointer border-r border-gray-200 ${
      activeTabId === tab.id
        ? "bg-gray-100 text-gray-400"
        : "hover:bg-gray-50 text-gray-400"
    }`;
  }, [activeTabId, tab.id]);

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
      {/* Only show close button if not the chat tab */}
    </div>
  );
}

export default Tab;
