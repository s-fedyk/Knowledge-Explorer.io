// FileItem.jsx
import React from "react";
import { useFileSystemContext } from "@context/FileSystemContext";
import { useTabContext } from "@context/TabContext";

/**
 * FileItem component with a clean design and subtle glow effect when selected
 */
function FileItem({ file }) {
  const { activeFile } = useFileSystemContext();
  const { handleFileClick } = useTabContext();

  console.log("file item is ", file, "active is ", activeFile);

  // Check if file is active
  const isActive = activeFile?.uuid === file?.uuid;

  console.log(isActive);

  return (
    <li
      className={`p-2 flex items-center cursor-pointer transition-all duration-50 ${
        isActive ? "bg-gray-100" : "hover:bg-gray-50"
      }`}
      onClick={() => {
        handleFileClick(file);
      }}
    >
      {/* File icon with glow effect when active */}
      <svg
        className={`w-5 h-5 mr-3 flex-shrink-0 transition-colors duration-50 ${
          isActive ? "text-red-400 filter drop-shadow-sm" : "text-gray-400"
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={isActive ? 2.5 : 2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>

      {/* File name with transition effect */}
      <span
        className={`
        truncate flex-grow transition-colors duration-50
        ${isActive ? "text-gray-800 font-medium" : "text-gray-500"}
      `}
      >
        {file.name}
      </span>

      {/* File actions with improved hover states */}
      <button
        className={`
          ml-2 flex-shrink-0 p-1 rounded transition-colors duration-150
          ${
            isActive
              ? "text-gray-400 hover:text-red-500"
              : "text-gray-300 hover:text-red-500"
          }
        `}
        onClick={(e) => {
          console.log("remove!");
          e.stopPropagation();
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
    </li>
  );
}

export default FileItem;
