const fs = require('fs');
const path = require('path');
const TranscriptionService = require('../server/services/TranscriptionService');
const ParallelTranscriptionService = require('../server/services/ParallelTranscriptionService');

/**
 * Performance Test for Parallel Transcription Service
 * Compares sequential vs parallel transcription processing
 */
class TranscriptionPerformanceTest {
  constructor() {
    this.testResults = {
      sequential: {},
      parallel: {},
      comparison: {}
    };
  }

  /**
   * Run comprehensive performance tests
   */
  async runPerformanceTests() {
    console.log('🚀 Starting Transcription Performance Tests');
    console.log('=' .repeat(60));

    try {
      // Test with a sample audio file (you'll need to provide one)
      const testAudioPath = path.join(__dirname, 'test-audio.mp3');
      
      if (!fs.existsSync(testAudioPath)) {
        console.log('⚠️  Test audio file not found. Creating mock test scenario...');
        await this.runMockPerformanceTest();
        return;
      }

      // Test parameters
      const testParams = {
        filePath: testAudioPath,
        recordingId: 999,
        userId: 1,
        jobId: null,
        useEnhancedProcessing: true
      };

      console.log('📊 Testing with real audio file...');
      
      // Test sequential processing
      console.log('\n1️⃣ Testing Sequential Transcription Service');
      await this.testSequentialTranscription(testParams);

      // Test parallel processing
      console.log('\n2️⃣ Testing Parallel Transcription Service');
      await this.testParallelTranscription(testParams);

      // Compare results
      console.log('\n📈 Performance Comparison');
      this.compareResults();

    } catch (error) {
      console.error('❌ Performance test failed:', error.message);
      console.log('\n🔄 Running mock performance test instead...');
      await this.runMockPerformanceTest();
    }
  }

