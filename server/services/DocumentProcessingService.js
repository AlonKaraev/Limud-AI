const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const Tesseract = require('tesseract.js');
const { run, query } = require('../config/database-sqlite');

/**
 * Document Processing Service
 * Handles text extraction from various document formats with caching and optimization
 */
class DocumentProcessingService {
  constructor() {
    // Cache for extracted text to avoid re-processing
    this.textCache = new Map();
    
    // Cache TTL (Time To Live) in milliseconds - 1 hour
    this.cacheTTL = 60 * 60 * 1000;
    
    this.supportedFormats = {
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/vnd.ms-powerpoint': 'ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
      'text/plain': 'txt',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif'
    };
  }

  /**
   * Extract text from a document
   * @param {Object} options - Extraction options
   * @param {string} options.filePath - Path to the document file
   * @param {string} options.mimeType - MIME type of the document
   * @param {string} options.fileName - Original filename
   * @param {number} options.documentId - Document ID in database
   * @param {number} options.userId - User ID
   * @param {number} options.jobId - Job ID for tracking
   * @returns {Promise<Object>} Extraction result
   */
  async extractText({ filePath, mimeType, fileName, documentId, userId, jobId }) {
    const startTime = Date.now();
    
    try {
      console.log(`Starting text extraction for document ${documentId}, type: ${mimeType}`);
      
      // Update job status to processing
      await this.updateJobStatus(jobId, 'processing', 10);
      
      let extractionResult;
      const format = this.supportedFormats[mimeType];
      
      if (!format) {
        throw new Error(`Unsupported document format: ${mimeType}`);
      }
      
      // Extract text based on format
      switch (format) {
        case 'pdf':
          extractionResult = await this.extractFromPDF(filePath, jobId);
          break;
        case 'docx':
          extractionResult = await this.extractFromDocxEnhanced(filePath, jobId);
          break;
        case 'doc':
          extractionResult = await this.extractFromDoc(filePath);
          break;
        case 'xlsx':
        case 'xls':
          extractionResult = await this.extractFromExcel(filePath);
          break;
        case 'pptx':
        case 'ppt':
          extractionResult = await this.extractFromPowerPoint(filePath, jobId);
          break;
        case 'txt':
          extractionResult = await this.extractFromText(filePath);
          break;
        case 'jpg':
        case 'png':
        case 'gif':
          extractionResult = await this.extractFromImage(filePath);
          break;
        default:
          throw new Error(`Extraction not implemented for format: ${format}`);
      }
      
      // Update job progress
      await this.updateJobStatus(jobId, 'processing', 80);
      
      // Detect language (simple heuristic)
      const language = this.detectLanguage(extractionResult.text);
      
      const processingDuration = Date.now() - startTime;
      
      // Save extraction result to database
      const extractionId = await this.saveExtractionResult({
        documentId,
        userId,
        jobId,
        extractedText: extractionResult.text,
        extractionMethod: extractionResult.method,
        confidenceScore: extractionResult.confidence || 0.9,
        languageDetected: language,
        processingDuration,
        extractionMetadata: extractionResult.metadata || {}
      });
      
      // Update job status to completed
      await this.updateJobStatus(jobId, 'completed', 100);
      
      console.log(`Text extraction completed for document ${documentId} in ${processingDuration}ms`);
      
      return {
        success: true,
        extractionId,
        text: extractionResult.text,
        method: extractionResult.method,
        confidence: extractionResult.confidence || 0.9,
        language,
        processingDuration,
        metadata: extractionResult.metadata || {}
      };
      
    } catch (error) {
      console.error(`Text extraction failed for document ${documentId}:`, error);
      
      // Update job status to failed
      await this.updateJobStatus(jobId, 'failed', 0, error.message);
      
      return {
        success: false,
        error: error.message,
        processingDuration: Date.now() - startTime
      };
    }
  }

