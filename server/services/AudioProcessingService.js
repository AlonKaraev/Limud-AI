const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

// Try to set ffmpeg path from different sources
let ffmpegAvailable = false;
try {
  const ffmpegStatic = require('ffmpeg-static');
  ffmpeg.setFfmpegPath(ffmpegStatic);
  ffmpegAvailable = true;
  console.log('Using ffmpeg-static');
} catch (error) {
  try {
    const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
    ffmpegAvailable = true;
    console.log('Using @ffmpeg-installer/ffmpeg');
  } catch (installerError) {
    try {
      const ffmpegWin32 = require('@ffmpeg-installer/win32-x64');
      ffmpeg.setFfmpegPath(ffmpegWin32.path);
      ffmpegAvailable = true;
      console.log('Using @ffmpeg-installer/win32-x64');
    } catch (win32Error) {
      console.warn('FFmpeg not found via npm packages, using system PATH');
      ffmpegAvailable = false;
    }
  }
}

// Test FFmpeg availability
if (!ffmpegAvailable) {
  try {
    // Test if ffprobe is available
    ffmpeg.ffprobe(__filename, (err) => {
      if (err) {
        console.warn('⚠️  FFmpeg/ffprobe not available, switching to fallback mode');
        // Export fallback service instead
        const fallbackService = require('./AudioProcessingService.fallback');
        module.exports = fallbackService;
        return;
      } else {
        ffmpegAvailable = true;
        console.log('✅ FFmpeg available via system PATH');
      }
    });
  } catch (testError) {
    console.warn('⚠️  FFmpeg test failed, switching to fallback mode');
    const fallbackService = require('./AudioProcessingService.fallback');
    module.exports = fallbackService;
    return;
  }
}

/**
 * Enhanced Audio Processing Service
 * Handles lossless compression and audio segmentation for improved transcription
 */