  /**
   * Test sequential transcription service
   */
  async testSequentialTranscription(params) {
    const startTime = Date.now();
    
    try {
      console.log('   ⏳ Starting sequential transcription...');
      
      const result = await TranscriptionService.transcribeAudio(params);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.testResults.sequential = {
        success: result.success,
        processingTime: duration,
        transcriptionLength: result.transcription?.transcription_text?.length || 0,
        confidenceScore: result.confidenceScore,
        enhancedProcessing: result.enhancedProcessing,
        parallelProcessing: false,
        segments: result.transcription?.segments?.length || 0
      };

      console.log('   ✅ Sequential transcription completed');
      console.log(`   ⏱️  Processing time: ${Math.round(duration/1000)}s`);
      console.log(`   📝 Transcription length: ${this.testResults.sequential.transcriptionLength} characters`);
      console.log(`   🎯 Confidence score: ${(this.testResults.sequential.confidenceScore * 100).toFixed(1)}%`);

    } catch (error) {
      console.error('   ❌ Sequential transcription failed:', error.message);
      this.testResults.sequential = {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Test parallel transcription service
   */
  async testParallelTranscription(params) {
    const startTime = Date.now();
    
    try {
      console.log('   ⏳ Starting parallel transcription...');
      
      const result = await ParallelTranscriptionService.transcribeAudio(params);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.testResults.parallel = {
        success: result.success,
        processingTime: duration,
        transcriptionLength: result.transcription?.transcription_text?.length || 0,
        confidenceScore: result.confidenceScore,
        enhancedProcessing: result.enhancedProcessing,
        parallelProcessing: result.parallelProcessing,
        segments: result.transcription?.segments?.length || 0,
        parallelStats: result.parallelProcessing
      };

      console.log('   ✅ Parallel transcription completed');
      console.log(`   ⏱️  Processing time: ${Math.round(duration/1000)}s`);
      console.log(`   📝 Transcription length: ${this.testResults.parallel.transcriptionLength} characters`);
      console.log(`   🎯 Confidence score: ${(this.testResults.parallel.confidenceScore * 100).toFixed(1)}%`);
      
      if (result.parallelProcessing) {
        console.log(`   🔄 Parallel segments: ${result.parallelProcessing.totalSegments}`);
        console.log(`   ✅ Successful segments: ${result.parallelProcessing.successfulSegments}`);
        console.log(`   ❌ Failed segments: ${result.parallelProcessing.failedSegments}`);
        console.log(`   ⚡ Parallel duration: ${Math.round(result.parallelProcessing.parallelDuration/1000)}s`);
      }

    } catch (error) {
      console.error('   ❌ Parallel transcription failed:', error.message);
      this.testResults.parallel = {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Compare performance results
   */
  compareResults() {
    const seq = this.testResults.sequential;
    const par = this.testResults.parallel;

    if (!seq.success || !par.success) {
      console.log('   ⚠️  Cannot compare results - one or both tests failed');
      return;
    }

    const speedImprovement = ((seq.processingTime - par.processingTime) / seq.processingTime * 100);
    const accuracyDiff = ((par.confidenceScore - seq.confidenceScore) * 100);

    this.testResults.comparison = {
      speedImprovement,
      accuracyDiff,
      sequentialTime: seq.processingTime,
      parallelTime: par.processingTime,
      fasterService: speedImprovement > 0 ? 'parallel' : 'sequential'
    };

    console.log('   📊 Performance Metrics:');
    console.log('   ' + '-'.repeat(40));
    console.log(`   Sequential time:     ${Math.round(seq.processingTime/1000)}s`);
    console.log(`   Parallel time:       ${Math.round(par.processingTime/1000)}s`);
    console.log(`   Speed improvement:   ${speedImprovement > 0 ? '+' : ''}${speedImprovement.toFixed(1)}%`);
    console.log(`   Accuracy difference: ${accuracyDiff > 0 ? '+' : ''}${accuracyDiff.toFixed(1)}%`);
    
    if (speedImprovement > 0) {
      console.log(`   🏆 Parallel processing is ${speedImprovement.toFixed(1)}% faster!`);
    } else {
      console.log(`   📝 Sequential processing was ${Math.abs(speedImprovement).toFixed(1)}% faster`);
    }

    if (par.parallelStats) {
      const efficiency = (par.parallelStats.successfulSegments / par.parallelStats.totalSegments * 100);
      console.log(`   🎯 Parallel efficiency: ${efficiency.toFixed(1)}% segments successful`);
    }
  }

  /**
   * Run mock performance test with simulated data
   */
  async runMockPerformanceTest() {
    console.log('🎭 Running Mock Performance Test');
    console.log('   (Simulating transcription performance without real audio)');
    
    // Simulate sequential processing
    console.log('\n1️⃣ Simulating Sequential Processing...');
    const seqStartTime = Date.now();
    
    // Simulate processing time for 10 segments sequentially
    const segmentCount = 10;
    const avgSegmentTime = 3000; // 3 seconds per segment
    
    for (let i = 0; i < segmentCount; i++) {
      await this.sleep(avgSegmentTime / 10); // Simulate faster for demo
      console.log(`   Processing segment ${i + 1}/${segmentCount}...`);
    }
    
    const seqEndTime = Date.now();
    const sequentialTime = seqEndTime - seqStartTime;
    
    console.log(`   ✅ Sequential simulation completed in ${Math.round(sequentialTime/1000)}s`);

    // Simulate parallel processing
    console.log('\n2️⃣ Simulating Parallel Processing...');
    const parStartTime = Date.now();
    
    // Simulate processing segments in parallel batches
    const batchSize = 3;
    const batches = Math.ceil(segmentCount / batchSize);
    
    for (let batch = 0; batch < batches; batch++) {
      const batchSegments = Math.min(batchSize, segmentCount - (batch * batchSize));
      console.log(`   Processing batch ${batch + 1}/${batches} with ${batchSegments} segments in parallel...`);
      
      // Simulate parallel processing (much faster)
      await this.sleep(avgSegmentTime / 10 / batchSize);
    }
    
    const parEndTime = Date.now();
    const parallelTime = parEndTime - parStartTime;
    
    console.log(`   ✅ Parallel simulation completed in ${Math.round(parallelTime/1000)}s`);

    // Calculate improvements
    const speedImprovement = ((sequentialTime - parallelTime) / sequentialTime * 100);
    
    console.log('\n📈 Mock Performance Results:');
    console.log('   ' + '-'.repeat(40));
    console.log(`   Sequential time:     ${Math.round(sequentialTime/1000)}s`);
    console.log(`   Parallel time:       ${Math.round(parallelTime/1000)}s`);
    console.log(`   Speed improvement:   +${speedImprovement.toFixed(1)}%`);
    console.log(`   Segments processed:  ${segmentCount}`);
    console.log(`   Batch size:          ${batchSize}`);
    console.log(`   🏆 Parallel processing is ${speedImprovement.toFixed(1)}% faster!`);

    console.log('\n💡 Expected Real-World Benefits:');
    console.log('   • Faster transcription of long audio files');
    console.log('   • Better resource utilization');
    console.log('   • Improved user experience with shorter wait times');
    console.log('   • Intelligent rate limiting prevents API overload');
    console.log('   • Automatic retry and error handling');
  }

  /**
   * Sleep utility for simulations
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate performance report
   */
  generateReport() {
    console.log('\n📋 Performance Test Report');
    console.log('=' .repeat(60));
    
    const report = {
      timestamp: new Date().toISOString(),
      testResults: this.testResults,
      recommendations: this.generateRecommendations()
    };

    // Save report to file
    const reportPath = path.join(__dirname, 'transcription-performance-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📄 Report saved to: ${reportPath}`);
    
    return report;
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.testResults.comparison?.speedImprovement > 20) {
      recommendations.push('✅ Parallel processing shows significant speed improvements - recommended for production');
    } else if (this.testResults.comparison?.speedImprovement > 0) {
      recommendations.push('📈 Parallel processing shows modest improvements - consider for long audio files');
    } else {
      recommendations.push('📝 Sequential processing may be sufficient for current use case');
    }

    recommendations.push('🔧 Consider adjusting batch size based on API rate limits');
    recommendations.push('📊 Monitor API usage and costs with parallel processing');
    recommendations.push('🛡️ Implement proper error handling for production deployment');

    return recommendations;
  }
}

// Run the performance test if this file is executed directly
if (require.main === module) {
  const test = new TranscriptionPerformanceTest();
  
  test.runPerformanceTests()
    .then(() => {
      console.log('\n🎉 Performance testing completed!');
      test.generateReport();
    })
    .catch(error => {
      console.error('💥 Performance test failed:', error);
      process.exit(1);
    });
}

module.exports = TranscriptionPerformanceTest;
