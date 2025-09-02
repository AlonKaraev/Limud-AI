const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;
const { query, run } = require('../config/database-sqlite');

// Try to set ffmpeg path from different sources (reusing existing logic)
let ffmpegAvailable = false;
try {
  const ffmpegStatic = require('ffmpeg-static');
  ffmpeg.setFfmpegPath(ffmpegStatic);
  ffmpegAvailable = true;
  console.log('VideoProcessingService: Using ffmpeg-static');
} catch (error) {
  try {
    const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
    ffmpegAvailable = true;
    console.log('VideoProcessingService: Using @ffmpeg-installer/ffmpeg');
  } catch (installerError) {
    try {
      const ffmpegWin32 = require('@ffmpeg-installer/win32-x64');
      ffmpeg.setFfmpegPath(ffmpegWin32.path);
      ffmpegAvailable = true;
      console.log('VideoProcessingService: Using @ffmpeg-installer/win32-x64');
    } catch (win32Error) {
      console.warn('VideoProcessingService: FFmpeg not found via npm packages, using system PATH');
      ffmpegAvailable = false;
    }
  }
}

// Test FFmpeg availability
if (!ffmpegAvailable) {
  try {
    ffmpeg.ffprobe(__filename, (err) => {
      if (err) {
        console.warn('VideoProcessingService: ⚠️ FFmpeg not available - video processing will be limited');
      } else {
        ffmpegAvailable = true;
        console.log('VideoProcessingService: ✅ FFmpeg available via system PATH');
      }
    });
  } catch (error) {
    console.warn('VideoProcessingService: ⚠️ FFmpeg test failed:', error.message);
  }
}

class VideoProcessingService {
  constructor() {
    this.supportedVideoFormats = ['.mp4', '.avi', '.mov', '.wmv', '.mkv', '.webm', '.flv', '.3gp'];
    this.maxFileSize = 200 * 1024 * 1024; // 200MB limit
    this.thumbnailSizes = {
      small: { width: 320, height: 180 },
      medium: { width: 640, height: 360 },
      large: { width: 1280, height: 720 }
    };
    this.thumbnailTimestamps = [0, 25, 50, 75]; // Percentages
    
    // Create directories
    this.initializeDirectories();
  }

