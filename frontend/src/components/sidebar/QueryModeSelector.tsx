import React, { useState } from "react";
import { useMessageContext } from "@context/MessageContext";
import { ChevronDown, ChevronUp } from "lucide-react";

/**
 * QueryModeSelector component for displaying and selecting query modes
 */
function QueryModeSelector() {
  const { queryMode, setQueryMode } = useMessageContext();
  const [selectedMode, setSelectedMode] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const queryModes = [
    { id: 1, name: "global" },
    { id: 2, name: "local" },
  ];

  const toggleDropdown = () => setIsOpen(!isOpen);

  const selectQueryMode = (mode) => {
    setSelectedMode(mode);
    setQueryMode(mode);
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col h-full text-black">
      {/* Header stays fixed */}
      <div className="flex justify-center items-center p-2 border-b border-gray-400">
        <h2 className="p-2 text-black text-lg font-bold">Knowledge Explorer</h2>
      </div>

      {/* Content area with scrolling */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Query Type Dropdown */}
        <div className="relative select-none">
          <div
            className="flex justify-between items-center p-2 border border-gray-400 cursor-pointer"
            onClick={toggleDropdown}
          >
            <span>{queryMode ? queryMode : "Select query type"}</span>
            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>

          {isOpen && (
            <div className="absolute left-0 right-0 mt-1 border border-gray-400 bg-white z-10">
              {queryModes.map((mode) => (
                <div
                  key={mode.id}
                  className={`p-2 cursor-pointer ${selectedMode && selectedMode.id === mode.id ? "bg-gray-200" : "hover:bg-gray-100"}`}
                  onClick={() => selectQueryMode(mode.name)}
                >
                  {mode.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default QueryModeSelector;
