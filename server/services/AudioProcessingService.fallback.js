const fs = require('fs');
const path = require('path');

/**
 * Fallback Audio Processing Service
 * Provides basic functionality when FFmpeg is not available
 * This version focuses on file management and basic audio processing without compression/segmentation
 */
class AudioProcessingServiceFallback {
  constructor() {
    this.tempDir = path.join(__dirname, '../uploads/temp');
    this.segmentsDir = path.join(__dirname, '../uploads/segments');
    this.compressedDir = path.join(__dirname, '../uploads/compressed');
    
    // Ensure directories exist
    this.ensureDirectories();
    
    console.warn('⚠️  AudioProcessingService running in fallback mode (FFmpeg not available)');
    console.warn('   Enhanced audio processing features are disabled');
    console.warn('   To enable full functionality, install FFmpeg and restart the application');
  }

  /**
   * Ensure required directories exist
   */
  async ensureDirectories() {
    const dirs = [this.tempDir, this.segmentsDir, this.compressedDir];
    for (const dir of dirs) {
      try {
        await fs.promises.mkdir(dir, { recursive: true });
      } catch (error) {
        console.error(`Error creating directory ${dir}:`, error);
      }
    }
  }

  /**
   * Fallback: Copy file instead of compression
   * @param {string} inputPath - Path to input audio file
   * @param {string} outputPath - Path for output file
   * @returns {Promise<Object>} Processing result
   */
  async applyLosslessCompression(inputPath, outputPath) {
    console.warn('⚠️  Compression not available (FFmpeg required)');
    console.log('📋 Copying file instead of compressing...');
    
    const startTime = Date.now();
    
    try {
      // Get original file stats
      const originalStats = fs.statSync(inputPath);
      const originalSize = originalStats.size;
      
      // Copy file instead of compressing
      await fs.promises.copyFile(inputPath, outputPath);
      
      const processingTime = Date.now() - startTime;
      
      console.log(`File copy completed in ${processingTime}ms`);
      console.log(`File size: ${Math.round(originalSize / 1024 / 1024)}MB (no compression applied)`);
      
      return {
        success: true,
        originalSize,
        compressedSize: originalSize, // Same size since no compression
        compressionRatio: 0, // No compression
        processingTime,
        outputPath,
        fallbackMode: true
      };
    } catch (error) {
      throw new Error(`File copy failed: ${error.message}`);
    }
  }

  /**
   * Fallback: Create mock segments without actual audio processing
   * @param {string} inputPath - Path to input audio file
   * @param {string} outputDir - Directory for output segments
   * @param {number} segmentDuration - Duration of each segment in seconds
   * @param {number} overlapDuration - Overlap between segments in seconds
   * @returns {Promise<Array>} Array of mock segment information
   */
  async segmentAudio(inputPath, outputDir, segmentDuration = 30, overlapDuration = 2) {
    console.warn('⚠️  Audio segmentation not available (FFmpeg required)');
    console.log('📋 Creating mock segment for fallback processing...');
    
    try {
      await fs.promises.mkdir(outputDir, { recursive: true });
      
      const baseFilename = path.basename(inputPath, path.extname(inputPath));
      const mockSegmentPath = path.join(outputDir, `${baseFilename}_segment_000.original`);
      
      // Copy original file as single "segment"
      await fs.promises.copyFile(inputPath, mockSegmentPath);
      
      // Return mock segment info
      const segments = [{
        path: mockSegmentPath,
        filename: `${baseFilename}_segment_000.original`,
        index: 0,
        startTime: 0,
        duration: segmentDuration, // Estimated
        endTime: segmentDuration,
        fallbackMode: true
      }];
      
      console.log(`Mock segmentation completed: 1 segment created (original file)`);
      return segments;
      
    } catch (error) {
      throw new Error(`Mock segmentation failed: ${error.message}`);
    }
  }

