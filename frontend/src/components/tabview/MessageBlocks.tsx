// File: components/chat/MessageBlocks.jsx
import React from "react";
import { Remark } from "react-remark";

/**
 * SummaryBlock component renders a summary section
 */

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
export const SummaryBlock = ({ content, complete }) => {
  return (
    <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded my-2">
      <div className="flex items-center mb-1">
        <svg
          className="w-5 h-5 text-amber-500 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
        <span className="font-medium text-amber-700">Community Summary</span>
        {!complete && (
          <span className="ml-2 text-amber-500">
            <span className="animate-pulse">•</span>
          </span>
        )}
      </div>
      {/* Use ReactMarkdown here */}
      <div className="text-gray-700">
        <Remark rehypeReactOptions={{ components: remarkComponents }}>
          {content}
        </Remark>
      </div>
    </div>
  );
};
export const EntityBlock = ({ content, complete }) => {
  return (
    <div className="bg-purple-50 border-l-4 border-purple-500 p-3 rounded my-2">
      <div className="flex items-center mb-1">
        <svg
          className="w-5 h-5 text-purple-500 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
        <span className="font-medium text-purple-700">Entity Extraction</span>
        {!complete && (
          <span className="ml-2 text-purple-500">
            <span className="animate-pulse">•</span>
          </span>
        )}
      </div>
      {/* Use ReactMarkdown here */}
      <div className="text-gray-700">
        <Remark rehypeReactOptions={{ components: remarkComponents }}>
          {content}
        </Remark>
      </div>
    </div>
  );
};

/**
 * FinalBlock component renders a final section (highlighted differently)
 */
export const FinalBlock = ({ content, complete }) => {
  return (
    <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded my-2">
      <div className="flex items-center mb-1">
        <svg
          className="w-5 h-5 text-blue-500 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M5 13l4 4L19 7"
          ></path>
        </svg>
        <span className="font-medium text-blue-700">Final Answer</span>
        {!complete && (
          <span className="ml-2 text-blue-500">
            <span className="animate-pulse">•</span>
          </span>
        )}
      </div>
      {/* Use ReactMarkdown here */}
      <div className="text-gray-700">
        <Remark rehypeReactOptions={{ components: remarkComponents }}>
          {content}
        </Remark>
      </div>
    </div>
  );
};

/**
 * SectionRenderer component handles rendering different section types
 */
export const SectionRenderer = ({ section }) => {
  switch (section.type) {
    case "summary":
      return (
        <SummaryBlock content={section.content} complete={section.complete} />
      );
    case "entity":
      return (
        <EntityBlock content={section.content} oncomplete={section.complete} />
      );
    case "final":
      return (
        <FinalBlock content={section.content} complete={section.complete} />
      );
    case "text":
    default:
      // Use ReactMarkdown here
      return (
        <div className="text-gray-700">
          <Remark rehypeReactOptions={{ components: remarkComponents }}>
            {section.content}
          </Remark>
        </div>
      );
  }
};
