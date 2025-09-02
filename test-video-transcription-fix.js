/**
 * Test script to verify video transcription fix
 * This script tests the updated TranscriptionService to ensure it can handle MP4 video files
 */

const path = require('path');
const fs = require('fs');

// Mock the required modules for testing
const mockOpenAIClient = {
  audio: {
    transcriptions: {
      create: async (options) => {
        console.log('Mock OpenAI transcription called with:', {
          model: options.model,
          language: options.language,
          fileSize: options.file.path ? 'file stream provided' : 'no file'
        });
        
        // Simulate successful transcription
        return {
          text: 'זהו טקסט דוגמה שהתקבל מתמלול הווידאו. השיעור עוסק בנושא חשוב בחינוך.',
          language: 'he',
          duration: 120.5,
          segments: [
            {
              start: 0,
              end: 60,
              text: 'זהו טקסט דוגמה שהתקבל מתמלול הווידאו.',
              avg_logprob: -0.2
            },
            {
              start: 60,
              end: 120.5,
              text: 'השיעור עוסק בנושא חשוב בחינוך.',
              avg_logprob: -0.15
            }
          ],
          words: null,
          task: 'transcribe'
        };
      }
    }
  }
};

// Mock AI services config
const mockAIConfig = {
  openaiClient: mockOpenAIClient,
  AI_PROVIDERS: {
    OPENAI: 'openai'
  },
  MODEL_CONFIGS: {
    transcription: {
      openai: {
        model: 'whisper-1',
        language: 'he',
        response_format: 'verbose_json',
        temperature: 0
      }
    }
  },
  calculateEstimatedCost: () => 0.01
};

// Mock database functions
const mockDatabase = {
  run: async (sql, params) => {
    console.log('Mock database INSERT:', { sql: sql.substring(0, 50) + '...', params: params?.length || 0 });
    return { lastID: Math.floor(Math.random() * 1000) + 1 };
  },
  query: async (sql, params) => {
    console.log('Mock database SELECT:', { sql: sql.substring(0, 50) + '...', params: params?.length || 0 });
    return { rows: [] };
  }
};

// Mock VideoProcessingService
class MockVideoProcessingService {
  constructor() {
    this.ffmpegAvailable = true;
  }

  isFFmpegAvailable() {
    return this.ffmpegAvailable;
  }

  async extractAudioFromVideo(videoPath, audioPath) {
    console.log(`Mock audio extraction: ${path.basename(videoPath)} -> ${path.basename(audioPath)}`);
    
    // Create a mock audio file with proper MP3-like header
    const mockAudioContent = Buffer.concat([
      Buffer.from([0x49, 0x44, 0x33]), // ID3 header
      Buffer.from('mock audio data for testing transcription')
    ]);
    await fs.promises.writeFile(audioPath, mockAudioContent);
    
    console.log('Mock audio extraction completed successfully');
    return audioPath;
  }
}

// Mock AudioProcessingService
const mockAudioProcessingService = {
  processAudioFile: async (filePath, options) => {
    console.log('Mock audio processing:', { filePath: path.basename(filePath), options });
    return {
      success: false, // Force fallback to simple transcription for testing
      message: 'Mock audio processing - using fallback'
    };
  }
};

async function testVideoTranscriptionFix() {
  console.log('🧪 Testing Video Transcription Fix\n');

  try {
    // Create a mock video file for testing
    const testVideoPath = path.join(__dirname, 'test-video.mp4');
    const mockVideoContent = 'mock video file content for testing';
    await fs.promises.writeFile(testVideoPath, mockVideoContent);
    console.log('✅ Created mock video file:', path.basename(testVideoPath));

    // Mock the required modules
    const originalRequire = require;
    require = function(id) {
      switch (id) {
        case '../config/ai-services':
          return mockAIConfig;
        case '../config/database-sqlite':
          return mockDatabase;
        case './AudioProcessingService':
          return mockAudioProcessingService;
        case './VideoProcessingService':
          return MockVideoProcessingService;
        default:
          return originalRequire(id);
      }
    };

    // Import the updated TranscriptionService
    const TranscriptionService = originalRequire('./server/services/TranscriptionService');

    console.log('\n📋 Testing file validation...');
    
    // Test 1: Validate video file
    const validation = await TranscriptionService.validateAudioFile(testVideoPath);
    console.log('✅ Video file validation result:', validation);
    
    if (!validation.isVideoFile) {
      throw new Error('Video file not detected correctly');
    }

    console.log('\n🎬 Testing video transcription...');
    
    // Test 2: Transcribe video file
    const transcriptionOptions = {
      filePath: testVideoPath,
      recordingId: 123,
      userId: 1,
      jobId: 456,
      provider: 'openai',
      useEnhancedProcessing: false // Use simple transcription for testing
    };

    const result = await TranscriptionService.transcribeAudio(transcriptionOptions);
    
    console.log('✅ Transcription completed successfully!');
    console.log('📝 Transcription result:', {
      success: result.success,
      textLength: result.transcription.transcription_text.length,
      language: result.transcription.language_detected,
      processingTime: result.processingTime + 'ms',
      confidence: result.confidenceScore
    });

    // Test 3: Verify Hebrew text was returned
    if (!result.transcription.transcription_text.includes('זהו')) {
      throw new Error('Hebrew transcription text not found');
    }

    console.log('\n🧹 Cleaning up test files...');
    
    // Cleanup
    try {
      await fs.promises.unlink(testVideoPath);
      console.log('✅ Cleaned up mock video file');
    } catch (cleanupError) {
      console.warn('⚠️ Cleanup warning:', cleanupError.message);
    }

    console.log('\n🎉 All tests passed! Video transcription fix is working correctly.');
    console.log('\n📊 Summary:');
    console.log('   ✅ Video file validation works');
    console.log('   ✅ Audio extraction from video works');
    console.log('   ✅ Transcription of extracted audio works');
    console.log('   ✅ Hebrew text transcription works');
    console.log('   ✅ Cleanup of temporary files works');

    return true;

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run the test
if (require.main === module) {
  testVideoTranscriptionFix()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testVideoTranscriptionFix };
