import React from "react";

/**
 * EmptyState component to display when no files are available
 * @param {Object} props - Component props
 * @param {Function} props.onFileUpload - Function to call when upload button is clicked
 */
function EmptyState({ onFileUpload }) {
  return (
    <div className="flex items-center justify-center h-full text-gray-400 p-4">
      <div className="text-center">
        <svg
          className="w-12 h-12 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="mb-4">Upload</p>
      </div>
    </div>
  );
}

export default EmptyState;
