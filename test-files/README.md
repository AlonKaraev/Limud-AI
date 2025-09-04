
# Enhanced OCR Test Files

To fully test the enhanced OCR functionality, place the following files in this directory:

1. **sample-presentation.pptx** - A PowerPoint presentation with images containing text
2. **sample-document.pdf** - A PDF document with images or scanned pages
3. **sample-document.docx** - A Word document with embedded images containing text
4. **sample-image.png** - A standalone image with text (Hebrew and/or English)

## Test Features

The enhanced OCR system now supports:

✅ **PowerPoint (.pptx) files:**
- Extracts text from slides
- Processes images within slides using OCR
- Supports Hebrew and English text recognition
- Provides detailed progress tracking

✅ **PDF files:**
- Standard PDF text extraction
- OCR processing for image-based PDFs
- Page-by-page OCR analysis
- Combines standard and OCR text

✅ **Word (.docx) files:**
- Standard text extraction
- OCR processing for embedded images
- Maintains document structure
- Enhanced metadata reporting

✅ **Direct image processing:**
- Hebrew and English OCR
- Enhanced text post-processing
- Word-level confidence scoring
- Detailed extraction metadata

## Running Tests

Run this test file with: `node test-enhanced-ocr-extraction.js`

The tests will verify:
- OCR functionality for each document type
- Error handling and edge cases
- Text enhancement and post-processing
- Progress tracking and metadata reporting
