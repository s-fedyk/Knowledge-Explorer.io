import React from "react";
import type { File } from "../../../../types/filesystem/Node";

export interface FileItemProps {
  file: File;
  isActive?: boolean;
  onSelect: (id: string) => void;
  onRemove?: (id: string) => void;
}

const FileItem: React.FC<FileItemProps> = ({
  file,
  isActive = false,
  onSelect,
  onRemove,
}) => {
  const { id, name, size, mimeType } = file;
  const [type, subtype] = mimeType.split("/");

  const isPDF = mimeType === "application/pdf";
  const isImage = type === "image";
  const isText =
    type === "text" ||
    mimeType === "application/msword" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  const codeSubtypes = [
    "javascript",
    "json",
    "xml",
    "x-python-code",
    "x-java-source",
    "php",
    "typescript",
    "html",
    "css",
  ];

  const isCode =
    (type === "application" && codeSubtypes.includes(subtype)) ||
    (type === "text" && codeSubtypes.includes(subtype));

  const getFileIcon = (): JSX.Element => {
    if (isPDF) {
      return (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M10 13h4M10 17h4M10 9h1"
          />
        </svg>
      );
    }
    if (isImage) {
      return (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      );
    }
    if (isText) {
      return (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      );
    }
    if (isCode) {
      return (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
          />
        </svg>
      );
    }
    // default
    return (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    );
  };

  const getFileColor = (): string => {
    if (isPDF) return "text-red-500";
    if (isImage) return "text-purple-500";
    if (isText) return "text-blue-500";
    if (isCode) return "text-green-500 ";
    return "text-gray-500";
  };

  return (
    <div
      className={`p-2 flex items-center rounded-md cursor-pointer transition-colors group ${
        isActive ? "bg-blue-100" : "hover:bg-blue-50"
      }`}
      onClick={() => onSelect(id)}
    >
      <div
        className={`w-8 h-8 mr-2 flex items-center justify-center rounded transition-colors ${getFileColor()}`}
      >
        {getFileIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-700 truncate">{name}</div>
        <div className="text-xs text-gray-400 truncate">
          {size != null ? `${(size / 1024).toFixed(1)} KB` : ""}
        </div>
      </div>
      <button
        className="ml-2 p-1 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500 rounded-full transition-all"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(id);
        }}
        title="Remove"
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
            strokeWidth={1.5}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </div>
  );
};

export default FileItem;
