// LoadingSpinner.jsx
import React from "react";

function LoadingSpinner() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-gray-500"></div>
    </div>
  );
}

export default LoadingSpinner;