  async initializeDirectories() {
    const dirs = [
      path.join(__dirname, '../uploads/videos'),
      path.join(__dirname, '../uploads/thumbnails'),
      path.join(__dirname, '../uploads/temp/video-processing')
    ];

    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        console.error(`Error creating directory ${dir}:`, error);
      }
    }
  }

  /**
   * Check if FFmpeg is available
   */
  isFFmpegAvailable() {
    return ffmpegAvailable;
  }

  /**
   * Validate video file format and size
   */
  validateVideoFile(filePath, fileSize, originalName) {
    const ext = path.extname(originalName || filePath).toLowerCase();
    
    if (!this.supportedVideoFormats.includes(ext)) {
      throw new Error(`פורמט וידאו לא נתמך: ${ext}. פורמטים נתמכים: ${this.supportedVideoFormats.join(', ')}`);
    }

    if (fileSize > this.maxFileSize) {
      const maxSizeMB = this.maxFileSize / (1024 * 1024);
      const fileSizeMB = fileSize / (1024 * 1024);
      throw new Error(`קובץ גדול מדי: ${fileSizeMB.toFixed(1)}MB. גודל מקסימלי: ${maxSizeMB}MB`);
    }

    return true;
  }

  /**
   * Extract comprehensive video metadata
   */
  async extractVideoMetadata(filePath) {
    if (!this.isFFmpegAvailable()) {
      throw new Error('FFmpeg לא זמין - לא ניתן לחלץ מטא-דאטה של וידאו');
    }

    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          console.error('Error extracting video metadata:', err);
          reject(new Error(`שגיאה בחילוץ מטא-דאטה: ${err.message}`));
          return;
        }

        try {
          const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
          const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
          
          if (!videoStream) {
            reject(new Error('לא נמצא זרם וידאו בקובץ'));
            return;
          }

          const videoMetadata = {
            duration: parseFloat(metadata.format.duration) || 0,
            format: metadata.format.format_name,
            size: parseInt(metadata.format.size) || 0,
            bitrate: parseInt(metadata.format.bit_rate) || 0,
            
            // Video stream info
            resolution: {
              width: videoStream.width || 0,
              height: videoStream.height || 0
            },
            codec: videoStream.codec_name,
            codecLongName: videoStream.codec_long_name,
            pixelFormat: videoStream.pix_fmt,
            frameRate: this.parseFrameRate(videoStream.r_frame_rate),
            videoBitrate: parseInt(videoStream.bit_rate) || 0,
            
            // Audio stream info (if available)
            hasAudio: !!audioStream,
            audioCodec: audioStream?.codec_name,
            audioCodecLongName: audioStream?.codec_long_name,
            audioBitrate: parseInt(audioStream?.bit_rate) || 0,
            audioChannels: audioStream?.channels || 0,
            audioSampleRate: parseInt(audioStream?.sample_rate) || 0,
            
            // Additional metadata
            hasVideo: true,
            creationTime: metadata.format.tags?.creation_time,
            title: metadata.format.tags?.title,
            
            // Technical details
            streams: metadata.streams.length,
            chapters: metadata.chapters?.length || 0
          };

          // Add chapter information if available
          if (metadata.chapters && metadata.chapters.length > 0) {
            videoMetadata.chapterList = metadata.chapters.map(chapter => ({
              title: chapter.tags?.title || `Chapter ${chapter.id + 1}`,
              startTime: parseFloat(chapter.start_time) || 0,
              endTime: parseFloat(chapter.end_time) || 0
            }));
          }

          resolve(videoMetadata);
        } catch (parseError) {
          console.error('Error parsing video metadata:', parseError);
          reject(new Error(`שגיאה בעיבוד מטא-דאטה: ${parseError.message}`));
        }
      });
    });
  }

  /**
   * Parse frame rate from FFmpeg format (e.g., "30/1" -> 30)
   */
  parseFrameRate(frameRateString) {
    if (!frameRateString) return 0;
    
    try {
      if (frameRateString.includes('/')) {
        const [numerator, denominator] = frameRateString.split('/').map(Number);
        return denominator > 0 ? numerator / denominator : 0;
      }
      return parseFloat(frameRateString) || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Generate thumbnails at multiple timestamps and sizes
   */
  async generateThumbnails(recordingId, filePath, duration) {
    if (!this.isFFmpegAvailable()) {
      throw new Error('FFmpeg לא זמין - לא ניתן ליצור תמונות ממוזערות');
    }

    const thumbnails = [];
    const thumbnailDir = path.join(__dirname, '../uploads/thumbnails', recordingId.toString());
    
    // Create recording-specific thumbnail directory
    await fs.mkdir(thumbnailDir, { recursive: true });

    try {
      // Generate thumbnails for each timestamp and size
      for (const timestampPercent of this.thumbnailTimestamps) {
        const timestamp = (duration * timestampPercent) / 100;
        
        for (const [sizeName, dimensions] of Object.entries(this.thumbnailSizes)) {
          const thumbnailFilename = `thumb_${timestampPercent}p_${sizeName}.webp`;
          const thumbnailPath = path.join(thumbnailDir, thumbnailFilename);
          
          try {
            await this.generateSingleThumbnail(filePath, thumbnailPath, timestamp, dimensions);
            
            // Get file stats
            const stats = await fs.stat(thumbnailPath);
            
            // Save thumbnail info to database
            const thumbnailRecord = await this.saveThumbnailToDatabase({
              recordingId,
              timestampPercent,
              thumbnailPath: path.relative(path.join(__dirname, '../uploads'), thumbnailPath),
              thumbnailSize: sizeName,
              width: dimensions.width,
              height: dimensions.height,
              fileSize: stats.size
            });

            thumbnails.push(thumbnailRecord);
            
            console.log(`Generated thumbnail: ${thumbnailFilename} (${stats.size} bytes)`);
          } catch (thumbError) {
            console.error(`Error generating thumbnail ${thumbnailFilename}:`, thumbError);
            // Continue with other thumbnails even if one fails
          }
        }
      }

      // Set the first medium thumbnail as the primary thumbnail
      const primaryThumbnail = thumbnails.find(t => 
        t.timestamp_percent === 25 && t.thumbnail_size === 'medium'
      ) || thumbnails[0];

      if (primaryThumbnail) {
        await this.setPrimaryThumbnail(recordingId, primaryThumbnail.thumbnail_path);
      }

      return thumbnails;
    } catch (error) {
      console.error('Error in thumbnail generation process:', error);
      throw new Error(`שגיאה ביצירת תמונות ממוזערות: ${error.message}`);
    }
  }

  /**
   * Generate a single thumbnail
   */
  async generateSingleThumbnail(inputPath, outputPath, timestamp, dimensions) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput(timestamp)
        .frames(1)
        .size(`${dimensions.width}x${dimensions.height}`)
        .format('webp')
        .outputOptions([
          '-quality 80',
          '-preset default',
          '-lossless 0'
        ])
        .output(outputPath)
        .on('end', () => {
          resolve();
        })
        .on('error', (err) => {
          reject(new Error(`FFmpeg thumbnail error: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Process video file completely (metadata + thumbnails)
   */
  async processVideoFile(recordingId, filePath, originalFilename) {
    console.log(`Starting video processing for recording ${recordingId}: ${originalFilename}`);
    
    try {
      // Update processing status
      await this.updateProcessingStatus(recordingId, 'processing');
      
      // Extract metadata
      console.log('Extracting video metadata...');
      const metadata = await this.extractVideoMetadata(filePath);
      
      // Save metadata to database
      await this.saveVideoMetadata(recordingId, metadata);
      
      // Generate thumbnails
      console.log('Generating thumbnails...');
      const thumbnails = await this.generateThumbnails(recordingId, filePath, metadata.duration);
      
      // Update processing status to completed
      await this.updateProcessingStatus(recordingId, 'completed');
      
      console.log(`Video processing completed for recording ${recordingId}`);
      
      return {
        metadata,
        thumbnails,
        success: true
      };
    } catch (error) {
      console.error(`Video processing failed for recording ${recordingId}:`, error);
      
      // Update processing status to failed
      await this.updateProcessingStatus(recordingId, 'failed', error.message);
      
      throw error;
    }
  }

  /**
   * Extract audio from video for transcription
   */
  async extractAudioFromVideo(videoPath, outputPath) {
    if (!this.isFFmpegAvailable()) {
      throw new Error('FFmpeg לא זמין - לא ניתן לחלץ אודיו מוידאו');
    }

    return new Promise((resolve, reject) => {
      // Try different audio formats in order of preference
      const formats = [
        { codec: 'libmp3lame', format: 'mp3', ext: '.mp3' },
        { codec: 'aac', format: 'mp4', ext: '.m4a' },
        { codec: 'pcm_s16le', format: 'wav', ext: '.wav' }
      ];

      let currentFormatIndex = 0;

      const tryExtraction = () => {
        if (currentFormatIndex >= formats.length) {
          reject(new Error('לא ניתן לחלץ אודיו - אף פורמט אודיו לא זמין'));
          return;
        }

        const currentFormat = formats[currentFormatIndex];
        const actualOutputPath = outputPath.replace(/\.[^.]+$/, currentFormat.ext);

        console.log(`Trying audio extraction with ${currentFormat.codec} codec...`);

        ffmpeg(videoPath)
          .audioCodec(currentFormat.codec)
          .audioBitrate(128)
          .audioChannels(1) // Mono for better transcription
          .audioFrequency(16000) // 16kHz for speech recognition
          .noVideo()
          .format(currentFormat.format)
          .output(actualOutputPath)
          .on('end', () => {
            console.log(`Audio extraction completed with ${currentFormat.codec} codec`);
            resolve(actualOutputPath);
          })
          .on('error', (err) => {
            console.warn(`Audio extraction failed with ${currentFormat.codec}:`, err.message);
            currentFormatIndex++;
            tryExtraction();
          })
          .run();
      };

      tryExtraction();
    });
  }

  /**
   * Database helper methods
   */
  async saveVideoMetadata(recordingId, metadata) {
    try {
      await run(`
        UPDATE recordings 
        SET video_metadata = ?, processing_status = 'completed'
        WHERE id = ?
      `, [JSON.stringify(metadata), recordingId]);
      
      console.log(`Video metadata saved for recording ${recordingId}`);
    } catch (error) {
      console.error('Error saving video metadata:', error);
      throw new Error(`שגיאה בשמירת מטא-דאטה: ${error.message}`);
    }
  }

  async saveThumbnailToDatabase({ recordingId, timestampPercent, thumbnailPath, thumbnailSize, width, height, fileSize }) {
    try {
      const result = await run(`
        INSERT INTO video_thumbnails (
          recording_id, timestamp_percent, thumbnail_path, thumbnail_size, 
          width, height, file_size
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [recordingId, timestampPercent, thumbnailPath, thumbnailSize, width, height, fileSize]);

      return {
        id: result.lastID,
        recording_id: recordingId,
        timestamp_percent: timestampPercent,
        thumbnail_path: thumbnailPath,
        thumbnail_size: thumbnailSize,
        width,
        height,
        file_size: fileSize
      };
    } catch (error) {
      console.error('Error saving thumbnail to database:', error);
      throw new Error(`שגיאה בשמירת תמונה ממוזערת: ${error.message}`);
    }
  }

  async setPrimaryThumbnail(recordingId, thumbnailPath) {
    try {
      await run(`
        UPDATE recordings 
        SET thumbnail_path = ?
        WHERE id = ?
      `, [thumbnailPath, recordingId]);
    } catch (error) {
      console.error('Error setting primary thumbnail:', error);
    }
  }

  async updateProcessingStatus(recordingId, status, errorMessage = null) {
    try {
      await run(`
        UPDATE recordings 
        SET processing_status = ?
        WHERE id = ?
      `, [status, recordingId]);

      if (errorMessage) {
        console.error(`Processing failed for recording ${recordingId}: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error updating processing status:', error);
    }
  }

  /**
   * Get video thumbnails for a recording
   */
  async getVideoThumbnails(recordingId) {
    try {
      const result = await query(`
        SELECT * FROM video_thumbnails 
        WHERE recording_id = ? 
        ORDER BY timestamp_percent, thumbnail_size
      `, [recordingId]);

      return result.rows || [];
    } catch (error) {
      console.error('Error fetching video thumbnails:', error);
      return [];
    }
  }

  /**
   * Clean up processing files
   */
  async cleanup(recordingId) {
    try {
      const tempDir = path.join(__dirname, '../uploads/temp/video-processing', recordingId.toString());
      await fs.rmdir(tempDir, { recursive: true });
    } catch (error) {
      console.warn(`Cleanup warning for recording ${recordingId}:`, error.message);
    }
  }

  /**
   * Get processing status
   */
  async getProcessingStatus(recordingId) {
    try {
      const result = await query(`
        SELECT processing_status, video_metadata, thumbnail_path
        FROM recordings 
        WHERE id = ?
      `, [recordingId]);

      if (result.rows.length > 0) {
        const record = result.rows[0];
        return {
          status: record.processing_status,
          metadata: record.video_metadata ? JSON.parse(record.video_metadata) : null,
          thumbnailPath: record.thumbnail_path
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting processing status:', error);
      return null;
    }
  }
}

module.exports = VideoProcessingService;