  /**
   * Process audio file in fallback mode
   * @param {string} inputPath - Path to input audio file
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async processAudioFile(inputPath, options = {}) {
    const {
      enableCompression = false, // Disabled in fallback mode
      enableSegmentation = false, // Disabled in fallback mode
      segmentDuration = 30,
      overlapDuration = 2
    } = options;
    
    const startTime = Date.now();
    const baseFilename = path.basename(inputPath, path.extname(inputPath));
    const processingId = `${baseFilename}_${Date.now()}_fallback`;
    
    try {
      console.log(`Starting fallback audio processing for: ${path.basename(inputPath)}`);
      console.warn('⚠️  Running in fallback mode - limited functionality');
      
      let processedFilePath = inputPath;
      let compressionResult = null;
      let segments = [];
      
      // Step 1: Mock compression (file copy)
      if (enableCompression) {
        const compressedPath = path.join(this.compressedDir, `${processingId}_copy.original`);
        compressionResult = await this.applyLosslessCompression(inputPath, compressedPath);
        processedFilePath = compressedPath;
      }
      
      // Step 2: Mock segmentation
      if (enableSegmentation) {
        const segmentDir = path.join(this.segmentsDir, processingId);
        segments = await this.segmentAudio(processedFilePath, segmentDir, segmentDuration, overlapDuration);
      }
      
      const totalProcessingTime = Date.now() - startTime;
      
      console.log(`Fallback audio processing completed in ${totalProcessingTime}ms`);
      
      return {
        success: true,
        processingId,
        originalPath: inputPath,
        processedPath: processedFilePath,
        compression: compressionResult,
        segments,
        processingTime: totalProcessingTime,
        fallbackMode: true,
        options: {
          enableCompression,
          enableSegmentation,
          segmentDuration,
          overlapDuration
        }
      };
      
    } catch (error) {
      console.error('Fallback audio processing error:', error);
      await this.cleanupProcessingFiles(processingId);
      throw new Error(`Fallback audio processing failed: ${error.message}`);
    }
  }

  /**
   * Cleanup processing files
   * @param {string} processingId - Processing ID
   */
  async cleanupProcessingFiles(processingId) {
    try {
      // Remove copied file
      const compressedPath = path.join(this.compressedDir, `${processingId}_copy.original`);
      if (fs.existsSync(compressedPath)) {
        await fs.promises.unlink(compressedPath);
      }
      
      // Remove segment directory
      const segmentDir = path.join(this.segmentsDir, processingId);
      if (fs.existsSync(segmentDir)) {
        await fs.promises.rmdir(segmentDir, { recursive: true });
      }
      
      console.log(`Cleanup completed for processing ID: ${processingId}`);
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  /**
   * Get basic audio file information (without FFmpeg)
   * @param {string} filePath - Path to audio file
   * @returns {Promise<Object>} Basic file information
   */
  async getAudioInfo(filePath) {
    try {
      const stats = fs.statSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      
      // Return basic file info without audio metadata
      return {
        duration: null, // Cannot determine without FFmpeg
        size: stats.size,
        bitrate: null, // Cannot determine without FFmpeg
        format: ext.substring(1), // File extension
        codec: 'unknown', // Cannot determine without FFmpeg
        sampleRate: null, // Cannot determine without FFmpeg
        channels: null, // Cannot determine without FFmpeg
        fallbackMode: true
      };
    } catch (error) {
      throw new Error(`Error reading file info: ${error.message}`);
    }
  }

  /**
   * Basic audio file validation (without FFmpeg)
   * @param {string} filePath - Path to audio file
   * @returns {Promise<boolean>} Validation result
   */
  async validateAudioFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('Audio file not found');
      }
      
      // Check file extension
      const ext = path.extname(filePath).toLowerCase();
      const supportedFormats = ['.mp3', '.wav', '.webm', '.m4a', '.ogg'];
      
      if (!supportedFormats.includes(ext)) {
        throw new Error(`Unsupported audio format: ${ext}. Supported formats: ${supportedFormats.join(', ')}`);
      }
      
      // Check file size
      const stats = fs.statSync(filePath);
      const fileSizeMB = stats.size / (1024 * 1024);
      const maxSizeMB = 100; // 100MB limit
      
      if (fileSizeMB > maxSizeMB) {
        throw new Error(`File too large: ${fileSizeMB.toFixed(1)}MB. Maximum size: ${maxSizeMB}MB`);
      }
      
      console.log(`Basic file validation passed: ${path.basename(filePath)} (${ext}, ${Math.round(fileSizeMB)}MB)`);
      console.warn('⚠️  Advanced audio validation requires FFmpeg');
      
      return true;
      
    } catch (error) {
      throw new Error(`File validation failed: ${error.message}`);
    }
  }
}

module.exports = new AudioProcessingServiceFallback();
