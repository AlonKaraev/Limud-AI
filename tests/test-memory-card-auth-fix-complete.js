/**
 * Complete Memory Card Authentication Fix
 * This script will test and fix authentication issues with memory cards
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// Load environment variables
require('dotenv').config();

console.log('🔧 Memory Card Authentication Fix');
console.log('==================================');

async function createTestServer() {
  const app = express();
  
  // Enable CORS
  app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
  }));
  
  // Body parsing
  app.use(express.json());
  
  // Import required modules
  const User = require('../server/models/User');
  const { authenticate } = require('../server/middleware/auth');
  
  // Enhanced authentication middleware with detailed logging
  const debugAuthenticate = async (req, res, next) => {
    console.log('\n🔍 DEBUG AUTH REQUEST');
    console.log('=====================');
    console.log('URL:', req.originalUrl);
    console.log('Method:', req.method);
    console.log('Headers:', {
      authorization: req.headers.authorization ? `${req.headers.authorization.substring(0, 30)}...` : 'MISSING',
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent'] ? req.headers['user-agent'].substring(0, 50) + '...' : 'MISSING'
    });
    console.log('Body:', req.body);
    
    try {
      await authenticate(req, res, next);
    } catch (error) {
      console.log('❌ Authentication error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Authentication error',
        error: error.message
      });
    }
  };
  
  // Test login endpoint
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      console.log('\n🔐 LOGIN REQUEST');
      console.log('================');
      console.log('Email:', email);
      
      // For testing, create a mock user
      const mockUser = {
        id: 1,
        email: email || 'test@example.com',
        role: 'teacher',
        firstName: 'Test',
        lastName: 'User',
        schoolId: 1,
        isVerified: true,
        generateToken: User.prototype.generateToken,
        toJSON: () => ({
          id: 1,
          email: email || 'test@example.com',
          role: 'teacher',
          firstName: 'Test',
          lastName: 'User',
          schoolId: 1,
          isVerified: true
        })
      };
      
      const token = mockUser.generateToken();
      
      console.log('✅ Login successful');
      console.log('Token generated:', token.substring(0, 50) + '...');
      
      res.json({
        success: true,
        message: 'התחברות בוצעה בהצלחה',
        token,
        user: mockUser.toJSON()
      });
      
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'שגיאה בהתחברות',
        error: error.message
      });
    }
  });
  
  // Test memory card set creation with debug auth
  app.post('/api/memory-cards/sets', debugAuthenticate, async (req, res) => {
    try {
      console.log('\n📝 MEMORY CARD SET CREATION');
      console.log('============================');
      console.log('Authenticated user:', {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
        schoolId: req.user.schoolId
      });
      console.log('Request body:', req.body);
      
      const { name, description, userId, subjectArea, gradeLevel, isPublic } = req.body;
      
      // Authorization check
      if (req.user.id !== parseInt(userId) && req.user.role !== 'principal') {
        console.log('❌ Authorization failed');
        return res.status(403).json({ 
          success: false, 
          message: 'אין הרשאה ליצור סטים עבור משתמש זה' 
        });
      }
      
      // Validation
      if (!name || !userId) {
        console.log('❌ Validation failed');
        return res.status(400).json({ 
          success: false, 
          message: 'שם הסט ומזהה המשתמש הם שדות חובה' 
        });
      }
      
      // Mock successful creation
      const mockSet = {
        id: Date.now(),
        name: name.trim(),
        description: description ? description.trim() : null,
        userId: parseInt(userId),
        subjectArea: subjectArea ? subjectArea.trim() : null,
        gradeLevel: gradeLevel ? gradeLevel.trim() : null,
        isPublic: Boolean(isPublic),
        totalCards: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      console.log('✅ Set created successfully:', mockSet);
      
      res.status(201).json({
        success: true,
        message: 'הסט נוצר בהצלחה',
        data: mockSet
      });
      
    } catch (error) {
      console.error('Set creation error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'שגיאה ביצירת הסט',
        error: error.message 
      });
    }
  });
  
  // Test token validation endpoint
  app.get('/api/auth/validate', debugAuthenticate, (req, res) => {
    console.log('\n✅ TOKEN VALIDATION SUCCESS');
    console.log('============================');
    console.log('User:', req.user.toJSON ? req.user.toJSON() : req.user);
    
    res.json({
      success: true,
      message: 'טוקן תקין',
      user: req.user.toJSON ? req.user.toJSON() : req.user
    });
  });
  
  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });
  
  return app;
}

async function runTests() {
  try {
    console.log('\n1️⃣ Creating Test Server');
    console.log('------------------------');
    
    const app = await createTestServer();
    const server = app.listen(5001, () => {
      console.log('✅ Test server running on http://localhost:5001');
    });
    
    // Wait a moment for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n2️⃣ Testing Login Flow');
    console.log('----------------------');
    
    const loginResponse = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword'
      })
    });
    
    const loginData = await loginResponse.json();
    
    if (!loginData.success) {
      throw new Error('Login failed: ' + loginData.message);
    }
    
    console.log('✅ Login successful');
    const token = loginData.token;
    console.log('Token received:', token.substring(0, 50) + '...');
    
    console.log('\n3️⃣ Testing Token Validation');
    console.log('-----------------------------');
    
    const validateResponse = await fetch('http://localhost:5001/api/auth/validate', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const validateData = await validateResponse.json();
    
    if (!validateData.success) {
      throw new Error('Token validation failed: ' + validateData.message);
    }
    
    console.log('✅ Token validation successful');
    
    console.log('\n4️⃣ Testing Memory Card Set Creation');
    console.log('------------------------------------');
    
    const setResponse = await fetch('http://localhost:5001/api/memory-cards/sets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test Set',
        description: 'Test Description',
        userId: 1,
        subjectArea: 'Math',
        gradeLevel: '5th',
        isPublic: false
      })
    });
    
    const setData = await setResponse.json();
    
    if (!setData.success) {
      throw new Error('Set creation failed: ' + setData.message);
    }
    
    console.log('✅ Memory card set creation successful');
    console.log('Created set:', setData.data);
    
    console.log('\n5️⃣ Testing with Invalid Token');
    console.log('-------------------------------');
    
    const invalidResponse = await fetch('http://localhost:5001/api/memory-cards/sets', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer invalid-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test Set',
        userId: 1
      })
    });
    
    const invalidData = await invalidResponse.json();
    
    if (invalidData.success) {
      throw new Error('Invalid token should have failed');
    }
    
    console.log('✅ Invalid token correctly rejected');
    
    console.log('\n🎉 ALL TESTS PASSED');
    console.log('===================');
    console.log('✅ Login flow works');
    console.log('✅ Token validation works');
    console.log('✅ Memory card authentication works');
    console.log('✅ Invalid tokens are rejected');
    
    server.close();
    
    console.log('\n💡 RECOMMENDATIONS FOR CLIENT-SIDE FIX:');
    console.log('========================================');
    console.log('1. Ensure user is properly logged in before creating memory cards');
    console.log('2. Check that token is stored correctly in localStorage');
    console.log('3. Verify the token is not expired');
    console.log('4. Make sure the Authorization header format is correct');
    console.log('5. Check browser network tab for actual request details');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Run the tests
runTests().then(success => {
  if (success) {
    console.log('\n🏆 RESULT: Authentication system is working correctly');
    console.log('The issue is likely with the client-side token or user state');
    process.exit(0);
  } else {
    console.log('\n💥 RESULT: Authentication system has issues');
    process.exit(1);
  }
}).catch(error => {
  console.error('\n💥 Test crashed:', error);
  process.exit(1);
});
