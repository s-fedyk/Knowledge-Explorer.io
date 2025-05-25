import React, { useState, useEffect } from "react";

const PulsingIndicator = ({ complete, color }) => {
  const [isCompleting, setIsCompleting] = useState(false);
  const [shouldHide, setShouldHide] = useState(false);

  useEffect(() => {
    if (complete && !isCompleting) {
      setIsCompleting(true);
      setTimeout(() => {
        setShouldHide(true);
      }, 1000);
    }
  }, [complete, isCompleting]);

  if (shouldHide) return null;

  return (
    <span className={`ml-2 ${color} transition-all duration-300`}>
      <span
        className={`
          inline-block
          ${isCompleting ? "animate-ping-complete" : "animate-pulse"}
        `}
        style={{
          animationDuration: isCompleting ? "0.5s" : "2s",
          animationIterationCount: isCompleting ? "2" : "infinite",
        }}
      >
        •
      </span>
    </span>
  );
};

export default PulsingIndicator;
