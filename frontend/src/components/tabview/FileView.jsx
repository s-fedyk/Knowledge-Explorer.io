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
  const [numPages, setNumPages] = useState(null);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  return file ? (
    <div className="flex justify-center items-center bg-gray-100 p-4 overflow-auto">
      <div className="shadow-lg max-w-full ">
        <Document file={file.uri} onLoadSuccess={onDocumentLoadSuccess}>
          <Page
            pageNumber={1}
            className="bg-white"
            width={500}
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        </Document>
      </div>
    </div>
  ) : (
    <div className="flex justify-center items-center h-full bg-gray-100">
      <p className="text-gray-500">No file selected</p>
    </div>
  );
};

export default FileView;
