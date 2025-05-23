import React from "react";
import QueryModeSelector from "./QueryModeSelector";
import FileSystem from "./filesystem/FileSystem";
import { FileSystemProvider } from "@context/FileSystemContext";

/**
 * NavSidebar component that holds a filesystem and chat history
 * @param {Object} props - Component props
 * @param {Array} props.initialChatHistories - Initial chat histories
 * @param {string|null} props.initialActiveQueryMode - Initial active chat history ID
 * @param {Object} props.initialDirectory - Initial directory structure
 * @param {string|null} props.initialActiveFile - Initial active file
 */
function NavSidebar() {
  return (
    <div className="w-64 h-full bg-white shadow-md flex flex-col border-r border-gray-400">
      {/* Mobile close button - remove padding when hidden */}
      <div className="basis-2/5 overflow-y-auto border-gray-400">
        <QueryModeSelector />
      </div>
      <div className="basis-3/5">
        <FileSystem />
      </div>
    </div>
  );
}

export default NavSidebar;
