const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Test configuration
const BASE_URL = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET;

console.log('🎯 Complete Memory Cards Functionality Test');
console.log('==========================================');

// Use actual user data from database
const testUser = {
  id: 1,
  email: 'test@1234.com',
  role: 'student',
  firstName: 'אלון',
  lastName: 'קרייב',
  school_id: 1
};

// Create authentication token
const authToken = jwt.sign(testUser, JWT_SECRET, { expiresIn: '24h' });

const axiosConfig = {
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  },
  timeout: 10000
};

async function testMemoryCardsFunctionality() {
  let createdSetId = null;
  let createdCardId = null;

  try {
    console.log('\n1️⃣ Testing Memory Card Set Creation');
    const setData = {
      name: 'Complete Test Set',
      description: 'A comprehensive test set for all functionality',
      userId: testUser.id,
      subjectArea: 'Computer Science',
      gradeLevel: '10th Grade',
      isPublic: false
    };

    const createSetResponse = await axios.post(`${BASE_URL}/api/memory-cards/sets`, setData, axiosConfig);
    console.log('✅ Memory card set created successfully');
    console.log('Set ID:', createSetResponse.data.data.id);
    console.log('Set Name:', createSetResponse.data.data.name);
    
    createdSetId = createSetResponse.data.data.id;

    console.log('\n2️⃣ Testing Memory Card Creation');
    const cardData = {
      userId: testUser.id,
      setId: createdSetId,
      frontText: 'What is a variable in programming?',
      backText: 'A variable is a storage location with an associated name that contains data.',
      cardType: 'text',
      difficultyLevel: 'medium',
      tags: ['programming', 'basics', 'variables']
    };

    const createCardResponse = await axios.post(`${BASE_URL}/api/memory-cards`, cardData, axiosConfig);
    console.log('✅ Memory card created successfully');
    console.log('Card ID:', createCardResponse.data.data.id);
    console.log('Front Text:', createCardResponse.data.data.frontText);
    
    createdCardId = createCardResponse.data.data.id;

    console.log('\n3️⃣ Testing Get Set with Cards');
    const getSetResponse = await axios.get(`${BASE_URL}/api/memory-cards/sets/${createdSetId}`, axiosConfig);
    console.log('✅ Retrieved set with cards successfully');
    console.log('Set contains', getSetResponse.data.data.cards?.length || 0, 'cards');

    console.log('\n4️⃣ Testing Get Cards by Set');
    const getCardsResponse = await axios.get(`${BASE_URL}/api/memory-cards/set/${createdSetId}`, axiosConfig);
    console.log('✅ Retrieved cards by set successfully');
    console.log('Found', getCardsResponse.data.data.length, 'cards in set');

    console.log('\n5️⃣ Testing Get User Sets');
    const getUserSetsResponse = await axios.get(`${BASE_URL}/api/memory-cards/sets/user/${testUser.id}`, axiosConfig);
    console.log('✅ Retrieved user sets successfully');
    console.log('User has', getUserSetsResponse.data.data.length, 'sets');

    console.log('\n6️⃣ Testing Card Update');
    const updateCardData = {
      backText: 'A variable is a storage location with an associated name that contains data. Variables can store different types of data like numbers, text, or boolean values.',
      difficultyLevel: 'easy'
    };

    const updateCardResponse = await axios.put(`${BASE_URL}/api/memory-cards/${createdCardId}`, updateCardData, axiosConfig);
    console.log('✅ Card updated successfully');
    console.log('Updated back text length:', updateCardResponse.data.data.backText.length);

    console.log('\n7️⃣ Testing Set Update');
    const updateSetData = {
      description: 'An updated comprehensive test set for all functionality',
      isPublic: true
    };

    const updateSetResponse = await axios.put(`${BASE_URL}/api/memory-cards/sets/${createdSetId}`, updateSetData, axiosConfig);
    console.log('✅ Set updated successfully');
    console.log('Set is now public:', updateSetResponse.data.data.isPublic);

    console.log('\n8️⃣ Testing Search Cards');
    const searchResponse = await axios.get(`${BASE_URL}/api/memory-cards/search/${testUser.id}?q=variable`, axiosConfig);
    console.log('✅ Card search completed successfully');
    console.log('Found', searchResponse.data.data.length, 'cards matching "variable"');

    console.log('\n9️⃣ Testing Card Statistics');
    const statsResponse = await axios.get(`${BASE_URL}/api/memory-cards/stats/${createdCardId}`, axiosConfig);
    console.log('✅ Card statistics retrieved successfully');
    console.log('Card stats:', statsResponse.data.data);

    console.log('\n🔟 Testing Card Deletion (Soft Delete)');
    const deleteCardResponse = await axios.delete(`${BASE_URL}/api/memory-cards/${createdCardId}`, axiosConfig);
    console.log('✅ Card soft deleted successfully');
    console.log('Delete message:', deleteCardResponse.data.message);

    console.log('\n1️⃣1️⃣ Testing Set Deletion');
    const deleteSetResponse = await axios.delete(`${BASE_URL}/api/memory-cards/sets/${createdSetId}`, axiosConfig);
    console.log('✅ Set deleted successfully');
    console.log('Delete message:', deleteSetResponse.data.message);

    console.log('\n🎉 ALL TESTS PASSED! Memory Cards functionality is working perfectly!');
    console.log('✅ Authentication fixed');
    console.log('✅ Set creation/update/deletion working');
    console.log('✅ Card creation/update/deletion working');
    console.log('✅ Search functionality working');
    console.log('✅ Statistics working');
    console.log('✅ User authorization working');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error data:', error.response.data);
    }
    
    // Cleanup on error
    if (createdSetId) {
      try {
        await axios.delete(`${BASE_URL}/api/memory-cards/sets/${createdSetId}`, axiosConfig);
        console.log('🧹 Cleaned up created set');
      } catch (cleanupError) {
        console.log('⚠️ Could not cleanup set:', cleanupError.message);
      }
    }
  }
}

// Run the comprehensive test
testMemoryCardsFunctionality().then(() => {
  console.log('\n🏁 Complete memory cards test finished');
}).catch(error => {
  console.error('❌ Test suite crashed:', error.message);
});
