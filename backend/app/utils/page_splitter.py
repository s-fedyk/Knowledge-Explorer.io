from pathlib import Path
import logging
from pypdf import PdfReader, PdfWriter
import tempfile
from typing import List

logger = logging.getLogger(__name__)


async def split_pdf_into_pages(file_path: Path) -> tuple[List[Path], Path]:
    temp_dir = Path(tempfile.mkdtemp())
    pages_info = []

    try:
        logger.info(f"Splitting PDF: {file_path} into individual pages")

        # Open the PDF file
        with open(file_path, 'rb') as pdf_file:
            pdf_reader = PdfReader(pdf_file)
            total_pages = len(pdf_reader.pages)
            logger.info(f"Total pages found: {total_pages}")

            # Process each page
            for page_idx in range(total_pages):
                page_number = page_idx + 1  # 1-based page number
                logger.debug(f"Processing page {page_number}/{total_pages}")

                # Create a new PDF writer for this single page
                pdf_writer = PdfWriter()

                # Get the page and add it to the writer
                page = pdf_reader.pages[page_idx]
                pdf_writer.add_page(page)

                # Generate a path for the page file
                page_file_path = temp_dir / f"page_{page_number}.pdf"

                # Write the single page to a new PDF file
                with open(page_file_path, 'wb') as output_pdf:
                    pdf_writer.write(output_pdf)

                pages_info.append(page_file_path)

                logger.debug(
                    f"Created page file: {page_number} {str(page_file_path)}"
                )

        logger.info(f"Successfully split PDF into {len(pages_info)} pages")
        return pages_info, temp_dir
    except Exception as e:
        logger.exception(f"Error splitting PDF into pages: {e}")
        raise
    finally:
        pass
