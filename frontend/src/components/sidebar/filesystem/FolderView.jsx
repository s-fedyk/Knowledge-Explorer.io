import React from "react";
import EmptyState from "./EmptyState";
import { useFileSystemContext } from "@context/FileSystemContext";

/**
 * FolderView component to display the contents of the current folder
 */
function FolderView() {
  const {
    currentPath,
    directory,
    activeFile,
    handleFileSelect,
    handleFileRemove,
    handleFileUpload,
    navigateToFolder,
  } = useFileSystemContext();

  // Helper function to get the current directory contents
  const getCurrentDirectoryContents = () => {
    // Implementation depends on your directory structure
    // This is a simplified example
    const pathParts = currentPath.split("/").filter((part) => part);

    let current = directory;
    for (const part of pathParts) {
      if (current && current[part] && current[part].type === "folder") {
        current = current[part].contents;
      } else {
        return null; // Path doesn't exist
      }
    }

    return current;
  };

  const currentContents = getCurrentDirectoryContents();

  // If directory is empty or path doesn't exist
  if (!currentContents || Object.keys(currentContents).length === 0) {
    return (
      <EmptyState
        onFileUpload={() => {
          // Trigger file input click in parent component
          const fileInput = document.querySelector('input[type="file"]');
          if (fileInput) fileInput.click();
        }}
      />
    );
  }

  // Convert directory object to array for rendering
  const items = Object.entries(currentContents).map(([name, item]) => ({
    name,
    ...item,
  }));

  return (
    <div className="h-full overflow-y-auto p-1">
      <ul className="text-black">
        {items.map((item) => (
          <li
            key={item.name}
            className={`p-2 flex items-center cursor-pointer ${
              activeFile === item.path ? "bg-gray-100" : "hover:bg-blue-50"
            }`}
            onClick={() => {
              if (item.type === "folder") {
                navigateToFolder(`${currentPath}/${item.name}`);
              } else {
                handleFileSelect(item.path);
              }
            }}
          >
            {/* Icon based on file type */}
            {item.type === "folder" ? (
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            )}

            <span className="truncate flex-grow">{item.name}</span>

            {/* File actions */}
            {item.type !== "folder" && (
              <button
                className="text-gray-400 hover:text-red-500 ml-2"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFileRemove(item.path);
                }}
                title="Remove file"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default FolderView;
