// File: components/chat/blocks/EntityBlock.jsx
import React from "react";
import { PersonStanding } from "lucide-react";
import BlockWrapper from "./BlockWrapper";

const EntityBlock = ({ content, complete, onComplete, sectionId }) => {
  const config = {
    bgColor: "bg-purple-50",
    borderColor: "border-purple-500",
    textColor: "text-purple-700",
    iconColor: "text-purple-500",
    pulseColor: "text-purple-500",
    title: "Entity Extraction",
    icon: <PersonStanding className="w-5 h-5" />,
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

export default EntityBlock;
