const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

/**
 * FFmpeg Setup Script for Windows
 * Downloads and configures FFmpeg for the enhanced audio processing pipeline
 */

const FFMPEG_VERSION = '6.0';
const FFMPEG_URL = `https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip`;
const INSTALL_DIR = path.join(__dirname, 'ffmpeg');

async function setupFFmpeg() {
  console.log('🔧 Setting up FFmpeg for Windows...');
  console.log('=' .repeat(50));

  try {
    // Check if FFmpeg is already available
    try {
      execSync('ffmpeg -version', { stdio: 'ignore' });
      console.log('✅ FFmpeg is already installed and available in PATH');
      return true;
    } catch (error) {
      console.log('❌ FFmpeg not found in PATH, proceeding with installation...');
    }

    // Check if we have a local installation
    const localFFmpegPath = path.join(INSTALL_DIR, 'bin', 'ffmpeg.exe');
    if (fs.existsSync(localFFmpegPath)) {
      console.log('✅ Local FFmpeg installation found');
      console.log(`📍 Path: ${localFFmpegPath}`);
      
      // Update the AudioProcessingService to use this path
      await updateAudioProcessingService(localFFmpegPath);
      return true;
    }

    console.log('📥 FFmpeg not found locally. Manual installation required.');
    console.log('\n🔧 Manual Installation Instructions:');
    console.log('1. Download FFmpeg from: https://www.gyan.dev/ffmpeg/builds/');
    console.log('2. Choose "release builds" -> "ffmpeg-release-essentials.zip"');
    console.log('3. Extract the zip file');
    console.log('4. Copy the extracted folder to: ' + INSTALL_DIR);
    console.log('5. Ensure the structure is: ffmpeg/bin/ffmpeg.exe');
    console.log('\n🔄 Alternative: Add FFmpeg to your system PATH');
    console.log('1. Download and extract FFmpeg as above');
    console.log('2. Add the bin folder to your Windows PATH environment variable');
    console.log('3. Restart your terminal/IDE');

    return false;

  } catch (error) {
    console.error('❌ Error setting up FFmpeg:', error.message);
    return false;
  }
}

async function updateAudioProcessingService(ffmpegPath) {
  const servicePath = path.join(__dirname, 'server', 'services', 'AudioProcessingService.js');
  
  try {
    let content = fs.readFileSync(servicePath, 'utf8');
    
    // Add local FFmpeg path configuration
    const ffmpegConfig = `
// Local FFmpeg configuration
const localFFmpegPath = '${ffmpegPath.replace(/\\/g, '\\\\')}';
if (fs.existsSync(localFFmpegPath)) {
  ffmpeg.setFfmpegPath(localFFmpegPath);
  ffmpeg.setFfprobePath(localFFmpegPath.replace('ffmpeg.exe', 'ffprobe.exe'));
  ffmpegAvailable = true;
  console.log('Using local FFmpeg installation');
}
`;

    // Insert after the existing FFmpeg setup
    const insertPoint = content.indexOf('console.warn(\'FFmpeg not found via npm packages, using system PATH\');');
    if (insertPoint !== -1) {
      const beforeInsert = content.substring(0, insertPoint);
      const afterInsert = content.substring(insertPoint);
      content = beforeInsert + ffmpegConfig + '\n      ' + afterInsert;
      
      fs.writeFileSync(servicePath, content);
      console.log('✅ Updated AudioProcessingService with local FFmpeg path');
    }
  } catch (error) {
    console.error('⚠️  Could not update AudioProcessingService:', error.message);
  }
}

// Run setup if called directly
if (require.main === module) {
  setupFFmpeg().then(success => {
    if (success) {
      console.log('\n🎉 FFmpeg setup completed successfully!');
      console.log('You can now run: node test-enhanced-audio-processing.js');
    } else {
      console.log('\n⚠️  FFmpeg setup requires manual intervention.');
      console.log('Please follow the instructions above and run this script again.');
    }
  });
}

module.exports = { setupFFmpeg };
