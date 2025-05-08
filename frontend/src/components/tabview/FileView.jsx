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

  console.log("file", file);

  return file ? (
    <div className="text-black bg-gray-100">
      <FileViewer
        key={file.id}
        filePath={file.path}
        onLoad={() => setLoading(false)}
        onError={(e) => {
          console.error(e);
          setError(e);
          setLoading(false);
        }}
      />
    </div>
  ) : (
    <p>abc</p>
  );
};

export default FileView;
