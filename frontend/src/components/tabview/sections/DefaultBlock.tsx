import React from "react";
import { Remark } from "react-remark";
import remarkComponents from "./MarkdownComponents";

const DefaultBlock = ({ content }) => {
  return (
    <div className="text-gray-700">
      <Remark rehypeReactOptions={{ components: remarkComponents }}>
        {content}
      </Remark>
    </div>
  );
};

export default DefaultBlock;