class AudioProcessingService {
  constructor() {
    this.tempDir = path.join(__dirname, '../uploads/temp');
    this.segmentsDir = path.join(__dirname, '../uploads/segments');
    this.compressedDir = path.join(__dirname, '../uploads/compressed');
    
    // Ensure directories exist
    this.ensureDirectories();
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
   * Apply lossless compression to audio file
   * @param {string} inputPath - Path to input audio file
   * @param {string} outputPath - Path for compressed output file
   * @returns {Promise<Object>} Compression result with file info
   */
  async applyLosslessCompression(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      // Get original file stats
      const originalStats = fs.statSync(inputPath);
      const originalSize = originalStats.size;
      
      console.log(`Starting lossless compression for: ${path.basename(inputPath)} (${Math.round(originalSize / 1024 / 1024)}MB)`);
      
      ffmpeg(inputPath)
        .audioCodec('flac') // FLAC for lossless compression
        .audioFrequency(16000) // Optimize for speech recognition
        .audioChannels(1) // Mono for speech
        .audioBitrate('16k') // Optimize bitrate for speech
        .format('flac')
        .on('start', (commandLine) => {
          console.log('FFmpeg compression started:', commandLine);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`Compression progress: ${Math.round(progress.percent)}%`);
          }
        })
        .on('end', () => {
          try {
            const compressedStats = fs.statSync(outputPath);
            const compressedSize = compressedStats.size;
            const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
            const processingTime = Date.now() - startTime;
            
            console.log(`Compression completed in ${processingTime}ms`);
            console.log(`Size reduction: ${Math.round(originalSize / 1024 / 1024)}MB → ${Math.round(compressedSize / 1024 / 1024)}MB (${compressionRatio}% reduction)`);
            
            resolve({
              success: true,
              originalSize,
              compressedSize,
              compressionRatio: parseFloat(compressionRatio),
              processingTime,
              outputPath
            });
          } catch (error) {
            reject(new Error(`Error reading compressed file stats: ${error.message}`));
          }
        })
        .on('error', (error) => {
          console.error('FFmpeg compression error:', error);
          reject(new Error(`Compression failed: ${error.message}`));
        })
        .save(outputPath);
    });
  }

  /**
   * Split audio file into 30-second segments with overlap
   * @param {string} inputPath - Path to input audio file
   * @param {string} outputDir - Directory for output segments
   * @param {number} segmentDuration - Duration of each segment in seconds (default: 30)
   * @param {number} overlapDuration - Overlap between segments in seconds (default: 2)
   * @returns {Promise<Array>} Array of segment file paths
   */
  async segmentAudio(inputPath, outputDir, segmentDuration = 30, overlapDuration = 2) {
    return new Promise((resolve, reject) => {
      const segments = [];
      const baseFilename = path.basename(inputPath, path.extname(inputPath));
      
      console.log(`Starting audio segmentation: ${segmentDuration}s segments with ${overlapDuration}s overlap`);
      
      // First, get audio duration
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          return reject(new Error(`Error reading audio metadata: ${err.message}`));
        }
        
        const totalDuration = metadata.format.duration;
        console.log(`Total audio duration: ${Math.round(totalDuration)}s`);
        
        // Calculate segment positions
        const segmentPositions = this.calculateSegmentPositions(totalDuration, segmentDuration, overlapDuration);
        console.log(`Creating ${segmentPositions.length} segments`);
        
        // Process segments sequentially
        this.processSegmentsSequentially(inputPath, outputDir, baseFilename, segmentPositions, 0, segments)
          .then(() => {
            console.log(`Audio segmentation completed: ${segments.length} segments created`);
            resolve(segments);
          })
          .catch(reject);
      });
    });
  }

  /**
   * Calculate segment positions with overlap
   * @param {number} totalDuration - Total audio duration
   * @param {number} segmentDuration - Duration of each segment
   * @param {number} overlapDuration - Overlap between segments
   * @returns {Array} Array of segment positions {start, duration, index}
   */
  calculateSegmentPositions(totalDuration, segmentDuration, overlapDuration) {
    const positions = [];
    let currentStart = 0;
    let segmentIndex = 0;
    
    while (currentStart < totalDuration) {
      const remainingDuration = totalDuration - currentStart;
      const actualDuration = Math.min(segmentDuration, remainingDuration);
      
      positions.push({
        start: currentStart,
        duration: actualDuration,
        index: segmentIndex
      });
      
      // Move to next segment position (with overlap consideration)
      currentStart += segmentDuration - overlapDuration;
      segmentIndex++;
      
      // If the remaining time is less than half a segment, include it in the last segment
      if (remainingDuration <= segmentDuration * 1.5) {
        break;
      }
    }
    
    return positions;
  }

  /**
   * Process audio segments sequentially
   * @param {string} inputPath - Input audio file path
   * @param {string} outputDir - Output directory
   * @param {string} baseFilename - Base filename for segments
   * @param {Array} segmentPositions - Array of segment positions
   * @param {number} currentIndex - Current segment index
   * @param {Array} segments - Array to store segment paths
   * @returns {Promise} Promise that resolves when all segments are processed
   */
  async processSegmentsSequentially(inputPath, outputDir, baseFilename, segmentPositions, currentIndex, segments) {
    if (currentIndex >= segmentPositions.length) {
      return Promise.resolve();
    }
    
    const position = segmentPositions[currentIndex];
    const segmentFilename = `${baseFilename}_segment_${String(position.index).padStart(3, '0')}.flac`;
    const segmentPath = path.join(outputDir, segmentFilename);
    
    return new Promise((resolve, reject) => {
      console.log(`Processing segment ${position.index + 1}/${segmentPositions.length}: ${position.start}s-${position.start + position.duration}s`);
      
      ffmpeg(inputPath)
        .seekInput(position.start)
        .duration(position.duration)
        .audioCodec('flac')
        .audioFrequency(16000)
        .audioChannels(1)
        .format('flac')
        .on('end', () => {
          segments.push({
            path: segmentPath,
            filename: segmentFilename,
            index: position.index,
            startTime: position.start,
            duration: position.duration,
            endTime: position.start + position.duration
          });
          
          // Process next segment
          this.processSegmentsSequentially(inputPath, outputDir, baseFilename, segmentPositions, currentIndex + 1, segments)
            .then(resolve)
            .catch(reject);
        })
        .on('error', (error) => {
          console.error(`Error processing segment ${position.index}:`, error);
          reject(new Error(`Segment processing failed: ${error.message}`));
        })
        .save(segmentPath);
    });
  }

  /**
   * Process audio file with compression and segmentation
   * @param {string} inputPath - Path to input audio file
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async processAudioFile(inputPath, options = {}) {
    const {
      enableCompression = true,
      enableSegmentation = true,
      segmentDuration = 30,
      overlapDuration = 2,
      keepOriginal = true
    } = options;
    
    const startTime = Date.now();
    const baseFilename = path.basename(inputPath, path.extname(inputPath));
    const processingId = `${baseFilename}_${Date.now()}`;
    
    try {
      console.log(`Starting audio processing for: ${path.basename(inputPath)}`);
      
      let processedFilePath = inputPath;
      let compressionResult = null;
      
      // Step 1: Apply lossless compression if enabled
      if (enableCompression) {
        const compressedPath = path.join(this.compressedDir, `${processingId}_compressed.flac`);
        compressionResult = await this.applyLosslessCompression(inputPath, compressedPath);
        processedFilePath = compressedPath;
      }
      
      let segments = [];
      
      // Step 2: Create segments if enabled
      if (enableSegmentation) {
        const segmentDir = path.join(this.segmentsDir, processingId);
        await fs.promises.mkdir(segmentDir, { recursive: true });
        
        segments = await this.segmentAudio(processedFilePath, segmentDir, segmentDuration, overlapDuration);
      }
      
      const totalProcessingTime = Date.now() - startTime;
      
      console.log(`Audio processing completed in ${totalProcessingTime}ms`);
      
      return {
        success: true,
        processingId,
        originalPath: inputPath,
        processedPath: processedFilePath,
        compression: compressionResult,
        segments,
        processingTime: totalProcessingTime,
        options: {
          enableCompression,
          enableSegmentation,
          segmentDuration,
          overlapDuration
        }
      };
      
    } catch (error) {
      console.error('Audio processing error:', error);
      
      // Cleanup on error
      await this.cleanupProcessingFiles(processingId);
      
      throw new Error(`Audio processing failed: ${error.message}`);
    }
  }

  /**
   * Cleanup processing files
   * @param {string} processingId - Processing ID
   */
  async cleanupProcessingFiles(processingId) {
    try {
      // Remove compressed file
      const compressedPath = path.join(this.compressedDir, `${processingId}_compressed.flac`);
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
   * Get audio file information
   * @param {string} filePath - Path to audio file
   * @returns {Promise<Object>} Audio file information
   */
  async getAudioInfo(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          return reject(new Error(`Error reading audio metadata: ${err.message}`));
        }
        
        const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
        
        resolve({
          duration: metadata.format.duration,
          size: metadata.format.size,
          bitrate: metadata.format.bit_rate,
          format: metadata.format.format_name,
          codec: audioStream ? audioStream.codec_name : 'unknown',
          sampleRate: audioStream ? audioStream.sample_rate : null,
          channels: audioStream ? audioStream.channels : null
        });
      });
    });
  }

  /**
   * Validate audio file for processing
   * @param {string} filePath - Path to audio file
   * @returns {Promise<boolean>} Validation result
   */
  async validateAudioFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('Audio file not found');
      }
      
      const info = await this.getAudioInfo(filePath);
      
      // Check duration (minimum 1 second, maximum 10 hours)
      if (info.duration < 1 || info.duration > 36000) {
        throw new Error(`Invalid audio duration: ${info.duration}s`);
      }
      
      // Check if it's actually an audio file
      if (!info.codec || info.codec === 'unknown') {
        throw new Error('Invalid or corrupted audio file');
      }
      
      console.log(`Audio validation passed: ${Math.round(info.duration)}s, ${info.codec}, ${info.sampleRate}Hz`);
      return true;
      
    } catch (error) {
      throw new Error(`Audio validation failed: ${error.message}`);
    }
  }
}

module.exports = new AudioProcessingService();
