import React, { useState, useEffect } from "react";
import { useMessageContext } from "@context/MessageContext";
import { ChevronDown, ChevronUp } from "lucide-react";

/**
 * QueryModeSelector component for displaying and selecting query modes
 */
function QueryModeSelector() {
  const { queryMode, setQueryMode } = useMessageContext();
  const [selectedMode, setSelectedMode] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const queryModes = [
    {
      id: 1,
      name: "global",
      description: "For questions which require a thematic understanding",
    },
    {
      id: 2,
      name: "local",
      description:
        "For questions focused on a person, place, thing, or concept",
    },
  ];

  // Function to highlight specific words with colors and drop shadows
  const highlightWords = (text) => {
    // Words to highlight with orange (thematic)
    const orangeWords = ["thematic", "understanding"];
    // Words to highlight with purple (concept, person, place, thing)
    const purpleWords = ["concept", "person", "place", "thing"];

    let highlightedText = text;

    // Apply orange highlighting
    orangeWords.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      highlightedText = highlightedText.replace(
        regex,
        `<span class="text-amber-500 font-semibold" style="text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">${word}</span>`,
      );
    });

    // Apply purple highlighting
    purpleWords.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      highlightedText = highlightedText.replace(
        regex,
        `<span class="text-purple-500 font-semibold" style="text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">${word}</span>`,
      );
    });

    return { __html: highlightedText };
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    // Show tooltip after clicking
    if (!isOpen) {
      setShowTooltip(true);
      // Hide tooltip after 3 seconds
      setTimeout(() => setShowTooltip(false), 3000);
    }
  };

  const selectQueryMode = (mode) => {
    const selectedModeObj = queryModes.find((m) => m.name === mode);
    setSelectedMode(selectedModeObj);
    setQueryMode(mode);
    setIsOpen(false);
  };

  // Hide tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showTooltip) {
        setShowTooltip(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showTooltip]);

  return (
    <div className="flex flex-col h-full text-black">
      {/* Header stays fixed */}
      <div className="flex justify-center items-center p-2 border-b border-gray-400">
        <h2 className="p-2 text-black text-lg ">🤖Explorer🤖</h2>
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
          {/* Tooltip */}
          {showTooltip && (
            <div className="absolute top-full left-0 mt-2 p-3 bg-gray-800 text-white text-sm rounded-lg shadow-lg z-20 max-w-xs">
              <div className="relative">
                {/* Arrow pointing up */}
                <div className="absolute -top-2 left-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-800"></div>
                Choose between local (your files) or global (all sources) search
                modes to get the most relevant results for your query.
              </div>
            </div>
          )}
          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute left-0 right-0 mt-1 border border-gray-400 bg-white z-10 shadow-lg">
              {queryModes.map((mode) => (
                <div
                  key={mode.id}
                  className="border-b border-gray-200 last:border-b-0"
                >
                  <div
                    className={`p-3 cursor-pointer ${selectedMode && selectedMode.id === mode.id ? "bg-gray-200" : "hover:bg-gray-100"}`}
                    onClick={() => selectQueryMode(mode.name)}
                  >
                    <div className="font-medium text-gray-900 mb-1">
                      {mode.name}
                    </div>
                    <div
                      className="text-sm text-gray-400"
                      dangerouslySetInnerHTML={highlightWords(mode.description)}
                    />
                  </div>
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
