// File: components/chat/blocks/FinalBlock.jsx
import React from "react";
import { CheckCircle } from "lucide-react";
import BlockWrapper from "./BlockWrapper";

const FinalBlock = ({ content, complete, onComplete, sectionId }) => {
  const config = {
    bgColor: "bg-blue-50",
    borderColor: "border-blue-500",
    textColor: "text-blue-700",
    iconColor: "text-blue-500",
    pulseColor: "text-blue-500",
    title: "Final Answer",
    icon: <CheckCircle className="w-5 h-5" />,
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

export default FinalBlock;
