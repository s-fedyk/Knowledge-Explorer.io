// TabIcon.jsx
import React from "react";

/**
 * TabIcon component that renders different icons based on type with glow effects when selected
 * @param {Object} props - Component props
 * @param {string} props.type - Icon type ("chat", "file", or "graph")
 * @param {boolean} props.active - Whether the tab is selected
 * @param {function} props.onClick - Click handler function
 */
function TabIcon({ type, active }) {
  // Define the accent color based on type

  const getAccentColor = () => {
    switch (type) {
      case "chat":
        return "text-blue-500";
      case "file":
        return "text-red-500";
      case "graph":
        return "text-green-600";
      default:
        return "text-gray-500";
    }
  };

  // Get the accent color
  const accentColor = getAccentColor();
  const iconClasses = `w-5 h-5 transition-all duration-50 ${active ? `${accentColor} filter drop-shadow-sm` : "text-gray-400"}`;
  const strokeWidth = active ? 2.5 : 2;

  return (
    <div
      className={`
         rounded-md cursor-pointer transition-all duration-50
        ${active ? "bg-gray-100" : "hover:bg-gray-50"}
      `}
    >
      {type === "chat" && (
        <svg
          className={iconClasses}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={strokeWidth}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      )}

      {type === "file" && (
        <svg
          className={iconClasses}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={strokeWidth}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      )}

      {type === "graph" && (
        <svg
          className={iconClasses}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          viewBox="0 0 24 24"
        >
          {/* Option 4: Hierarchical tree */}
          <circle cx="12" cy="4" r="2" strokeWidth="2" />
          <circle cx="6" cy="12" r="2" strokeWidth="2" />
          <circle cx="18" cy="12" r="2" strokeWidth="2" />
          <circle cx="6" cy="20" r="2" strokeWidth="2" />
          <circle cx="18" cy="20" r="2" strokeWidth="2" />

          <line x1="12" y1="6" x2="6" y2="10" strokeWidth="2" />
          <line x1="12" y1="6" x2="18" y2="10" strokeWidth="2" />
          <line x1="6" y1="14" x2="6" y2="18" strokeWidth="2" />
          <line x1="18" y1="14" x2="18" y2="18" strokeWidth="2" />
        </svg>
      )}
    </div>
  );
}

export default TabIcon;
