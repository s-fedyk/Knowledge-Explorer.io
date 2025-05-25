import React from "react";

export const remarkComponents = {
  ul: ({ children }) => (
    <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>
  ),
  li: ({ children }) => <li className="mb-1">{children}</li>,
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

export default remarkComponents;
