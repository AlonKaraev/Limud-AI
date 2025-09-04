const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Test configuration
const BASE_URL = 'http://localhost:5000';
const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123'
};

async function testExtractedTextModalFix() {
  console.log('🧪 Testing ExtractedTextModal fix for images...\n');

  try {
    // Step 1: Login to get token
    console.log('1. Logging in...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(TEST_USER)
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Login successful');

    // Step 2: Get user's images
    console.log('\n2. Fetching user images...');
    const imagesResponse = await fetch(`${BASE_URL}/api/images`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!imagesResponse.ok) {
      throw new Error(`Failed to fetch images: ${imagesResponse.status}`);
    }

    const imagesData = await imagesResponse.json();
    console.log(`✅ Found ${imagesData.images?.length || 0} images`);

    if (!imagesData.images || imagesData.images.length === 0) {
      console.log('⚠️  No images found. Please upload some images first.');
      return;
    }

    // Step 3: Find an image with completed OCR extraction
    console.log('\n3. Looking for images with completed OCR extraction...');
    let imageWithText = null;

    for (const image of imagesData.images) {
      console.log(`   Checking image: ${image.original_filename || image.filename}`);
      
      // Check extraction status
      const statusResponse = await fetch(`${BASE_URL}/api/images/${image.id}/extraction-status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        console.log(`   - Extraction status: ${statusData.extractionStatus}`);
        
        if (statusData.extractionStatus === 'completed') {
          imageWithText = image;
          console.log(`   ✅ Found image with completed extraction: ${image.original_filename || image.filename}`);
          break;
        }
      }
    }

    if (!imageWithText) {
      console.log('⚠️  No images with completed OCR extraction found.');
      console.log('   Please wait for OCR processing to complete or trigger manual extraction.');
      return;
    }

    // Step 4: Test the fixed endpoint - fetch extracted text
    console.log(`\n4. Testing extracted text retrieval for image ID: ${imageWithText.id}`);
    const textResponse = await fetch(`${BASE_URL}/api/images/${imageWithText.id}/text`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`   Response status: ${textResponse.status}`);

    if (textResponse.ok) {
      const textData = await textResponse.json();
      console.log('✅ Successfully retrieved extracted text!');
      console.log(`   - Text length: ${textData.extraction?.text?.length || 0} characters`);
      console.log(`   - Extraction method: ${textData.extraction?.method || 'unknown'}`);
      console.log(`   - Confidence: ${textData.extraction?.confidence ? Math.round(textData.extraction.confidence * 100) + '%' : 'unknown'}`);
      console.log(`   - Language: ${textData.extraction?.language || 'unknown'}`);
      
      if (textData.extraction?.text) {
        const preview = textData.extraction.text.substring(0, 100);
        console.log(`   - Text preview: "${preview}${textData.extraction.text.length > 100 ? '...' : ''}"`);
      }

      console.log('\n🎉 ExtractedTextModal fix is working correctly!');
      console.log('   The modal should now be able to fetch and display extracted text from images.');
      
    } else {
      const errorData = await textResponse.json();
      console.log(`❌ Failed to retrieve extracted text: ${errorData.error || 'Unknown error'}`);
      console.log(`   Error code: ${errorData.code || 'N/A'}`);
      
      if (errorData.error === 'טקסט מחולץ לא נמצא עבור תמונה זו') {
        console.log('   This might mean the OCR extraction hasn\'t completed yet or failed.');
      }
    }

    // Step 5: Test with a non-existent image ID
    console.log('\n5. Testing with non-existent image ID...');
    const nonExistentResponse = await fetch(`${BASE_URL}/api/images/999999/text`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (nonExistentResponse.status === 404) {
      const errorData = await nonExistentResponse.json();
      console.log('✅ Correctly returns 404 for non-existent image');
      console.log(`   Error message: ${errorData.error}`);
    } else {
      console.log(`⚠️  Unexpected response for non-existent image: ${nonExistentResponse.status}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testExtractedTextModalFix();
}

module.exports = { testExtractedTextModalFix };
