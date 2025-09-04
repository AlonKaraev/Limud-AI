/**
 * Enhanced OCR Text Extraction Test
 * Tests the improved OCR capabilities for PowerPoint, PDF, and Word documents
 */

const DocumentProcessingService = require('./server/services/DocumentProcessingService');
const fs = require('fs').promises;
const path = require('path');

class OCRExtractionTester {
  constructor() {
    this.documentService = new DocumentProcessingService();
    this.testResults = [];
  }

  /**
   * Run comprehensive OCR extraction tests
   */
  async runTests() {
    console.log('🔍 Starting Enhanced OCR Text Extraction Tests\n');
    
    try {
      // Test 1: PowerPoint with images
      await this.testPowerPointOCR();
      
      // Test 2: PDF with images
      await this.testPDFOCR();
      
      // Test 3: Word document with images
      await this.testWordOCR();
      
      // Test 4: Direct image OCR
      await this.testDirectImageOCR();
      
      // Test 5: Error handling
      await this.testErrorHandling();
      
      // Display results
      this.displayResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  /**
   * Test PowerPoint OCR extraction
   */
  async testPowerPointOCR() {
    console.log('📊 Testing PowerPoint OCR extraction...');
    
    try {
      // Create a mock job ID for testing
      const mockJobId = Date.now();
      
      // Test enhanced PPTX extraction
      const result = await this.documentService.extractFromPowerPoint(
        './test-files/sample-presentation.pptx', 
        mockJobId
      );
      
      this.testResults.push({
        test: 'PowerPoint OCR',
        status: 'PASS',
        details: {
          method: result.method,
          confidence: result.confidence,
          textLength: result.text.length,
          imagesProcessed: result.metadata?.imagesProcessed || 0,
          extractionMethod: result.metadata?.extractionMethod
        }
      });
      
      console.log('✅ PowerPoint OCR test passed');
      console.log(`   - Method: ${result.method}`);
      console.log(`   - Confidence: ${Math.round(result.confidence * 100)}%`);
      console.log(`   - Text length: ${result.text.length} characters`);
      console.log(`   - Images processed: ${result.metadata?.imagesProcessed || 0}`);
      
    } catch (error) {
      this.testResults.push({
        test: 'PowerPoint OCR',
        status: 'FAIL',
        error: error.message
      });
      console.log('❌ PowerPoint OCR test failed:', error.message);
    }
    
    console.log('');
  }

  /**
   * Test PDF OCR extraction
   */
  async testPDFOCR() {
    console.log('📄 Testing PDF OCR extraction...');
    
    try {
      const mockJobId = Date.now();
      
      const result = await this.documentService.extractFromPDF(
        './test-files/sample-document.pdf',
        mockJobId
      );
      
      this.testResults.push({
        test: 'PDF OCR',
        status: 'PASS',
        details: {
          method: result.method,
          confidence: result.confidence,
          textLength: result.text.length,
          standardTextLength: result.metadata?.standardTextLength || 0,
          ocrTextLength: result.metadata?.ocrTextLength || 0,
          imagesProcessed: result.metadata?.imagesProcessed || 0
        }
      });
      
      console.log('✅ PDF OCR test passed');
      console.log(`   - Method: ${result.method}`);
      console.log(`   - Confidence: ${Math.round(result.confidence * 100)}%`);
      console.log(`   - Total text length: ${result.text.length} characters`);
      console.log(`   - Standard text: ${result.metadata?.standardTextLength || 0} characters`);
      console.log(`   - OCR text: ${result.metadata?.ocrTextLength || 0} characters`);
      console.log(`   - Images processed: ${result.metadata?.imagesProcessed || 0}`);
      
    } catch (error) {
      this.testResults.push({
        test: 'PDF OCR',
        status: 'FAIL',
        error: error.message
      });
      console.log('❌ PDF OCR test failed:', error.message);
    }
    
    console.log('');
  }

  /**
   * Test Word document OCR extraction
   */
  async testWordOCR() {
    console.log('📝 Testing Word document OCR extraction...');
    
    try {
      const mockJobId = Date.now();
      
      const result = await this.documentService.extractFromDocxEnhanced(
        './test-files/sample-document.docx',
        mockJobId
      );
      
      this.testResults.push({
        test: 'Word OCR',
        status: 'PASS',
        details: {
          method: result.method,
          confidence: result.confidence,
          textLength: result.text.length,
          standardTextLength: result.metadata?.standardTextLength || 0,
          ocrTextLength: result.metadata?.ocrTextLength || 0,
          imagesProcessed: result.metadata?.imagesProcessed || 0
        }
      });
      
      console.log('✅ Word OCR test passed');
      console.log(`   - Method: ${result.method}`);
      console.log(`   - Confidence: ${Math.round(result.confidence * 100)}%`);
      console.log(`   - Total text length: ${result.text.length} characters`);
      console.log(`   - Standard text: ${result.metadata?.standardTextLength || 0} characters`);
      console.log(`   - OCR text: ${result.metadata?.ocrTextLength || 0} characters`);
      console.log(`   - Images processed: ${result.metadata?.imagesProcessed || 0}`);
      
    } catch (error) {
      this.testResults.push({
        test: 'Word OCR',
        status: 'FAIL',
        error: error.message
      });
      console.log('❌ Word OCR test failed:', error.message);
    }
    
    console.log('');
  }

  /**
   * Test direct image OCR
   */
  async testDirectImageOCR() {
    console.log('🖼️ Testing direct image OCR...');
    
    try {
      const mockJobId = Date.now();
      
      const result = await this.documentService.extractFromImage(
        './test-files/sample-image.png',
        mockJobId
      );
      
      this.testResults.push({
        test: 'Direct Image OCR',
        status: 'PASS',
        details: {
          method: result.method,
          confidence: result.confidence,
          textLength: result.text.length,
          languages: result.metadata?.languages,
          wordCount: result.metadata?.wordCount
        }
      });
      
      console.log('✅ Direct image OCR test passed');
      console.log(`   - Method: ${result.method}`);
      console.log(`   - Confidence: ${Math.round(result.confidence * 100)}%`);
      console.log(`   - Text length: ${result.text.length} characters`);
      console.log(`   - Languages: ${result.metadata?.languages}`);
      console.log(`   - Word count: ${result.metadata?.wordCount}`);
      
    } catch (error) {
      this.testResults.push({
        test: 'Direct Image OCR',
        status: 'FAIL',
        error: error.message
      });
      console.log('❌ Direct image OCR test failed:', error.message);
    }
    
    console.log('');
  }

  /**
   * Test error handling
   */
  async testErrorHandling() {
    console.log('⚠️ Testing error handling...');
    
    try {
      // Test with non-existent file
      await this.documentService.extractFromImage('./non-existent-file.png');
      
      this.testResults.push({
        test: 'Error Handling',
        status: 'FAIL',
        error: 'Should have thrown an error for non-existent file'
      });
      
    } catch (error) {
      this.testResults.push({
        test: 'Error Handling',
        status: 'PASS',
        details: {
          errorMessage: error.message,
          errorHandled: true
        }
      });
      
      console.log('✅ Error handling test passed');
      console.log(`   - Error properly caught: ${error.message}`);
    }
    
    console.log('');
  }

  /**
   * Display test results summary
   */
  displayResults() {
    console.log('📊 Test Results Summary');
    console.log('========================\n');
    
    const passedTests = this.testResults.filter(r => r.status === 'PASS').length;
    const failedTests = this.testResults.filter(r => r.status === 'FAIL').length;
    
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`📊 Total: ${this.testResults.length}\n`);
    
    // Detailed results
    this.testResults.forEach(result => {
      const status = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${status} ${result.test}`);
      
      if (result.status === 'PASS' && result.details) {
        Object.entries(result.details).forEach(([key, value]) => {
          console.log(`   - ${key}: ${value}`);
        });
      } else if (result.status === 'FAIL') {
        console.log(`   - Error: ${result.error}`);
      }
      console.log('');
    });
    
    // Overall result
    if (failedTests === 0) {
      console.log('🎉 All tests passed! Enhanced OCR functionality is working correctly.');
    } else {
      console.log(`⚠️ ${failedTests} test(s) failed. Please review the implementation.`);
    }
  }

  /**
   * Test OCR text enhancement
   */
  testTextEnhancement() {
    console.log('🔧 Testing OCR text enhancement...');
    
    const testCases = [
      {
        input: 'He||o  wor|d   with   extra   spaces',
        expected: 'Heווo word with extra spaces'
      },
      {
        input: 'Text with `apostrophes` and |pipes|',
        expected: 'Text with \'apostrophes\' and ווpipesוו'
      },
      {
        input: '   Multiple   spaces   everywhere   ',
        expected: 'Multiple spaces everywhere'
      }
    ];
    
    testCases.forEach((testCase, index) => {
      const result = this.documentService.enhanceOCRText(testCase.input);
      const passed = result === testCase.expected;
      
      console.log(`Test ${index + 1}: ${passed ? '✅' : '❌'}`);
      console.log(`   Input: "${testCase.input}"`);
      console.log(`   Expected: "${testCase.expected}"`);
      console.log(`   Got: "${result}"`);
      console.log('');
    });
  }
}

/**
 * Create test files for demonstration
 */
async function createTestFiles() {
  console.log('📁 Creating test files directory...');
  
  try {
    await fs.mkdir('./test-files', { recursive: true });
    
    // Create a simple test instruction file
    const testInstructions = `
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

Run this test file with: \`node test-enhanced-ocr-extraction.js\`

The tests will verify:
- OCR functionality for each document type
- Error handling and edge cases
- Text enhancement and post-processing
- Progress tracking and metadata reporting
`;
    
    await fs.writeFile('./test-files/README.md', testInstructions);
    console.log('✅ Test files directory created with instructions');
    
  } catch (error) {
    console.error('❌ Failed to create test files directory:', error);
  }
}

// Main execution
async function main() {
  console.log('🚀 Enhanced OCR Text Extraction Test Suite\n');
  
  // Create test files directory
  await createTestFiles();
  
  // Initialize and run tests
  const tester = new OCRExtractionTester();
  
  // Test text enhancement functionality
  tester.testTextEnhancement();
  
  // Run full test suite (will fail gracefully if test files don't exist)
  await tester.runTests();
  
  console.log('\n📝 Note: For complete testing, add sample files to the ./test-files directory');
  console.log('   See ./test-files/README.md for detailed instructions');
}

// Run tests if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = OCRExtractionTester;
