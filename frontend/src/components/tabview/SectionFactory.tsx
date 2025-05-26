// File: components/chat/TypedBlock.jsx
import React from "react";
import SummaryBlock from "./sections/SummaryBlock";
import EntityBlock from "./sections/EntityBlock";
import FinalBlock from "./sections/FinalBlock";
import RerankBlock from "./sections/RerankBlock";
import DefaultBlock from "./sections/DefaultBlock";

const SectionFactory = ({ section }) => {
  const blockProps = {
    content: section.content,
    complete: section.complete,
    onComplete: section.onComplete,
    sectionId: section.id,
  };

  switch (section.type) {
    case "summary":
      return <SummaryBlock {...blockProps} />;

    case "entity-extraction":
      return <EntityBlock {...blockProps} />;

    case "final":
      return <FinalBlock {...blockProps} />;

    case "entity-aggregation":
      return <FinalBlock {...blockProps} />;

    case "rerank":
      return <RerankBlock {...blockProps} />;

    default:
      return <DefaultBlock content={section.content || ""} />;
  }
};

export default SectionFactory;