  /**
   * Extract text from PDF file with enhanced OCR support for images
   */
  async extractFromPDF(filePath, jobId = null) {
    try {
      console.log(`Starting enhanced PDF text extraction for: ${filePath}`);
      
      if (jobId) {
        await this.updateJobStatus(jobId, 'processing', 15, null, 'Analyzing PDF structure...');
      }
      
      // First, try standard PDF text extraction
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);
      
      let extractedText = data.text || '';
      let ocrText = '';
      let imagesProcessed = 0;
      
      if (jobId) {
        await this.updateJobStatus(jobId, 'processing', 30, null, 'Extracting standard text...');
      }
      
      // If there's little or no text, or if we want to extract text from images, use OCR
      const shouldUseOCR = extractedText.trim().length < 100 || this.containsImages(data);
      
      if (shouldUseOCR) {
        if (jobId) {
          await this.updateJobStatus(jobId, 'processing', 40, null, 'Processing images with OCR...');
        }
        
        try {
          const ocrResult = await this.extractTextFromPDFImages(filePath, jobId);
          ocrText = ocrResult.text;
          imagesProcessed = ocrResult.imagesProcessed;
        } catch (ocrError) {
          console.warn('OCR processing failed for PDF:', ocrError);
          // Continue with standard text extraction
        }
      }
      
      // Combine standard text and OCR text
      let combinedText = extractedText;
      if (ocrText && ocrText.trim()) {
        if (combinedText.trim()) {
          combinedText += '\n\n[Text extracted from images:]\n' + ocrText;
        } else {
          combinedText = ocrText;
        }
      }
      
      if (jobId) {
        await this.updateJobStatus(jobId, 'processing', 80, null, 'Finalizing extraction...');
      }
      
      return {
        text: combinedText || 'No readable text content found in PDF.',
        method: shouldUseOCR ? 'pdf-parse-with-ocr' : 'pdf-parse',
        confidence: combinedText.trim() ? 0.95 : 0.1,
        metadata: {
          pages: data.numpages,
          info: data.info,
          standardTextLength: extractedText.length,
          ocrTextLength: ocrText.length,
          imagesProcessed: imagesProcessed,
          extractionMethod: shouldUseOCR ? 'Enhanced PDF with OCR' : 'Standard PDF parsing',
          note: shouldUseOCR ? 'Enhanced extraction with OCR for images' : 'Standard text extraction'
        }
      };
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  /**
   * Extract text from DOCX file
   */
  async extractFromDocx(filePath) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      
      return {
        text: result.value,
        method: 'mammoth',
        confidence: 0.98,
        metadata: {
          messages: result.messages
        }
      };
    } catch (error) {
      console.error('DOCX extraction error:', error);
      throw new Error(`Failed to extract text from DOCX: ${error.message}`);
    }
  }

  /**
   * Extract text from DOC file (legacy Word format)
   */
  async extractFromDoc(filePath) {
    try {
      // For DOC files, we'll try mammoth first, but it may not work perfectly
      const result = await mammoth.extractRawText({ path: filePath });
      
      return {
        text: result.value,
        method: 'mammoth-doc',
        confidence: 0.8, // Lower confidence for DOC files
        metadata: {
          messages: result.messages,
          note: 'DOC format may have limited extraction accuracy'
        }
      };
    } catch (error) {
      console.error('DOC extraction error:', error);
      throw new Error(`Failed to extract text from DOC: ${error.message}`);
    }
  }

  /**
   * Extract text from Excel file
   */
  async extractFromExcel(filePath) {
    try {
      const workbook = XLSX.readFile(filePath);
      let allText = '';
      
      // Extract text from all sheets
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const sheetText = XLSX.utils.sheet_to_txt(worksheet);
        allText += `Sheet: ${sheetName}\n${sheetText}\n\n`;
      });
      
      return {
        text: allText.trim(),
        method: 'xlsx',
        confidence: 0.95,
        metadata: {
          sheets: workbook.SheetNames,
          sheetCount: workbook.SheetNames.length
        }
      };
    } catch (error) {
      console.error('Excel extraction error:', error);
      throw new Error(`Failed to extract text from Excel: ${error.message}`);
    }
  }

  /**
   * Extract text from PowerPoint file with enhanced text extraction and OCR for images
   */
  async extractFromPowerPoint(filePath, jobId = null) {
    try {
      console.log(`Starting enhanced PowerPoint text extraction for: ${filePath}`);
      
      if (jobId) {
        await this.updateJobStatus(jobId, 'processing', 15, null, 'Analyzing PowerPoint structure...');
      }
      
      const path = require('path');
      const fileExtension = path.extname(filePath).toLowerCase();
      
      if (fileExtension === '.pptx') {
        return await this.extractFromPPTXEnhanced(filePath, jobId);
      } else if (fileExtension === '.ppt') {
        return await this.extractFromPPTLegacy(filePath, jobId);
      } else {
        throw new Error(`Unsupported PowerPoint format: ${fileExtension}`);
      }
    } catch (error) {
      console.error('PowerPoint extraction error:', error);
      throw new Error(`Failed to extract text from PowerPoint: ${error.message}`);
    }
  }

  /**
   * Enhanced PPTX text extraction with OCR support for images
   */
  async extractFromPPTXEnhanced(filePath, jobId = null) {
    try {
      const JSZip = require('jszip');
      const xml2js = require('xml2js');
      const path = require('path');
      const os = require('os');
      
      if (jobId) {
        await this.updateJobStatus(jobId, 'processing', 20, null, 'Reading PowerPoint file...');
      }
      
      // Read the PPTX file as a ZIP archive
      const buffer = await fs.readFile(filePath);
      const zip = await JSZip.loadAsync(buffer);
      
      if (jobId) {
        await this.updateJobStatus(jobId, 'processing', 30, null, 'Analyzing slides structure...');
      }
      
      let extractedText = '';
      let slideCount = 0;
      let imagesProcessed = 0;
      const slideTexts = [];
      
      // Get slide files sorted by slide number
      const slideFiles = Object.keys(zip.files)
        .filter(filename => filename.startsWith('ppt/slides/slide') && filename.endsWith('.xml'))
        .sort((a, b) => {
          const numA = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || '0');
          const numB = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || '0');
          return numA - numB;
        });
      
      slideCount = slideFiles.length;
      
      // Process each slide
      for (let i = 0; i < slideFiles.length; i++) {
        const slideFile = slideFiles[i];
        const slideNumber = i + 1;
        
        if (jobId) {
          const progress = 30 + Math.round((i / slideFiles.length) * 40);
          await this.updateJobStatus(jobId, 'processing', progress, null, `Processing slide ${slideNumber}/${slideCount}...`);
        }
        
        try {
          const slideXml = await zip.files[slideFile].async('string');
          const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
          const slideData = await parser.parseStringPromise(slideXml);
          
          // Extract text content from slide
          const slideTextContent = this.extractTextFromSlideXMLEnhanced(slideData);
          
          // Extract image references and process them with OCR
          const imageTexts = await this.extractImagesFromSlide(zip, slideFile, slideData, jobId);
          imagesProcessed += imageTexts.length;
          
          // Combine text and image OCR results
          let combinedSlideText = slideTextContent;
          if (imageTexts.length > 0) {
            combinedSlideText += '\n\n[Images in slide contain:]';
            imageTexts.forEach((imgText, idx) => {
              if (imgText.trim()) {
                combinedSlideText += `\n• Image ${idx + 1}: ${imgText}`;
              }
            });
          }
          
          if (combinedSlideText.trim()) {
            slideTexts.push({
              slideNumber,
              text: combinedSlideText.trim()
            });
          }
          
        } catch (slideError) {
          console.warn(`Error processing slide ${slideNumber}:`, slideError);
          slideTexts.push({
            slideNumber,
            text: `[Error processing slide ${slideNumber}: ${slideError.message}]`
          });
        }
      }
      
      // Format final output
      if (slideTexts.length > 0) {
        extractedText = slideTexts
          .map(slide => `Slide ${slide.slideNumber}:\n${slide.text}`)
          .join('\n\n');
      }
      
      if (jobId) {
        await this.updateJobStatus(jobId, 'processing', 85, null, 'Finalizing extraction...');
      }
      
      return {
        text: extractedText.trim() || 'No readable text content found in PowerPoint slides.',
        method: 'pptx-enhanced-extraction',
        confidence: extractedText.trim() ? 0.9 : 0.1,
        metadata: {
          slideCount: slideCount,
          imagesProcessed: imagesProcessed,
          extractionMethod: 'Enhanced PPTX with OCR',
          slidesWithContent: slideTexts.length,
          note: 'Enhanced extraction with OCR for images'
        }
      };
      
    } catch (error) {
      console.error('Enhanced PPTX extraction error:', error);
      // Fallback to basic extraction
      return await this.extractFromPPTXBasic(filePath);
    }
  }

  /**
   * Handle legacy PPT files
   */
  async extractFromPPTLegacy(filePath, jobId = null) {
    if (jobId) {
      await this.updateJobStatus(jobId, 'processing', 20, null, 'Processing legacy PowerPoint format...');
    }
    
    return {
      text: `Legacy PowerPoint (.ppt) format detected. 

For optimal text extraction, please:
1. Open the file in PowerPoint
2. Save as .pptx format (File → Save As → PowerPoint Presentation)
3. Re-upload the .pptx file

Alternatively, you can:
- Export to PDF format for reliable text extraction
- Copy and paste the content into a Word document

This will ensure all text content, including text within images, can be properly extracted.`,
      method: 'ppt-legacy-guidance',
      confidence: 0.0,
      metadata: {
        fileType: 'ppt',
        note: 'Legacy PPT format requires conversion',
        recommendations: [
          'Convert to PPTX format',
          'Export to PDF',
          'Copy content to Word document'
        ]
      }
    };
  }

  /**
   * Enhanced text extraction from slide XML with better parsing
   */
  extractTextFromSlideXMLEnhanced(slideData) {
    const textElements = [];
    
    const extractTextRecursive = (obj, path = '') => {
      if (typeof obj === 'string' && obj.trim().length > 0) {
        // Filter out XML artifacts and schema URLs
        if (!obj.includes('http://schemas.') && 
            !obj.includes('xmlns') && 
            !obj.match(/^[0-9\-]+$/) &&
            obj.length > 1) {
          textElements.push(obj.trim());
        }
        return;
      }
      
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => extractTextRecursive(item, `${path}[${index}]`));
        return;
      }
      
      if (typeof obj === 'object' && obj !== null) {
        // Look for specific text elements in PowerPoint XML
        if (obj['a:t']) {
          const textContent = Array.isArray(obj['a:t']) ? obj['a:t'].join(' ') : obj['a:t'];
          if (textContent && textContent.trim()) {
            textElements.push(textContent.trim());
          }
        }
        
        // Handle text runs
        if (obj['a:r']) {
          const runs = Array.isArray(obj['a:r']) ? obj['a:r'] : [obj['a:r']];
          runs.forEach(run => {
            if (run['a:t']) {
              const runText = Array.isArray(run['a:t']) ? run['a:t'].join(' ') : run['a:t'];
              if (runText && runText.trim()) {
                textElements.push(runText.trim());
              }
            }
          });
        }
        
        // Handle paragraphs
        if (obj['a:p']) {
          const paragraphs = Array.isArray(obj['a:p']) ? obj['a:p'] : [obj['a:p']];
          paragraphs.forEach(para => extractTextRecursive(para, `${path}.a:p`));
        }
        
        // Recursively process other elements
        Object.keys(obj).forEach(key => {
          if (key !== 'a:t' && key !== 'a:r' && key !== 'a:p') {
            extractTextRecursive(obj[key], `${path}.${key}`);
          }
        });
      }
    };
    
    extractTextRecursive(slideData);
    
    // Clean and format the extracted text
    const cleanedTexts = textElements
      .filter(text => text && text.trim().length > 0)
      .map(text => text.replace(/\s+/g, ' ').trim())
      .filter(text => text.length > 1)
      // Remove duplicates while preserving order
      .filter((text, index, array) => array.indexOf(text) === index);
    
    return cleanedTexts.join('\n');
  }

  /**
   * Extract and process images from slides using OCR
   */
  async extractImagesFromSlide(zip, slideFile, slideData, jobId = null) {
    const imageTexts = [];
    const path = require('path');
    const os = require('os');
    
    try {
      // Find image references in the slide
      const imageRefs = this.findImageReferences(slideData);
      
      if (imageRefs.length === 0) {
        return imageTexts;
      }
      
      // Get slide relationships to map image IDs to files
      const slideNumber = slideFile.match(/slide(\d+)\.xml/)?.[1];
      const relsFile = `ppt/slides/_rels/slide${slideNumber}.xml.rels`;
      
      if (!zip.files[relsFile]) {
        return imageTexts;
      }
      
      const relsXml = await zip.files[relsFile].async('string');
      const xml2js = require('xml2js');
      const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
      const relsData = await parser.parseStringPromise(relsXml);
      
      // Process each image reference
      for (const imageRef of imageRefs) {
        try {
          // Find the actual image file path
          const relationship = this.findRelationship(relsData, imageRef);
          if (!relationship) continue;
          
          const imagePath = `ppt/slides/${relationship.Target}`;
          if (!zip.files[imagePath]) continue;
          
          // Extract image to temporary file
          const imageBuffer = await zip.files[imagePath].async('nodebuffer');
          const tempImagePath = path.join(os.tmpdir(), `slide_image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`);
          
          await fs.writeFile(tempImagePath, imageBuffer);
          
          // Perform OCR on the image
          const ocrResult = await this.extractFromImage(tempImagePath, jobId);
          if (ocrResult.text && ocrResult.text.trim()) {
            imageTexts.push(ocrResult.text.trim());
          }
          
          // Clean up temporary file
          try {
            await fs.unlink(tempImagePath);
          } catch (unlinkError) {
            console.warn('Failed to delete temporary image file:', unlinkError);
          }
          
        } catch (imageError) {
          console.warn('Error processing image in slide:', imageError);
        }
      }
      
    } catch (error) {
      console.warn('Error extracting images from slide:', error);
    }
    
    return imageTexts;
  }

  /**
   * Find image references in slide XML data
   */
  findImageReferences(slideData) {
    const imageRefs = [];
    
    const findRefsRecursive = (obj) => {
      if (typeof obj === 'object' && obj !== null) {
        // Look for image references
        if (obj['r:embed']) {
          imageRefs.push(obj['r:embed']);
        }
        
        if (obj['r:link']) {
          imageRefs.push(obj['r:link']);
        }
        
        // Recursively search
        if (Array.isArray(obj)) {
          obj.forEach(findRefsRecursive);
        } else {
          Object.values(obj).forEach(findRefsRecursive);
        }
      }
    };
    
    findRefsRecursive(slideData);
    return [...new Set(imageRefs)]; // Remove duplicates
  }

  /**
   * Find relationship target for image reference
   */
  findRelationship(relsData, refId) {
    if (!relsData.Relationships || !relsData.Relationships.Relationship) {
      return null;
    }
    
    const relationships = Array.isArray(relsData.Relationships.Relationship) 
      ? relsData.Relationships.Relationship 
      : [relsData.Relationships.Relationship];
    
    return relationships.find(rel => rel.Id === refId);
  }

  /**
   * Fallback basic PPTX extraction
   */
  async extractFromPPTXBasic(filePath) {
    try {
      const buffer = await fs.readFile(filePath);
      return await this.extractFromPPTX(buffer);
    } catch (error) {
      console.error('Basic PPTX extraction failed:', error);
      return await this.extractPowerPointTextSearch(buffer);
    }
  }

  /**
   * Basic PowerPoint text extraction using file analysis
   */
  async extractPowerPointBasic(filePath) {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      // Read the file as buffer
      const buffer = await fs.readFile(filePath);
      
      // For PPTX files (which are ZIP archives), we can try to extract text
      if (path.extname(filePath).toLowerCase() === '.pptx') {
        return await this.extractFromPPTX(buffer);
      } else {
        // For older PPT files, provide a more helpful message
        return {
          text: 'Legacy PowerPoint (.ppt) files require conversion to .pptx format for text extraction. Please save your presentation as .pptx or convert to PDF for better text extraction results.',
          method: 'ppt-legacy-notice',
          confidence: 0.0,
          metadata: {
            fileType: 'ppt',
            note: 'Legacy PPT format detected. Conversion to PPTX or PDF recommended.',
            recommendation: 'Save as .pptx or export to PDF for text extraction'
          }
        };
      }
    } catch (error) {
      console.error('Basic PowerPoint extraction error:', error);
      throw new Error(`Failed to extract text from PowerPoint: ${error.message}`);
    }
  }

  /**
   * Extract text from PPTX file (ZIP-based format)
   */
  async extractFromPPTX(buffer) {
    try {
      const JSZip = require('jszip');
      const xml2js = require('xml2js');
      
      const zip = await JSZip.loadAsync(buffer);
      let extractedText = '';
      let slideCount = 0;
      
      // Look for slide files in the ZIP
      const slideFiles = Object.keys(zip.files).filter(filename => 
        filename.startsWith('ppt/slides/slide') && filename.endsWith('.xml')
      );
      
      slideCount = slideFiles.length;
      
      for (const slideFile of slideFiles) {
        try {
          const slideXml = await zip.files[slideFile].async('string');
          const parser = new xml2js.Parser();
          const result = await parser.parseStringPromise(slideXml);
          
          // Extract text from the slide XML structure
          const slideText = this.extractTextFromSlideXML(result);
          if (slideText.trim()) {
            extractedText += `Slide ${slideFiles.indexOf(slideFile) + 1}:\n${slideText}\n\n`;
          }
        } catch (slideError) {
          console.warn(`Error processing slide ${slideFile}:`, slideError);
        }
      }
      
      return {
        text: extractedText.trim() || 'No text content found in PowerPoint slides.',
        method: 'pptx-zip-extraction',
        confidence: extractedText.trim() ? 0.8 : 0.1,
        metadata: {
          slideCount: slideCount,
          extractionMethod: 'ZIP/XML parsing',
          note: 'Extracted from PPTX ZIP structure'
        }
      };
    } catch (error) {
      // If ZIP extraction fails, try alternative methods
      console.warn('PPTX ZIP extraction failed, trying text search:', error);
      return await this.extractPowerPointTextSearch(buffer);
    }
  }

  /**
   * Extract text from slide XML structure
   */
  extractTextFromSlideXML(slideData) {
    let text = '';
    
    const extractTextRecursive = (obj) => {
      if (typeof obj === 'string') {
        return obj;
      }
      
      if (Array.isArray(obj)) {
        return obj.map(extractTextRecursive).join(' ');
      }
      
      if (typeof obj === 'object' && obj !== null) {
        // Look for text content in common PowerPoint XML elements
        if (obj['a:t']) {
          return Array.isArray(obj['a:t']) ? obj['a:t'].join(' ') : obj['a:t'];
        }
        
        if (obj['a:r'] && obj['a:r']['a:t']) {
          const textRuns = Array.isArray(obj['a:r']) ? obj['a:r'] : [obj['a:r']];
          return textRuns.map(run => run['a:t'] || '').join(' ');
        }
        
        // Recursively search through all properties
        return Object.values(obj).map(extractTextRecursive).join(' ');
      }
      
      return '';
    };
    
    text = extractTextRecursive(slideData);
    return text.replace(/\s+/g, ' ').trim();
  }

  /**
   * Fallback text extraction using binary search
   */
  async extractPowerPointTextSearch(buffer) {
    try {
      // Convert buffer to string and search for readable text
      const content = buffer.toString('utf8');
      
      // Use regex to find potential text content
      const textMatches = content.match(/[\x20-\x7E\u0590-\u05FF]{3,}/g) || [];
      
      // Filter and clean the matches
      const cleanedText = textMatches
        .filter(match => match.length > 3)
        .filter(match => !/^[0-9\.\-_]+$/.test(match)) // Remove pure numbers/symbols
        .filter(match => !match.includes('xml')) // Remove XML artifacts
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      return {
        text: cleanedText || 'Unable to extract readable text from PowerPoint file. Please try converting to PDF or PPTX format.',
        method: 'binary-text-search',
        confidence: cleanedText ? 0.4 : 0.0,
        metadata: {
          extractionMethod: 'Binary text search',
          note: 'Fallback extraction method used',
          recommendation: 'For better results, convert to PDF or ensure file is in PPTX format'
        }
      };
    } catch (error) {
      console.error('PowerPoint text search error:', error);
      return {
        text: 'PowerPoint text extraction failed. Please convert the file to PDF format for reliable text extraction.',
        method: 'extraction-failed',
        confidence: 0.0,
        metadata: {
          error: error.message,
          recommendation: 'Convert to PDF format for text extraction'
        }
      };
    }
  }

  /**
   * Extract text from plain text file
   */
  async extractFromText(filePath) {
    try {
      const text = await fs.readFile(filePath, 'utf8');
      
      return {
        text: text,
        method: 'direct',
        confidence: 1.0,
        metadata: {
          encoding: 'utf8',
          size: text.length
        }
      };
    } catch (error) {
      console.error('Text file extraction error:', error);
      throw new Error(`Failed to extract text from text file: ${error.message}`);
    }
  }

  /**
   * Extract text from image using OCR with enhanced progress tracking
   */
  async extractFromImage(filePath, jobId = null) {
    try {
      console.log(`Starting OCR for image: ${filePath}`);
      
      // Update job status to indicate OCR processing has started
      if (jobId) {
        await this.updateJobStatus(jobId, 'processing', 15, null, 'Initializing OCR engine...');
      }
      
      const { data: { text, confidence, words } } = await Tesseract.recognize(filePath, 'heb+eng', {
        logger: m => {
          if (m.status === 'recognizing text' && jobId) {
            const progress = Math.round(15 + (m.progress * 65)); // 15-80% for OCR
            this.updateJobStatus(jobId, 'processing', progress, null, `Extracting text: ${Math.round(m.progress * 100)}%`);
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          } else if (m.status === 'loading tesseract core' && jobId) {
            this.updateJobStatus(jobId, 'processing', 20, null, 'Loading OCR engine...');
          } else if (m.status === 'initializing tesseract' && jobId) {
            this.updateJobStatus(jobId, 'processing', 25, null, 'Initializing OCR...');
          } else if (m.status === 'loading language traineddata' && jobId) {
            this.updateJobStatus(jobId, 'processing', 30, null, 'Loading language models...');
          }
        }
      });
      
      // Enhanced text processing for better results
      const processedText = this.enhanceOCRText(text);
      
      // Calculate word-level confidence if available
      let wordConfidences = [];
      if (words && words.length > 0) {
        wordConfidences = words.map(word => ({
          text: word.text,
          confidence: word.confidence,
          bbox: word.bbox
        }));
      }
      
      return {
        text: processedText,
        method: 'tesseract-ocr-enhanced',
        confidence: confidence / 100, // Convert to 0-1 scale
        metadata: {
          languages: 'heb+eng',
          ocrEngine: 'tesseract',
          originalText: text,
          wordCount: processedText.split(/\s+/).length,
          wordConfidences: wordConfidences,
          imageProcessed: true,
          ocrSettings: {
            languages: 'heb+eng',
            engineMode: 'LSTM_ONLY',
            pageSegMode: 'AUTO'
          }
        }
      };
    } catch (error) {
      console.error('OCR extraction error:', error);
      
      // Provide more specific error messages for common OCR issues
      let errorMessage = error.message;
      if (error.message.includes('Invalid image')) {
        errorMessage = 'Invalid image format. Please ensure the image is in JPG, PNG, or GIF format.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error while downloading OCR models. Please check your internet connection.';
      } else if (error.message.includes('memory')) {
        errorMessage = 'Insufficient memory for OCR processing. The image may be too large.';
      }
      
      throw new Error(`Failed to extract text from image: ${errorMessage}`);
    }
  }

  /**
   * Enhance OCR text output with post-processing
   */
  enhanceOCRText(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      return '';
    }

    let processedText = rawText;

    // Remove excessive whitespace
    processedText = processedText.replace(/\s+/g, ' ');
    
    // Fix common OCR errors for Hebrew text
    processedText = processedText.replace(/[|]/g, 'ו'); // Common OCR mistake
    processedText = processedText.replace(/[`]/g, "'"); // Fix apostrophes
    
    // Remove isolated single characters that are likely OCR noise
    processedText = processedText.replace(/\b[^\w\u0590-\u05FF]\b/g, ' ');
    
    // Clean up multiple spaces again after processing
    processedText = processedText.replace(/\s+/g, ' ').trim();
    
    return processedText;
  }

  /**
   * Simple language detection
   */
  detectLanguage(text) {
    if (!text || text.length < 10) return 'unknown';
    
    // Count Hebrew characters
    const hebrewChars = (text.match(/[\u0590-\u05FF]/g) || []).length;
    const totalChars = text.replace(/\s/g, '').length;
    
    if (hebrewChars > totalChars * 0.3) {
      return 'hebrew';
    } else {
      return 'english';
    }
  }

  /**
   * Save extraction result to database
   */
  async saveExtractionResult({
    documentId,
    userId,
    jobId,
    extractedText,
    extractionMethod,
    confidenceScore,
    languageDetected,
    processingDuration,
    extractionMetadata
  }) {
    const result = await run(`
      INSERT INTO document_text_extractions (
        document_id, user_id, job_id, extracted_text, extraction_method,
        confidence_score, language_detected, processing_duration,
        extraction_metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [
      documentId,
      userId,
      jobId,
      extractedText,
      extractionMethod,
      confidenceScore,
      languageDetected,
      processingDuration,
      JSON.stringify(extractionMetadata)
    ]);

    return result.lastID;
  }

  /**
   * Update job status and progress
   */
  async updateJobStatus(jobId, status, progressPercent = 0, errorMessage = null, progressMessage = null) {
    const updateFields = ['status = ?', 'progress_percent = ?', 'updated_at = datetime(\'now\')'];
    const updateValues = [status, progressPercent];

    if (status === 'processing' && progressPercent === 10) {
      updateFields.push('started_at = datetime(\'now\')');
    }

    if (status === 'completed') {
      updateFields.push('completed_at = datetime(\'now\')');
    }

    if (errorMessage) {
      updateFields.push('error_message = ?');
      updateValues.push(errorMessage);
    }

    if (progressMessage) {
      updateFields.push('progress_message = ?');
      updateValues.push(progressMessage);
    }

    updateValues.push(jobId);

    await run(`
      UPDATE text_extraction_jobs 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, updateValues);
  }

  /**
   * Get extraction by document ID
   */
  async getExtractionByDocumentId(documentId, userId) {
    const result = await query(`
      SELECT * FROM document_text_extractions 
      WHERE document_id = ? AND user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `, [documentId, userId]);

    if (result.rows.length > 0) {
      const extraction = result.rows[0];
      extraction.extraction_metadata = JSON.parse(extraction.extraction_metadata || '{}');
      return extraction;
    }

    return null;
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId) {
    const result = await query(`
      SELECT * FROM text_extraction_jobs WHERE id = ?
    `, [jobId]);

    if (result.rows.length > 0) {
      const job = result.rows[0];
      job.processing_config = JSON.parse(job.processing_config || '{}');
      return job;
    }

    return null;
  }

  /**
   * Create extraction job
   */
  async createExtractionJob(documentId, userId, extractionMethod = 'auto') {
    const result = await run(`
      INSERT INTO text_extraction_jobs (
        document_id, user_id, job_type, status, extraction_method,
        processing_config, created_at, updated_at
      ) VALUES (?, ?, 'text_extraction', 'pending', ?, '{}', datetime('now'), datetime('now'))
    `, [documentId, userId, extractionMethod]);

    return result.lastID;
  }

  /**
   * Check if PDF contains images (heuristic)
   */
  containsImages(pdfData) {
    // Simple heuristic: if there's very little text but the PDF has pages, it might contain images
    const textLength = (pdfData.text || '').trim().length;
    const pageCount = pdfData.numpages || 0;
    
    // If there's less than 50 characters per page on average, likely contains images
    return pageCount > 0 && (textLength / pageCount) < 50;
  }

  /**
   * Extract text from PDF images using OCR
   */
  async extractTextFromPDFImages(filePath, jobId = null) {
    try {
      const pdf2pic = require('pdf2pic');
      const path = require('path');
      const os = require('os');
      
      console.log(`Starting PDF image OCR extraction for: ${filePath}`);
      
      if (jobId) {
        await this.updateJobStatus(jobId, 'processing', 45, null, 'Converting PDF pages to images...');
      }
      
      // Configure pdf2pic to convert PDF pages to images
      const convert = pdf2pic.fromPath(filePath, {
        density: 200, // DPI - higher for better OCR accuracy
        saveFilename: 'pdf_page',
        savePath: os.tmpdir(),
        format: 'png',
        width: 2000, // Max width for good OCR results
        height: 2000 // Max height for good OCR results
      });
      
      let allOcrText = '';
      let imagesProcessed = 0;
      
      try {
        // Convert all pages to images
        const results = await convert.bulk(-1, { responseType: 'image' });
        
        if (jobId) {
          await this.updateJobStatus(jobId, 'processing', 55, null, `Processing ${results.length} pages with OCR...`);
        }
        
        // Process each page image with OCR
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          
          if (jobId) {
            const progress = 55 + Math.round((i / results.length) * 20); // 55-75%
            await this.updateJobStatus(jobId, 'processing', progress, null, `OCR processing page ${i + 1}/${results.length}...`);
          }
          
          try {
            if (result.path) {
              // Perform OCR on the page image
              const ocrResult = await this.extractFromImage(result.path);
              
              if (ocrResult.text && ocrResult.text.trim()) {
                allOcrText += `\n\nPage ${i + 1}:\n${ocrResult.text.trim()}`;
                imagesProcessed++;
              }
              
              // Clean up temporary image file
              try {
                await fs.unlink(result.path);
              } catch (unlinkError) {
                console.warn('Failed to delete temporary PDF page image:', unlinkError);
              }
            }
          } catch (pageError) {
            console.warn(`Error processing PDF page ${i + 1}:`, pageError);
          }
        }
        
      } catch (conversionError) {
        console.error('PDF to image conversion failed:', conversionError);
        throw new Error(`Failed to convert PDF pages to images: ${conversionError.message}`);
      }
      
      return {
        text: allOcrText.trim(),
        imagesProcessed: imagesProcessed
      };
      
    } catch (error) {
      console.error('PDF image OCR extraction error:', error);
      throw new Error(`Failed to extract text from PDF images: ${error.message}`);
    }
  }

  /**
   * Enhanced DOCX extraction with OCR support for embedded images
   */
  async extractFromDocxEnhanced(filePath, jobId = null) {
    try {
      console.log(`Starting enhanced DOCX text extraction for: ${filePath}`);
      
      if (jobId) {
        await this.updateJobStatus(jobId, 'processing', 15, null, 'Analyzing Word document structure...');
      }
      
      // First, extract standard text
      const result = await mammoth.extractRawText({ path: filePath });
      let extractedText = result.value || '';
      
      if (jobId) {
        await this.updateJobStatus(jobId, 'processing', 40, null, 'Extracting standard text...');
      }
      
      // Try to extract images and process with OCR
      let ocrText = '';
      let imagesProcessed = 0;
      
      try {
        if (jobId) {
          await this.updateJobStatus(jobId, 'processing', 50, null, 'Processing embedded images with OCR...');
        }
        
        const imageResult = await this.extractImagesFromDocx(filePath, jobId);
        ocrText = imageResult.text;
        imagesProcessed = imageResult.imagesProcessed;
        
      } catch (imageError) {
        console.warn('Image extraction from DOCX failed:', imageError);
        // Continue with standard text extraction
      }
      
      // Combine standard text and OCR text
      let combinedText = extractedText;
      if (ocrText && ocrText.trim()) {
        if (combinedText.trim()) {
          combinedText += '\n\n[Text extracted from images:]\n' + ocrText;
        } else {
          combinedText = ocrText;
        }
      }
      
      if (jobId) {
        await this.updateJobStatus(jobId, 'processing', 80, null, 'Finalizing extraction...');
      }
      
      return {
        text: combinedText || 'No readable text content found in Word document.',
        method: imagesProcessed > 0 ? 'mammoth-with-ocr' : 'mammoth',
        confidence: combinedText.trim() ? 0.98 : 0.1,
        metadata: {
          messages: result.messages,
          standardTextLength: extractedText.length,
          ocrTextLength: ocrText.length,
          imagesProcessed: imagesProcessed,
          extractionMethod: imagesProcessed > 0 ? 'Enhanced DOCX with OCR' : 'Standard DOCX parsing',
          note: imagesProcessed > 0 ? 'Enhanced extraction with OCR for images' : 'Standard text extraction'
        }
      };
      
    } catch (error) {
      console.error('Enhanced DOCX extraction error:', error);
      // Fallback to standard extraction
      return await this.extractFromDocx(filePath);
    }
  }

  /**
   * Extract images from DOCX file and process with OCR
   */
  async extractImagesFromDocx(filePath, jobId = null) {
    try {
      const JSZip = require('jszip');
      const path = require('path');
      const os = require('os');
      
      // Read DOCX as ZIP archive
      const buffer = await fs.readFile(filePath);
      const zip = await JSZip.loadAsync(buffer);
      
      let allOcrText = '';
      let imagesProcessed = 0;
      
      // Find image files in the DOCX
      const imageFiles = Object.keys(zip.files).filter(filename => 
        filename.startsWith('word/media/') && 
        /\.(jpg|jpeg|png|gif)$/i.test(filename)
      );
      
      if (imageFiles.length === 0) {
        return { text: '', imagesProcessed: 0 };
      }
      
      // Process each image
      for (let i = 0; i < imageFiles.length; i++) {
        const imageFile = imageFiles[i];
        
        if (jobId) {
          const progress = 50 + Math.round((i / imageFiles.length) * 25); // 50-75%
          await this.updateJobStatus(jobId, 'processing', progress, null, `OCR processing image ${i + 1}/${imageFiles.length}...`);
        }
        
        try {
          // Extract image to temporary file
          const imageBuffer = await zip.files[imageFile].async('nodebuffer');
          const tempImagePath = path.join(os.tmpdir(), `docx_image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`);
          
          await fs.writeFile(tempImagePath, imageBuffer);
          
          // Perform OCR on the image
          const ocrResult = await this.extractFromImage(tempImagePath);
          
          if (ocrResult.text && ocrResult.text.trim()) {
            allOcrText += `\n\nImage ${i + 1}:\n${ocrResult.text.trim()}`;
            imagesProcessed++;
          }
          
          // Clean up temporary file
          try {
            await fs.unlink(tempImagePath);
          } catch (unlinkError) {
            console.warn('Failed to delete temporary DOCX image file:', unlinkError);
          }
          
        } catch (imageError) {
          console.warn(`Error processing DOCX image ${imageFile}:`, imageError);
        }
      }
      
      return {
        text: allOcrText.trim(),
        imagesProcessed: imagesProcessed
      };
      
    } catch (error) {
      console.error('DOCX image extraction error:', error);
      return { text: '', imagesProcessed: 0 };
    }
  }
}

module.exports = DocumentProcessingService;
