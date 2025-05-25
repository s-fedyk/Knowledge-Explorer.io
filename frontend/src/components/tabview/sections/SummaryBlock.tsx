// File: components/chat/blocks/SummaryBlock.jsx
import React from "react";
import { Info } from "lucide-react";
import BlockWrapper from "./BlockWrapper";

const SummaryBlock = ({ content, complete, onComplete, sectionId }) => {
  const config = {
    bgColor: "bg-amber-50",
    borderColor: "border-amber-500",
    textColor: "text-amber-700",
    iconColor: "text-amber-500",
    pulseColor: "text-amber-500",
    title: "Community Summary",
    icon: <Info className="w-5 h-5" />,
  };

  return (
    <BlockWrapper
      config={config}
      content={content}
      complete={complete}
      onComplete={onComplete}
      sectionId={sectionId}
    />
  );
};

export default SummaryBlock;
