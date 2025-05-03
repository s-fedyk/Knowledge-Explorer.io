import { useState, useEffect } from "react";

/**
 * FileViewer component for rendering different types of files
 * @param {Object} props - Component props
 * @param {Object} props.file - File object with type and content
 */
const FileViewer = ({ file }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Reset states when file changes
    setLoading(true);
    setError(null);

    // Simulate loading the file content
    setTimeout(() => {
      if (file && file.content) {
        setLoading(false);
      } else {
        setError("Failed to load file content");
        setLoading(false);
      }
    }, 500);
  }, [file]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg
            className="animate-spin h-10 w-10 text-blue-500 mx-auto mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="text-gray-600">Loading file...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center text-red-500">
          <svg
            className="w-12 h-12 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Render based on file type
  switch (file.type) {
    case "pdf":
      return <PDFViewer file={file} />;
    case "text":
      return <TextViewer file={file} />;
    default:
      return <GenericFileViewer file={file} />;
  }
};

// PDF Viewer component
const PDFViewer = ({ file }) => {
  return (
    <div className="h-full flex flex-col bg-gray-900 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-white">{file.name}</h2>
        <div className="flex space-x-2">
          <button className="bg-gray-800 text-white p-2 rounded hover:bg-gray-700">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button className="bg-gray-800 text-white p-2 rounded hover:bg-gray-700">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>
      <div className="flex-grow bg-white rounded-lg overflow-hidden">
        <iframe
          src={file.url || `data:application/pdf;base64,${file.content}`}
          className="w-full h-full"
          title={file.name}
        />
      </div>
    </div>
  );
};

// Text Viewer component
const TextViewer = ({ file }) => {
  return (
    <div className="h-full flex flex-col bg-gray-50 p-4">
      <h2 className="text-lg font-medium mb-4">{file.name}</h2>
      <div className="flex-grow bg-white rounded-lg shadow p-4 overflow-auto">
        <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800">
          {file.content}
        </pre>
      </div>
    </div>
  );
};

// Generic File Viewer component
const GenericFileViewer = ({ file }) => {
  return (
    <div className="h-full flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <svg
          className="w-16 h-16 mx-auto mb-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="text-lg font-medium mb-2">{file.name}</h3>
        <p className="text-gray-500">
          This file type is not currently supported for preview.
        </p>
      </div>
    </div>
  );
};

export default FileViewer;
