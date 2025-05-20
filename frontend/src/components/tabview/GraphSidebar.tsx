import type { HitTargets, Node, Relationship } from "@neo4j-nvl/base";
import { InteractiveNvlWrapper } from "@neo4j-nvl/react";
import type { MouseEventCallbacks } from "@neo4j-nvl/react";
import React, { FC, useState, useEffect, useMemo } from "react";
import { useNodesWithRelations } from "@api/apollo.ts";
import { useGraphView } from "@context/GraphViewContext";
import { useFileSystemContext } from "@context/FileSystemContext";
import { useTabContext } from "@context/TabContext";

// Unified sidebar that uses the appropriate content component
interface GraphSidebarProps {
  element: Node | Relationship;
  elementType: "node" | "relationship";
  onClose: () => void;
  isExiting: boolean;
}

const GraphSidebar: FC<GraphSidebarProps> = ({
  element,
  elementType,
  onClose,
  isExiting,
}) => {
  if (!element) return null;

  const { getFileFromUUID } = useFileSystemContext();
  const { handleFileClick } = useTabContext();

  // Determine title based on element type
  const title =
    elementType === "node" ? "Node Details" : "Relationship Details";

  const onViewSource = () => {
    const UUID = element.file.split(".")[0];
    const sourceFile = getFileFromUUID(UUID);
    handleFileClick(sourceFile);
  };

  return (
    <div
      className={`h-full w-64 border-l element-sidebar overflow-y-auto border-gray-200 bg-white shadow-md ${
        isExiting ? "animate-slide-out" : "animate-slide-in"
      }`}
    >
      <div className="flex justify-between items-center p-3 border-b border-gray-200">
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-gray-100 text-gray-500 transition-colors duration-200"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div className="p-4">
        <div className="space-y-4">
          {/* Header with ID and Source Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-medium text-gray-500">ID:</h3>
              <p className="text-sm text-gray-900">{element.id}</p>
            </div>

            {element.file && (
              <button
                className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs leading-4 font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-400 transition-colors duration-200 "
                onClick={onViewSource}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5 mr-1 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                Source
              </button>
            )}
          </div>

          {element.caption && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Caption</h3>
              <p className="mt-1 text-sm text-gray-900">{element.caption}</p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-gray-500">Labels</h3>
            <p className="mt-1 text-sm text-gray-900">{element.labels}</p>
          </div>

          {element.description && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Description</h3>
              <div className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                {element.description}
              </div>
            </div>
          )}

          {/* Node properties */}
          {element.properties && Object.keys(element.properties).length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Properties</h3>
              <div className="mt-1 text-sm text-gray-900">
                {Object.entries(element.properties).map(([key, value]) => (
                  <div key={key} className="mb-2">
                    <span className="font-medium">{key}: </span>
                    <span>{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GraphSidebar;
