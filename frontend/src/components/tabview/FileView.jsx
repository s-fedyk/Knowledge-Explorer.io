import { Document, Page } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

/**
 * FileViewer component for rendering different types of files
 * @param {Object} props - Component props
 * @param {Object} props.file - File object with type and content
 */
const FileView = ({ file }) => {
  return file ? (
    <div className="flex justify-center items-center bg-gray-100 p-4 overflow-auto">
      <div className="h-full shadow-lg bg-gray-100">
        {file.pages.map((uri, index) => (
          <div key={index} className="p-4">
            <Document file={uri}>
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
    </div>
  ) : (
    <div className="flex justify-center items-center h-full bg-gray-100">
      <p className="text-gray-500">No file selected</p>
    </div>
  );
};

export default FileView;
