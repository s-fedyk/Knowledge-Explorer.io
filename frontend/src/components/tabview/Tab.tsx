import { useTabContext } from "@context/TabContext";
import TabIcon from "./TabIcon";

function Tab({ tab }) {
  const { activeTabId, handleTabClick } = useTabContext();
  console.log("TAB CONTENT", tab);

  return (
    <div
      key={tab.id}
      className={`px-6 py-4 flex items-center cursor-pointer border-r border-gray-200 ${
        activeTabId === tab.id
          ? "bg-gray-100 text-gray-400"
          : "hover:bg-gray-50 text-gray-400"
      }`}
      onClick={() => handleTabClick(tab.id)}
    >
      <TabIcon type={tab.type} active={activeTabId == tab.id} />
      <span className="pl-2 truncate border:none">{tab.name}</span>
      {/* Only show close button if not the chat tab */}
    </div>
  );
}

export default Tab;
