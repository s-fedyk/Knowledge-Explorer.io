// File: components/chat/MessageBlocks.jsx
import React from "react";

/**
 * SummaryBlock component renders a summary section
 */
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
      <div className="text-gray-700 whitespace-pre-wrap">{content}</div>
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
      <div className="text-gray-700 whitespace-pre-wrap">{content}</div>
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
    case "final":
      return (
        <FinalBlock content={section.content} complete={section.complete} />
      );
    case "text":
    default:
      return <div className="whitespace-pre-wrap">{section.content}</div>;
  }
};
