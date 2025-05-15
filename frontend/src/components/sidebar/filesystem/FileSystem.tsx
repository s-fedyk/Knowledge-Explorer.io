import React, { useEffect, useState } from "react";
import EmptyState from "./EmptyState";
import FolderView from "./FolderView";

function FileSystem() {
  return (
    <div className="h-full">
      <div className="flex justify-center items-center p-2 border-b border-t border-gray-400">
        <h2 className="p-2 text-black text-lg font-bold">Knowledge Base</h2>
      </div>
      <FolderView />
    </div>
  );
}

export default FileSystem;
