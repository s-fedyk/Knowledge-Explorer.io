import React, { useState, useEffect } from "react";
import { Remark } from "react-remark";
import { Client } from "@api/query.ts";
import PulsingIndicator from "./PulsingIndicator";
import { remarkComponents } from "./MarkdownComponents";

const BlockWrapper = ({
  config,
  content: initialContent,
  complete: initialComplete,
  onComplete,
  sectionId,
}) => {
  const [content, setContent] = useState(initialContent || "");
  const [complete, setComplete] = useState(initialComplete || false);

  useEffect(() => {
    let isCancelled = false;
    let cleanup;

    if (!complete && sectionId) {
      (async () => {
        cleanup = await Client.streamJob(
          sectionId,
          (token) => {
            if (!isCancelled) {
              setContent((prev) => prev + token);
            }
          },
          () => {
            if (!isCancelled) {
              setComplete(true);
              if (onComplete) onComplete();
            }
          },
        );
      })();
    }

    return () => {
      isCancelled = true;
      if (cleanup) cleanup();
    };
  }, [sectionId, complete, onComplete]);

  return (
    <div
      className={`${config.bgColor} border-l-4 ${config.borderColor} border-t border-b border-r p-3 rounded my-2`}
    >
      <div className="flex items-center mb-1">
        <span className={`${config.iconColor} mr-2`}>{config.icon}</span>
        <span className={`font-medium ${config.textColor}`}>
          {config.title}
        </span>
        {!complete && (
          <PulsingIndicator complete={complete} color={config.pulseColor} />
        )}
      </div>
      <div className="text-gray-700">
        <Remark rehypeReactOptions={{ components: remarkComponents }}>
          {content}
        </Remark>
      </div>
    </div>
  );
};

export default BlockWrapper;
