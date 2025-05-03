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
    <div className="p-30">
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
      />
    </div>
  );
};

export default FileView;
