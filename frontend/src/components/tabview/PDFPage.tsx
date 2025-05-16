import { Document, Page } from "react-pdf";
import { useState } from "react";

const PDFPage = ({ uri, active }) => {
  const [loading, setLoading] = useState(true);

  if (!active) {
    return (
      <div
        className="bg-white border border-gray-400 shadow-md flex justify-center items-center"
        style={{ width: "500px", height: "700px" }}
      >
        <div className="text-gray-400">Scroll to view</div>
      </div>
    );
  }

  const handleLoadSuccess = () => {
    console.log("loaded?");
    setLoading(false);
  };

  const handleLoadError = (error) => {
    console.error("Error loading PDF:", error);
    setLoading(false);
  };

  return (
    <>
      {loading && (
        <div
          className="bg-white border border-gray-400 shadow-md flex justify-center items-center"
          style={{ width: "500px", height: "700px" }}
        >
          <div className="animate-pulse text-gray-400">Loading...</div>
        </div>
      )}

      <div style={{ display: loading ? "none" : "block" }}>
        <Document
          file={uri}
          onLoadSuccess={handleLoadSuccess}
          onLoadError={handleLoadError}
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
    </>
  );
};

export default PDFPage;
