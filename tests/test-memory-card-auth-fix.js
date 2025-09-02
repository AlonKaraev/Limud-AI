const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Test configuration
const BASE_URL = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || '39586eb47901b8845324a6e36fbd172393309d3a40dbea5f909ed9e2349c9a7b';

console.log('🔧 Memory Card Authentication Fix Test');
console.log('====================================');

// Use actual user data from database
const actualUser = {
  id: 1,
  email: 'test@1234.com',
  role: 'student',
  firstName: 'אלון',
  lastName: 'קרייב',
  school_id: 1
};

const testMemoryCardSet = {
  name: 'Test Memory Card Set',
  description: 'A test set for debugging authentication',
  userId: actualUser.id,
  subjectArea: 'Mathematics',
  gradeLevel: '5th Grade',
  isPublic: false
};

async function testWithActualUser() {
  try {
    console.log('\n1️⃣ Creating token with actual user data');
    const testPayload = {
      id: actualUser.id,
      email: actualUser.email,
      role: actualUser.role,
      firstName: actualUser.firstName,
      lastName: actualUser.lastName,
      school_id: actualUser.school_id
    };

    const testToken = jwt.sign(testPayload, JWT_SECRET, { expiresIn: '24h' });
    console.log('✅ Token created with actual user data');
    console.log('User ID:', testPayload.id);
    console.log('Email:', testPayload.email);
    console.log('Role:', testPayload.role);

    console.log('\n2️⃣ Testing memory cards endpoint');
    try {
      const response = await axios.post(
        `${BASE_URL}/api/memory-cards/sets`,
        testMemoryCardSet,
        {
          headers: {
            'Authorization': `Bearer ${testToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      console.log('✅ SUCCESS! Memory cards endpoint working');
      console.log('Response status:', response.status);
      console.log('Response data:', response.data);
      
    } catch (apiError) {
      console.log('❌ Still failing with actual user data');
      console.log('Status:', apiError.response?.status);
      console.log('Error data:', apiError.response?.data);
      
      if (apiError.response?.status === 401) {
        console.log('\n🔍 The issue might be:');
        console.log('1. User verification status (is_verified = 0)');
        console.log('2. Environment variable mismatch on server');
        console.log('3. Database connection issues during auth');
        console.log('4. JWT secret mismatch on server side');
      }
    }

    console.log('\n3️⃣ Testing with verified user');
    // First, let's verify the user in the database
    const { query, run } = require('../server/config/database-sqlite');
    
    console.log('Verifying user in database...');
    await run('UPDATE users SET is_verified = 1 WHERE id = ?', [actualUser.id]);
    console.log('✅ User verified in database');
    
    // Test again with verified user
    try {
      const response = await axios.post(
        `${BASE_URL}/api/memory-cards/sets`,
        testMemoryCardSet,
        {
          headers: {
            'Authorization': `Bearer ${testToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      console.log('✅ SUCCESS! Memory cards endpoint working with verified user');
      console.log('Response status:', response.status);
      console.log('Response data:', response.data);
      
    } catch (apiError) {
      console.log('❌ Still failing even with verified user');
      console.log('Status:', apiError.response?.status);
      console.log('Error data:', apiError.response?.data);
      
      // Let's check what the server is actually receiving
      console.log('\n🔍 Debugging server-side token processing...');
      console.log('Token being sent:', testToken.substring(0, 50) + '...');
      
      // Try to decode the token the same way the server does
      try {
        const decoded = jwt.verify(testToken, JWT_SECRET);
        console.log('Local token decode successful:', {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role
        });
        
        // Check if user exists with this ID
        const userCheck = await query('SELECT * FROM users WHERE id = ?', [decoded.id]);
        console.log('User exists in DB:', userCheck.rows.length > 0);
        if (userCheck.rows.length > 0) {
          console.log('User verification status:', userCheck.rows[0].is_verified);
          console.log('User role:', userCheck.rows[0].role);
        }
        
      } catch (decodeError) {
        console.log('Local token decode failed:', decodeError.message);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the test
testWithActualUser().then(() => {
  console.log('\n🏁 Authentication fix test completed');
}).catch(error => {
  console.error('❌ Test crashed:', error.message);
});
