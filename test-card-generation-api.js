/**
 * Test script for Basic AI Card Generation API
 * Tests the complete flow: text input → AI processing → card generation → Hebrew output
 */

const fetch = require('node-fetch');

// Test configuration
const TEST_CONFIG = {
  serverUrl: 'http://localhost:3001',
  testText: `
שיעור במתמטיקה - חשבון שברים

היום נלמד על שברים. שבר הוא חלק ממספר שלם. 
השבר מורכב משני חלקים: המונה והמכנה.
המונה הוא המספר העליון, והמכנה הוא המספר התחתון.

לדוגמה: בשבר 3/4, המספר 3 הוא המונה והמספר 4 הוא המכנה.
זה אומר שיש לנו 3 חלקים מתוך 4 חלקים שלמים.

כדי לחבר שברים עם אותו מכנה, אנחנו מחברים רק את המונים:
1/4 + 2/4 = 3/4

כדי לחבר שברים עם מכנים שונים, אנחנו צריכים למצוא מכנה משותף:
1/2 + 1/3 = 3/6 + 2/6 = 5/6

זכרו: תמיד לפשט את השבר לצורה הפשוטה ביותר!
  `,
  cardConfig: {
    cardCount: 8,
    difficultyLevel: 'medium',
    subjectArea: 'מתמטיקה',
    gradeLevel: 'כיתה ד',
    language: 'hebrew'
  }
};

// Mock user credentials (you'll need to replace with actual test user)
const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword'
};

let authToken = null;

/**
 * Authenticate and get token
 */
async function authenticate() {
  console.log('🔐 Authenticating test user...');
  
  try {
    const response = await fetch(`${TEST_CONFIG.serverUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(TEST_USER)
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      authToken = result.token;
      console.log('✅ Authentication successful');
      return true;
    } else {
      console.error('❌ Authentication failed:', result.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    return false;
  }
}

/**
 * Test card generation from text
 */
async function testCardGenerationFromText() {
  console.log('\n🎴 Testing card generation from text...');
  
  try {
    const response = await fetch(`${TEST_CONFIG.serverUrl}/api/memory-cards/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: TEST_CONFIG.testText,
        config: TEST_CONFIG.cardConfig
      })
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Card generation successful');
      console.log(`📊 Generated ${result.cards.length} cards`);
      console.log(`⏱️  Processing time: ${result.metadata.processingTime}ms`);
      
      // Display generated cards
      console.log('\n📋 Generated Cards:');
      result.cards.forEach((card, index) => {
        console.log(`\n${index + 1}. ${card.frontText}`);
        console.log(`   תשובה: ${card.backText}`);
        console.log(`   רמת קושי: ${card.difficultyLevel}`);
        if (card.tags && card.tags.length > 0) {
          console.log(`   תגיות: ${card.tags.join(', ')}`);
        }
      });
      
      return result;
    } else {
      console.error('❌ Card generation failed:', result.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Card generation error:', error.message);
    return null;
  }
}

/**
 * Test Hebrew text processing
 */
function testHebrewTextProcessing(cards) {
  console.log('\n🔤 Testing Hebrew text processing...');
  
  let hebrewTestsPassed = 0;
  let totalTests = 0;
  
  cards.forEach((card, index) => {
    totalTests += 2; // Test front and back text
    
    // Test Hebrew characters in front text
    const hebrewRegex = /[\u0590-\u05FF]/;
    if (hebrewRegex.test(card.frontText)) {
      hebrewTestsPassed++;
      console.log(`✅ Card ${index + 1} front text contains Hebrew`);
    } else {
      console.log(`❌ Card ${index + 1} front text missing Hebrew`);
    }
    
    // Test Hebrew characters in back text
    if (hebrewRegex.test(card.backText)) {
      hebrewTestsPassed++;
      console.log(`✅ Card ${index + 1} back text contains Hebrew`);
    } else {
      console.log(`❌ Card ${index + 1} back text missing Hebrew`);
    }
  });
  
  const passRate = (hebrewTestsPassed / totalTests) * 100;
  console.log(`\n📈 Hebrew processing success rate: ${passRate.toFixed(1)}% (${hebrewTestsPassed}/${totalTests})`);
  
  return passRate >= 80; // Consider 80% success rate as passing
}

/**
 * Test card quality
 */
