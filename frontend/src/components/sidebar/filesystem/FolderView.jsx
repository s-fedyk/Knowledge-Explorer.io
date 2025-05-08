// FolderView.jsx
import React from "react";
import EmptyState from "./EmptyState";
import { useFileSystemContext } from "@context/FileSystemContext";
import FileItem from "./items/FileItem";
import FolderItem from "./items/FolderItem";

/**
 * FolderView component to display the contents of the current folder
 */
function FolderView() {
  const { currentPath, directory, navigateToFolder } = useFileSystemContext();

  return (
    <div className="h-full overflow-y-auto">
      <ul className="text-black">
        {directory.map((item) =>
          item.mimetype === "folder" ? (
            <FolderItem
              key={item.uuid}
              folder={item}
              currentPath={currentPath}
              navigateToFolder={navigateToFolder}
            />
          ) : (
            <FileItem key={item.uuid} file={item} />
          ),
        )}
      </ul>
    </div>
  );
}

export default FolderView;
