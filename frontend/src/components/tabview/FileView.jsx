import { Document, Page } from "react-pdf";
import { useState } from "react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

/**
 * FileViewer component for rendering different types of files
 * @param {Object} props - Component props
 * @param {Object} props.file - File object with type and content
 */
const FileView = ({ file }) => {
  const [loading, setLoading] = useState(true);

  // Function to handle successful loading of document
  const onDocumentLoadSuccess = () => {
    setLoading(false);
  };

  // Function to handle document loading error
  const onDocumentLoadError = (error) => {
    console.error("Error loading PDF:", error);
    setLoading(false);
  };

  return file ? (
    <div className="flex justify-center items-center bg-gray-100 p-4 overflow-auto">
      {file.pages.map((uri, index) => (
        <div key={index} className="p-4">
          {/* Placeholder that shows while loading */}
          {loading && (
            <div
              className="bg-white border border-gray-400 shadow-md flex justify-center items-center"
              style={{ width: "500px", height: "700px" }} // Fixed height based on typical PDF aspect ratio
            >
              <div className="animate-pulse text-gray-400">Loading...</div>
            </div>
          )}

          <Document
            file={uri}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading=""
          >
            <Page
              pageNumber={1}
              className="bg-white border border-gray-400 shadow-md"
              width={500}
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
          </Document>
        </div>
      ))}
    </div>
  ) : (
    <div className="flex justify-center items-center h-full bg-gray-100">
      <p className="text-gray-500">No file selected</p>
    </div>
  );
};

export default FileView;
