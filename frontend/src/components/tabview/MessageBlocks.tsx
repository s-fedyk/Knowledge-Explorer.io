// File: components/chat/MessageBlocks.jsx
import React, { useState, useEffect } from "react";
import { Remark } from "react-remark";
import { Client } from "@api/query.ts";

/**
 * PulsingIndicator component with enhanced completion animation
 */
const PulsingIndicator = ({ complete, color }) => {
  const [isCompleting, setIsCompleting] = useState(false);
  const [shouldHide, setShouldHide] = useState(false);

  useEffect(() => {
    if (complete && !isCompleting) {
      setIsCompleting(true);
      // After the completion animation, hide the indicator
      setTimeout(() => {
        setShouldHide(true);
      }, 1000); // Total animation duration
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

const remarkComponents = {
  // Enhance list rendering
  ul: ({ children }) => (
    <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>
  ),
  li: ({ children }) => <li className="mb-1">{children}</li>,

  // Enhance other common markdown elements
  p: ({ children }) => <p className="mb-4">{children}</p>,
  h1: ({ children }) => <h1 className="text-2xl font-bold my-3">{children}</h1>,
  h2: ({ children }) => <h2 className="text-xl font-bold my-3">{children}</h2>,
  h3: ({ children }) => <h3 className="text-lg font-bold my-2">{children}</h3>,
  pre: ({ children }) => (
    <pre className="bg-gray-100 p-3 rounded my-3 overflow-x-auto">
      {children}
    </pre>
  ),
  code: ({ className, children }) => {
    // Check if this is an inline code block or a code fence
    if (className) {
      return (
        <code className={`${className} block whitespace-pre-wrap`}>
          {children}
        </code>
      );
    }
    return (
      <code className="bg-gray-100 px-1 py-0.5 rounded text-red-600 font-mono text-sm">
        {children}
      </code>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-gray-200 pl-4 py-1 italic text-gray-600 my-3">
      {children}
    </blockquote>
  ),
};

const TypedBlock = ({ section }) => {
  const [content, setContent] = useState("");
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    let cleanup: () => void;

    if (!complete) {
      (async () => {
        cleanup = await Client.streamJob(
          section.id,
          (token) => {
            if (!isCancelled) {
              setContent((prev) => prev + token);
            }
          },
          () => {
            if (!isCancelled) {
              setComplete(true);
              section.onComplete();
            }
          },
        );
      })();
    }

    return () => {
      isCancelled = true;
      if (cleanup) cleanup();
    };
  }, [section.id]);

  const typeConfigs = {
    summary: {
      bgColor: "bg-amber-50",
      borderColor: "border-amber-500",
      textColor: "text-amber-700",
      iconColor: "text-amber-500",
      pulseColor: "text-amber-500",
      title: "Community Summary",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      ),
    },
    entity: {
      bgColor: "bg-purple-50",
      borderColor: "border-purple-500",
      textColor: "text-purple-700",
      iconColor: "text-purple-500",
      pulseColor: "text-purple-500",
      title: "Entity Extraction",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      ),
    },
    final: {
      bgColor: "bg-blue-50",
      borderColor: "border-blue-500",
      textColor: "text-blue-700",
      iconColor: "text-blue-500",
      pulseColor: "text-blue-500",
      title: "Final Answer",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M5 13l4 4L19 7"
        />
      ),
    },
  };

  const config = typeConfigs[section.type];

  if (!config) {
    return (
      <div className="text-gray-700">
        <Remark rehypeReactOptions={{ components: remarkComponents }}>
          {content}
        </Remark>
      </div>
    );
  }

  return (
    <div
      className={`${config.bgColor} border-l-4 ${config.borderColor} border-t border-b border-r p-3 rounded my-2`}
    >
      <div className="flex items-center mb-1">
        <svg
          className={`w-5 h-5 ${config.iconColor} mr-2`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          {config.icon}
        </svg>
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
export default TypedBlock;
