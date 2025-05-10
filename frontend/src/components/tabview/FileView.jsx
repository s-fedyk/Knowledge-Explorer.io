import { Document, Page } from "react-pdf";
/**
 * FileViewer component for rendering different types of files
 * @param {Object} props - Component props
 * @param {Object} props.file - File object with type and content
 */
const FileView = ({ file }) => {
  console.log("rendering", file);

  return file ? (
    <Document file={file.uri}>
      <Page pageNumber={1} />
    </Document>
  ) : (
    <p>abc</p>
  );
};

export default FileView;
