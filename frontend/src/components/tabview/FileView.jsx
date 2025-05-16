import { useState, useRef, useEffect } from "react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import PDFPage from "./PDFPage.tsx";

/**
 * FileViewer component for rendering different types of files
 * @param {Object} props - Component props
 * @param {Object} props.file - File object with type and content
 */
const FileView = ({ file }) => {
  const [activePages, setActivePages] = useState(
    file ? Array(file.pages.length).fill(false) : [],
  );
  const pageRefs = useRef([]);
  const [observer, setObserver] = useState(null);

  console.log("fileview");

  useEffect(() => {
    const new_observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = parseInt(entry.target.dataset.pageIndex);
          if (entry.isIntersecting && activePages[idx] === false) {
            setActivePages((prevActive) => {
              const newActive = [...prevActive];
              newActive[idx] = true;
              newActive[idx + 1] = true;

              return newActive;
            });
          }
        });
      },
      {
        rootMargin: "200px 0px",
        threshold: 0.1,
      },
    );
    setObserver(new_observer);
  }, [activePages]);

  const setPageRef = (element, idx) => {
    pageRefs.current[idx] = element;
    if (observer && element) {
      observer.observe(element);
    }
  };

  return file && observer ? (
    <div className="flex justify-center items-center bg-gray-100 p-4 overflow-auto">
      <div className="h-full">
        {file.pages.map((uri, index) => (
          <div
            key={index}
            className="p-4"
            ref={(el) => setPageRef(el, index)}
            data-page-index={index}
          >
            <PDFPage uri={uri} active={activePages[index]} />
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