function testCardQuality(cards) {
  console.log('\n🎯 Testing card quality...');
  
  let qualityTests = {
    hasContent: 0,
    appropriateLength: 0,
    hasVariety: 0,
    total: 0
  };
  
  cards.forEach((card, index) => {
    qualityTests.total++;
    
    // Test 1: Has meaningful content
    if (card.frontText.length > 10 && card.backText.length > 5) {
      qualityTests.hasContent++;
    }
    
    // Test 2: Appropriate length (not too long)
    if (card.frontText.length < 200 && card.backText.length < 300) {
      qualityTests.appropriateLength++;
    }
  });
  
  // Test 3: Has variety in question types
  const uniqueFrontStarts = new Set(
    cards.map(card => card.frontText.substring(0, 10))
  );
  if (uniqueFrontStarts.size >= Math.min(cards.length * 0.7, 5)) {
    qualityTests.hasVariety = cards.length;
  }
  
  console.log(`✅ Content quality: ${qualityTests.hasContent}/${qualityTests.total}`);
  console.log(`✅ Length appropriateness: ${qualityTests.appropriateLength}/${qualityTests.total}`);
  console.log(`✅ Question variety: ${qualityTests.hasVariety > 0 ? 'Good' : 'Poor'}`);
  
  const overallQuality = (
    (qualityTests.hasContent / qualityTests.total) +
    (qualityTests.appropriateLength / qualityTests.total) +
    (qualityTests.hasVariety > 0 ? 1 : 0)
  ) / 3;
  
  console.log(`📊 Overall quality score: ${(overallQuality * 100).toFixed(1)}%`);
  
  return overallQuality >= 0.7; // 70% quality threshold
}

/**
 * Test API response format
 */
function testAPIResponseFormat(result) {
  console.log('\n🔧 Testing API response format...');
  
  const tests = [
    { name: 'Has success field', test: () => typeof result.success === 'boolean' },
    { name: 'Has cards array', test: () => Array.isArray(result.cards) },
    { name: 'Has metadata', test: () => typeof result.metadata === 'object' },
    { name: 'Cards have required fields', test: () => 
      result.cards.every(card => 
        card.frontText && card.backText && card.difficultyLevel
      )
    },
    { name: 'Metadata has processing time', test: () => 
      typeof result.metadata.processingTime === 'number'
    }
  ];
  
  let passed = 0;
  tests.forEach(test => {
    try {
      if (test.test()) {
        console.log(`✅ ${test.name}`);
        passed++;
      } else {
        console.log(`❌ ${test.name}`);
      }
    } catch (error) {
      console.log(`❌ ${test.name} - Error: ${error.message}`);
    }
  });
  
  console.log(`📊 API format tests: ${passed}/${tests.length} passed`);
  return passed === tests.length;
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting Basic AI Card Generation API Tests');
  console.log('=' .repeat(50));
  
  // Step 1: Authenticate
  const authSuccess = await authenticate();
  if (!authSuccess) {
    console.log('\n❌ Tests failed: Could not authenticate');
    process.exit(1);
  }
  
  // Step 2: Test card generation
  const generationResult = await testCardGenerationFromText();
  if (!generationResult) {
    console.log('\n❌ Tests failed: Card generation failed');
    process.exit(1);
  }
  
  // Step 3: Test API response format
  const formatTest = testAPIResponseFormat(generationResult);
  
  // Step 4: Test Hebrew text processing
  const hebrewTest = testHebrewTextProcessing(generationResult.cards);
  
  // Step 5: Test card quality
  const qualityTest = testCardQuality(generationResult.cards);
  
  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📋 TEST SUMMARY');
  console.log('=' .repeat(50));
  
  const testResults = [
    { name: 'Authentication', passed: authSuccess },
    { name: 'Card Generation', passed: !!generationResult },
    { name: 'API Response Format', passed: formatTest },
    { name: 'Hebrew Text Processing', passed: hebrewTest },
    { name: 'Card Quality', passed: qualityTest }
  ];
  
  testResults.forEach(test => {
    console.log(`${test.passed ? '✅' : '❌'} ${test.name}`);
  });
  
  const overallSuccess = testResults.every(test => test.passed);
  
  console.log('\n' + (overallSuccess ? '🎉' : '⚠️') + ' Overall Result: ' + 
    (overallSuccess ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'));
  
  if (overallSuccess) {
    console.log('\n✅ Basic AI Card Generation API is working correctly!');
    console.log('✅ Hebrew text processing is functional');
    console.log('✅ Generated cards meet quality standards');
    console.log('\nThe API is ready for production use.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the issues above.');
  }
  
  process.exit(overallSuccess ? 0 : 1);
}

// Handle command line arguments
if (process.argv.includes('--help')) {
  console.log(`
Basic AI Card Generation API Test Script

Usage: node test-card-generation-api.js [options]

Options:
  --help          Show this help message
  --server URL    Set server URL (default: http://localhost:3001)

Before running:
1. Make sure the server is running
2. Update TEST_USER credentials with valid test user
3. Ensure AI services are configured

Example:
  node test-card-generation-api.js --server http://localhost:3000
  `);
  process.exit(0);
}

// Override server URL if provided
const serverArg = process.argv.indexOf('--server');
if (serverArg !== -1 && process.argv[serverArg + 1]) {
  TEST_CONFIG.serverUrl = process.argv[serverArg + 1];
}

// Run tests
runTests().catch(error => {
  console.error('💥 Test runner crashed:', error);
  process.exit(1);
});
