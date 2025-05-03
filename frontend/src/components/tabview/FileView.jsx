import { useState, useEffect } from "react";
import FileViewer from "react-file-viewer-extended";

/**
 * FileViewer component for rendering different types of files
 * @param {Object} props - Component props
 * @param {Object} props.file - File object with type and content
 */
const FileView = ({ file }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  return (
    <div className="w-full h-full border-2 border-gray-400 rounded overflow-auto relative">
      <FileViewer
        key={file.id}
        fileType={file.fileType}
        filePath={file.path}
        onLoad={() => setLoading(false)}
        onError={(e) => {
          console.error(e);
          setError(e);
          setLoading(false);
        }}
        // if the lib supports a style prop, uncomment this:
      />
    </div>
  );
};

export default FileView;
