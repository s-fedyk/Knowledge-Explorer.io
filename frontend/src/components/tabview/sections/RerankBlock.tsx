import React from "react";
import { ArrowUpDown } from "lucide-react";
import BlockWrapper from "./BlockWrapper";

const RerankBlock = ({ content, complete, onComplete, sectionId }) => {
  const config = {
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-500",
    textColor: "text-emerald-700",
    iconColor: "text-emerald-500",
    pulseColor: "text-emerald-500",
    title: "Reranking",
    icon: <ArrowUpDown className="w-5 h-5" />,
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

export default RerankBlock;
