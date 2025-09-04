const fs = require('fs').promises;
const path = require('path');
const Tesseract = require('tesseract.js');
const { run, query } = require('../config/database-sqlite');

/**
 * Image Processing Service
 * Handles OCR text extraction from images with caching and optimization
 */
class ImageProcessingService {
  constructor() {
    // Cache for extracted text to avoid re-processing
    this.textCache = new Map();
    
    // Cache TTL (Time To Live) in milliseconds - 1 hour
    this.cacheTTL = 60 * 60 * 1000;
    
    this.supportedFormats = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/bmp': 'bmp',
      'image/tiff': 'tiff',
      'image/webp': 'webp'
    };
  }

  /**
   * Extract text from an image using OCR
   * @param {Object} options - Extraction options
   * @param {string} options.filePath - Path to the image file
   * @param {string} options.mimeType - MIME type of the image
   * @param {string} options.fileName - Original filename
   * @param {number} options.imageId - Image ID in database
   * @param {number} options.userId - User ID
   * @param {number} options.jobId - Job ID for tracking
   * @returns {Promise<Object>} Extraction result
   */
  async extractText({ filePath, mimeType, fileName, imageId, userId, jobId }) {
    const startTime = Date.now();
    
    try {
      console.log(`Starting OCR text extraction for image ${imageId}, type: ${mimeType}`);
      
      // Update job status to processing
      await this.updateJobStatus(jobId, 'processing', 10);
      
      const format = this.supportedFormats[mimeType];
      
      if (!format) {
        throw new Error(`Unsupported image format: ${mimeType}`);
      }
      
      // Check cache first
      const cacheKey = `${imageId}_${mimeType}`;
      if (this.textCache.has(cacheKey)) {
        const cached = this.textCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTTL) {
          console.log(`Using cached OCR result for image ${imageId}`);
          await this.updateJobStatus(jobId, 'completed', 100);
          return cached.result;
        } else {
          this.textCache.delete(cacheKey);
        }
      }
      
      // Extract text using OCR
      const extractionResult = await this.extractFromImage(filePath, jobId);
      
      // Update job progress
      await this.updateJobStatus(jobId, 'processing', 80);
      
      // Detect language (simple heuristic)
      const language = this.detectLanguage(extractionResult.text);
      
      const processingDuration = Date.now() - startTime;
      
      // Save extraction result to database
      const extractionId = await this.saveExtractionResult({
        imageId,
        userId,
        jobId,
        extractedText: extractionResult.text,
        extractionMethod: extractionResult.method,
        confidenceScore: extractionResult.confidence || 0.9,
        languageDetected: language,
        processingDuration,
        extractionMetadata: extractionResult.metadata || {}
      });
      
      const result = {
        success: true,
        extractionId,
        text: extractionResult.text,
        method: extractionResult.method,
        confidence: extractionResult.confidence || 0.9,
        language,
        processingDuration,
        metadata: extractionResult.metadata || {}
      };
      
      // Cache the result
      this.textCache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });
      
      // Update job status to completed
      await this.updateJobStatus(jobId, 'completed', 100);
      
      console.log(`OCR text extraction completed for image ${imageId} in ${processingDuration}ms`);
      
      return result;
      
    } catch (error) {
      console.error(`OCR text extraction failed for image ${imageId}:`, error);
      
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
          wordCount: processedText ? processedText.split(/\s+/).filter(word => word.length > 0).length : 0,
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
    imageId,
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
      INSERT INTO image_text_extractions (
        image_id, user_id, job_id, extracted_text, extraction_method,
        confidence_score, language_detected, processing_duration,
        extraction_metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [
      imageId,
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
      UPDATE image_text_extraction_jobs 
      SET ${updateFields.join(', ')}
      WHERE job_id = ?
    `, updateValues);
  }

  /**
   * Get extraction by image ID
   */
  async getExtractionByImageId(imageId, userId) {
    const result = await query(`
      SELECT * FROM image_text_extractions 
      WHERE image_id = ? AND user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `, [imageId, userId]);

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
      SELECT * FROM image_text_extraction_jobs WHERE job_id = ?
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
  async createExtractionJob(imageId, userId, extractionMethod = 'ocr') {
    const result = await run(`
      INSERT INTO image_text_extraction_jobs (
        image_id, user_id, job_type, status, extraction_method,
        processing_config, created_at, updated_at
      ) VALUES (?, ?, 'text_extraction', 'pending', ?, '{}', datetime('now'), datetime('now'))
    `, [imageId, userId, extractionMethod]);

    return result.lastID;
  }

  /**
   * Get image metadata and dimensions
   */
  async getImageMetadata(filePath) {
    try {
      const sharp = require('sharp');
      const metadata = await sharp(filePath).metadata();
      
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: metadata.size,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
        orientation: metadata.orientation
      };
    } catch (error) {
      console.warn('Failed to get image metadata with sharp, using fallback:', error);
      
      // Fallback to basic file stats
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        format: path.extname(filePath).toLowerCase().replace('.', ''),
        width: null,
        height: null,
        note: 'Basic metadata only - install sharp for full metadata'
      };
    }
  }

  /**
   * Compress image if needed
   */
  async compressImage(filePath, options = {}) {
    try {
      const sharp = require('sharp');
      const {
        quality = 80,
        maxWidth = 1920,
        maxHeight = 1080,
        format = 'jpeg'
      } = options;
      
      const outputPath = filePath.replace(/\.[^.]+$/, `_compressed.${format}`);
      
      await sharp(filePath)
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality })
        .toFile(outputPath);
      
      return outputPath;
    } catch (error) {
      console.warn('Image compression failed, using original:', error);
      return filePath;
    }
  }

  /**
   * Clear old cache entries
   */
  clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.textCache.entries()) {
      if (now - value.timestamp > this.cacheTTL) {
        this.textCache.delete(key);
      }
    }
  }
}

module.exports = ImageProcessingService;
