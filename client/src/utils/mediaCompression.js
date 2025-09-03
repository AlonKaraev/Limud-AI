/**
 * Enhanced Media Compression Utilities
 * Provides optimized compression functionality for audio, video, and document files
 * with improved performance, error handling, and progress tracking
 */

// Enhanced video compression with better performance and error handling
export const compressVideo = async (file, quality = 0.7, onProgress = null) => {
  console.log(`🎬 [VIDEO COMPRESSION] Starting compression for: ${file.name}`);
  console.log(`📊 [VIDEO COMPRESSION] File size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
  console.log(`⚙️ [VIDEO COMPRESSION] Quality setting: ${Math.round(quality * 100)}%`);
  
  return new Promise((resolve, reject) => {
    try {
      // Check if file is too large for browser-based compression
      const maxSize = 500 * 1024 * 1024; // 500MB limit for browser compression
      if (file.size > maxSize) {
        console.log(`⚠️ [VIDEO COMPRESSION] File too large for browser compression (${(file.size / 1024 / 1024).toFixed(2)}MB > 500MB)`);
        console.log(`📤 [VIDEO COMPRESSION] Returning original file: ${file.name}`);
        if (onProgress) onProgress(0, 'קובץ גדול מדי לדחיסה בדפדפן - מחזיר קובץ מקורי');
        resolve(file); // Return original file for very large files
        return;
      }

      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Ensure video is muted for silent processing
      video.muted = true;
      video.volume = 0;
      video.preload = 'metadata';
      
      if (onProgress) onProgress(10, 'טוען ווידאו...');
      
      let timeoutId;
      
      // Set timeout for loading
      const loadTimeout = setTimeout(() => {
        reject(new Error('זמן טעינת הווידאו פג - הקובץ עלול להיות פגום או גדול מדי'));
      }, 30000); // 30 second timeout
      
      video.onloadedmetadata = () => {
        clearTimeout(loadTimeout);
        console.log(`📹 [VIDEO COMPRESSION] Video loaded successfully`);
        console.log(`📐 [VIDEO COMPRESSION] Original dimensions: ${video.videoWidth}x${video.videoHeight}`);
        console.log(`⏱️ [VIDEO COMPRESSION] Duration: ${video.duration?.toFixed(2)}s`);
        
        try {
          if (onProgress) onProgress(20, 'מכין דחיסת ווידאו...');
          
          // Calculate optimal dimensions
          const maxDimension = 1280; // Max width/height
          let { width, height } = calculateOptimalDimensions(
            video.videoWidth, 
            video.videoHeight, 
            quality, 
            maxDimension
          );
          
          console.log(`🎯 [VIDEO COMPRESSION] Target dimensions: ${width}x${height} (${Math.round((width * height) / (video.videoWidth * video.videoHeight) * 100)}% of original)`);
          
          canvas.width = width;
          canvas.height = height;
          
          // Check if MediaRecorder is supported
          if (!window.MediaRecorder) {
            console.error(`❌ [VIDEO COMPRESSION] MediaRecorder not supported`);
            throw new Error('דחיסת ווידאו לא נתמכת בדפדפן זה');
          }
          
          console.log(`✅ [VIDEO COMPRESSION] MediaRecorder supported`);
          
          // Try different codecs in order of preference
          const codecs = [
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm',
            'video/mp4'
          ];
          
          console.log(`🔍 [VIDEO COMPRESSION] Testing codec support...`);
          let selectedCodec = null;
          for (const codec of codecs) {
            const isSupported = MediaRecorder.isTypeSupported(codec);
            console.log(`  ${isSupported ? '✅' : '❌'} ${codec}`);
            if (isSupported && !selectedCodec) {
              selectedCodec = codec;
            }
          }
          
          if (!selectedCodec) {
            console.error(`❌ [VIDEO COMPRESSION] No supported codec found`);
            throw new Error('לא נמצא קודק נתמך לדחיסת ווידאו');
          }
          
          console.log(`🎬 [VIDEO COMPRESSION] Selected codec: ${selectedCodec}`);
          if (onProgress) onProgress(30, `משתמש בקודק: ${selectedCodec.split(';')[0]}`);
          
          // Set up MediaRecorder with optimized settings
          const stream = canvas.captureStream(Math.min(30, 24)); // Limit FPS
          const bitrate = calculateOptimalBitrate(width, height, quality);
          
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: selectedCodec,
            videoBitsPerSecond: bitrate
          });
          
          const chunks = [];
          let startTime = Date.now();
          let lastProgressUpdate = 0;
          
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              chunks.push(event.data);
              
              // Update progress based on time elapsed (throttled)
              const now = Date.now();
              if (now - lastProgressUpdate > 500) { // Update every 500ms
                const elapsed = now - startTime;
                const estimatedTotal = (video.duration || 10) * 1000; // Fallback to 10s if duration unknown
                const progress = Math.min(85, 40 + (elapsed / estimatedTotal) * 45);
                if (onProgress) onProgress(progress, 'דוחס ווידאו...');
                lastProgressUpdate = now;
              }
            }
          };
          
          mediaRecorder.onstop = () => {
            try {
              if (onProgress) onProgress(90, 'יוצר קובץ ווידאו...');
              
              const compressedBlob = new Blob(chunks, { type: selectedCodec.split(';')[0] });
              
              // Check if compression was effective
              if (compressedBlob.size >= file.size * 0.95) {
                // If compressed file is not significantly smaller, return original
                if (onProgress) onProgress(100, 'דחיסה לא יעילה - מחזיר קובץ מקורי');
                resolve(file);
                return;
              }
              
              const extension = getExtensionForMimeType(selectedCodec);
              const compressedFile = new File([compressedBlob], 
                file.name.replace(/\.[^/.]+$/, extension), {
                type: selectedCodec.split(';')[0],
                lastModified: Date.now()
              });
              
              if (onProgress) onProgress(100, 'דחיסת ווידאו הושלמה');
              resolve(compressedFile);
            } catch (error) {
              reject(new Error(`שגיאה ביצירת קובץ דחוס: ${error.message}`));
            }
          };
          
          mediaRecorder.onerror = (event) => {
            reject(new Error(`שגיאה בהקלטה: ${event.error?.message || 'שגיאה לא ידועה'}`));
          };
          
          // Start recording with timeout protection
          mediaRecorder.start(1000); // Collect data every second
          if (onProgress) onProgress(40, 'מתחיל דחיסת ווידאו...');
          
          // Set maximum compression time
          const maxCompressionTime = Math.max(60000, (video.duration || 10) * 2000); // 2x video duration or 1 minute minimum
          const compressionTimeout = setTimeout(() => {
            if (mediaRecorder.state === 'recording') {
              mediaRecorder.stop();
              reject(new Error('דחיסת הווידאו ארכה יותר מדי - נעצרה'));
            }
          }, maxCompressionTime);
          
          // Draw video frames to canvas with optimized frame rate
          let frameCount = 0;
          const targetFPS = Math.min(24, 30); // Limit FPS for better performance
          const frameInterval = 1000 / targetFPS;
          let lastFrameTime = 0;
          
          const drawFrame = (currentTime) => {
            if (video.paused || video.ended || mediaRecorder.state !== 'recording') {
              clearTimeout(compressionTimeout);
              if (mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
              }
              return;
            }
            
            // Throttle frame rate
            if (currentTime - lastFrameTime >= frameInterval) {
              try {
                ctx.drawImage(video, 0, 0, width, height);
                frameCount++;
                lastFrameTime = currentTime;
              } catch (drawError) {
                console.warn('Frame drawing error:', drawError);
              }
            }
            
            requestAnimationFrame(drawFrame);
          };
          
          // Start playback and drawing
          video.currentTime = 0;
          video.play().then(() => {
            requestAnimationFrame(drawFrame);
          }).catch(playError => {
            reject(new Error(`שגיאה בהפעלת ווידאו: ${playError.message}`));
          });
          
        } catch (setupError) {
          clearTimeout(loadTimeout);
          reject(new Error(`שגיאה בהכנת דחיסה: ${setupError.message}`));
        }
      };
      
      video.onerror = (error) => {
        clearTimeout(loadTimeout);
        reject(new Error(`שגיאה בטעינת ווידאו: ${error.message || 'קובץ ווידאו פגום או לא נתמך'}`));
      };
      
      // Create object URL and load video
      const objectUrl = URL.createObjectURL(file);
      video.src = objectUrl;
      
      // Clean up object URL after use
      video.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(objectUrl);
      }, { once: true });
      
    } catch (error) {
      console.error('Video compression setup error:', error);
      reject(new Error(`שגיאה בהכנת דחיסת ווידאו: ${error.message}`));
    }
  });
};

// Calculate optimal dimensions based on quality and constraints
const calculateOptimalDimensions = (originalWidth, originalHeight, quality, maxDimension) => {
  // Calculate scale based on quality (0.3 to 1.0)
  const qualityScale = Math.sqrt(quality);
  
  // Apply quality scaling
  let width = Math.floor(originalWidth * qualityScale);
  let height = Math.floor(originalHeight * qualityScale);
  
  // Ensure dimensions don't exceed maximum
  if (width > maxDimension || height > maxDimension) {
    const aspectRatio = originalWidth / originalHeight;
    if (width > height) {
      width = maxDimension;
      height = Math.floor(maxDimension / aspectRatio);
    } else {
      height = maxDimension;
      width = Math.floor(maxDimension * aspectRatio);
    }
  }
  
  // Ensure dimensions are even numbers (required by some codecs)
  width = width % 2 === 0 ? width : width - 1;
  height = height % 2 === 0 ? height : height - 1;
  
  // Minimum dimensions
  width = Math.max(width, 320);
  height = Math.max(height, 240);
  
  return { width, height };
};

// Calculate optimal bitrate based on dimensions and quality
const calculateOptimalBitrate = (width, height, quality) => {
  const pixels = width * height;
  const baseRate = pixels * 0.1; // Base rate per pixel
  const qualityMultiplier = 0.5 + (quality * 0.5); // 0.5 to 1.0
  return Math.floor(baseRate * qualityMultiplier);
};

// Get file extension for mime type
const getExtensionForMimeType = (mimeType) => {
  const type = mimeType.split(';')[0].toLowerCase();
  switch (type) {
    case 'video/webm':
      return '.webm';
    case 'video/mp4':
      return '.mp4';
    default:
      return '.webm';
  }
};

// Enhanced audio compression with better error handling
export const compressAudio = async (file, quality = 0.7, onProgress = null) => {
  return new Promise((resolve, reject) => {
    try {
      // Check browser support
      if (!window.AudioContext && !window.webkitAudioContext) {
        reject(new Error('דחיסת אודיו לא נתמכת בדפדפן זה'));
        return;
      }
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const fileReader = new FileReader();
      
      if (onProgress) onProgress(10, 'קורא קובץ אודיו...');
      
      // Set timeout for file reading
      const readTimeout = setTimeout(() => {
        reject(new Error('זמן קריאת הקובץ פג'));
      }, 30000);
      
      fileReader.onload = async (e) => {
        clearTimeout(readTimeout);
        
        try {
          if (onProgress) onProgress(30, 'מפענח אודיו...');
          
          const arrayBuffer = e.target.result;
          
          // Set timeout for audio decoding
          const decodeTimeout = setTimeout(() => {
            reject(new Error('זמן פענוח האודיו פג'));
          }, 30000);
          
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          clearTimeout(decodeTimeout);
          
          if (onProgress) onProgress(50, 'מכין דחיסה...');
          
          // Calculate optimal sample rate
          const originalSampleRate = audioBuffer.sampleRate;
          const targetSampleRate = Math.max(22050, Math.floor(originalSampleRate * quality));
          
          // Create offline context for compression
          const offlineContext = new OfflineAudioContext(
            Math.min(audioBuffer.numberOfChannels, 2), // Limit to stereo
            Math.floor(audioBuffer.duration * targetSampleRate),
            targetSampleRate
          );
          
          const source = offlineContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(offlineContext.destination);
          source.start();
          
          if (onProgress) onProgress(70, 'דוחס אודיו...');
          
          // Set timeout for rendering
          const renderTimeout = setTimeout(() => {
            reject(new Error('זמן דחיסת האודיו פג'));
          }, 60000);
          
          const compressedBuffer = await offlineContext.startRendering();
          clearTimeout(renderTimeout);
          
          if (onProgress) onProgress(90, 'יוצר קובץ אודיו...');
          
          // Convert to WAV with quality-based bit depth
          const bitDepth = Math.max(8, Math.floor(16 * quality));
          const wavBlob = audioBufferToWav(compressedBuffer, bitDepth);
          
          const compressedFile = new File([wavBlob], 
            file.name.replace(/\.[^/.]+$/, '.wav'), {
            type: 'audio/wav',
            lastModified: Date.now()
          });
          
          if (onProgress) onProgress(100, 'דחיסת אודיו הושלמה');
          resolve(compressedFile);
          
        } catch (error) {
          console.error('Audio compression processing error:', error);
          reject(new Error(`שגיאה בעיבוד אודיו: ${error.message}`));
        }
      };
      
      fileReader.onerror = () => {
        clearTimeout(readTimeout);
        reject(new Error('שגיאה בקריאת קובץ האודיו'));
      };
      
      fileReader.readAsArrayBuffer(file);
      
    } catch (error) {
      console.error('Audio compression setup error:', error);
      reject(new Error(`שגיאה בהכנת דחיסת אודיו: ${error.message}`));
    }
  });
};

// Enhanced WAV conversion with configurable bit depth
const audioBufferToWav = (buffer, bitDepth = 16) => {
  const length = buffer.length;
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bytesPerSample = Math.floor(bitDepth / 8);
  
  const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * bytesPerSample);
  const view = new DataView(arrayBuffer);
  
  // WAV header
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length * numberOfChannels * bytesPerSample, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numberOfChannels * bytesPerSample, true);
  view.setUint16(32, numberOfChannels * bytesPerSample, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, length * numberOfChannels * bytesPerSample, true);
  
  // Convert float samples to PCM
  let offset = 44;
  const maxValue = Math.pow(2, bitDepth - 1) - 1;
  
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      const intSample = Math.floor(sample * maxValue);
      
      if (bytesPerSample === 1) {
        view.setUint8(offset, intSample + 128);
        offset += 1;
      } else if (bytesPerSample === 2) {
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
};

// Enhanced image compression
export const compressImage = async (file, quality = 0.7, onProgress = null) => {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (onProgress) onProgress(20, 'טוען תמונה...');
      
      const loadTimeout = setTimeout(() => {
        reject(new Error('זמן טעינת התמונה פג'));
      }, 15000);
      
      img.onload = () => {
        clearTimeout(loadTimeout);
        
        try {
          if (onProgress) onProgress(50, 'מכין דחיסת תמונה...');
          
          // Calculate optimal dimensions
          const maxDimension = 2048;
          const { width, height } = calculateOptimalDimensions(
            img.width, 
            img.height, 
            quality, 
            maxDimension
          );
          
          canvas.width = width;
          canvas.height = height;
          
          if (onProgress) onProgress(70, 'דוחס תמונה...');
          
          // Draw with better quality settings
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          
          if (onProgress) onProgress(90, 'יוצר קובץ תמונה...');
          
          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], 
                file.name.replace(/\.[^/.]+$/, '.jpg'), {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              
              if (onProgress) onProgress(100, 'דחיסת תמונה הושלמה');
              resolve(compressedFile);
            } else {
              reject(new Error('שגיאה ביצירת תמונה דחוסה'));
            }
          }, 'image/jpeg', quality);
          
        } catch (error) {
          reject(new Error(`שגיאה בעיבוד תמונה: ${error.message}`));
        }
      };
      
      img.onerror = () => {
        clearTimeout(loadTimeout);
        reject(new Error('שגיאה בטעינת התמונה - קובץ פגום או לא נתמך'));
      };
      
      img.src = URL.createObjectURL(file);
      
    } catch (error) {
      console.error('Image compression error:', error);
      reject(new Error(`שגיאה בהכנת דחיסת תמונה: ${error.message}`));
    }
  });
};

// Main compression function with enhanced error handling and timeouts
export const compressFile = async (file, quality = 0.7, onProgress = null) => {
  try {
    if (onProgress) onProgress(0, 'מתחיל דחיסה...');
    
    const fileType = file.type.toLowerCase();
    let compressedFile;
    
    // Set overall timeout for compression
    const compressionPromise = new Promise(async (resolve, reject) => {
      try {
        if (fileType.startsWith('audio/')) {
          if (onProgress) onProgress(5, 'מעבד קובץ אודיו...');
          compressedFile = await compressAudio(file, quality, (progress, message) => {
            if (onProgress) onProgress(5 + (progress * 0.9), message);
          });
        } else if (fileType.startsWith('video/')) {
          if (onProgress) onProgress(5, 'מעבד קובץ ווידאו...');
          compressedFile = await compressVideo(file, quality, (progress, message) => {
            if (onProgress) onProgress(5 + (progress * 0.9), message);
          });
        } else if (fileType.startsWith('image/')) {
          if (onProgress) onProgress(5, 'מעבד תמונה...');
          compressedFile = await compressImage(file, quality, (progress, message) => {
            if (onProgress) onProgress(5 + (progress * 0.9), message);
          });
        } else {
          // For unsupported file types, return original
          if (onProgress) onProgress(50, 'סוג קובץ לא דורש דחיסה...');
          compressedFile = file;
        }
        
        resolve(compressedFile);
      } catch (error) {
        reject(error);
      }
    });
    
    // Set maximum compression time based on file size
    const maxTime = Math.max(60000, Math.min(300000, file.size / 1024)); // 1-5 minutes based on file size
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`דחיסה ארכה יותר מדי (מעל ${Math.floor(maxTime/1000)} שניות) - בוטלה`));
      }, maxTime);
    });
    
    compressedFile = await Promise.race([compressionPromise, timeoutPromise]);
    
    if (onProgress) onProgress(100, 'דחיסה הושלמה בהצלחה');
    return compressedFile;
    
  } catch (error) {
    console.error('File compression error:', error);
    if (onProgress) onProgress(0, `שגיאה בדחיסה: ${error.message}`);
    
    // Return original file if compression fails
    console.warn('Compression failed, returning original file');
    return file;
  }
};

// Utility functions
export const getCompressionRatio = (originalSize, compressedSize) => {
  if (originalSize === 0) return 0;
  return Math.round((1 - compressedSize / originalSize) * 100);
};

export const getEstimatedCompressedSize = (originalSize, quality = 0.7) => {
  return Math.floor(originalSize * quality);
};

export const supportsCompression = (fileType) => {
  const supportedTypes = [
    'audio/',
    'video/',
    'image/'
  ];
  
  return supportedTypes.some(type => fileType.toLowerCase().startsWith(type));
};

// Check if compression is recommended for file
export const shouldCompress = (file, quality = 0.7) => {
  const minSizeForCompression = 1024 * 1024; // 1MB
  const maxSizeForCompression = 1024 * 1024 * 1024; // 1GB
  
  return file.size >= minSizeForCompression && 
         file.size <= maxSizeForCompression && 
         supportsCompression(file.type);
};
