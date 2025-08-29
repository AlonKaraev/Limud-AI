const axios = require('axios');

async function testLoginFix() {
  try {
    console.log('Testing login fix...');
    
    // First, let's try to create a test user or login with existing credentials
    const loginData = {
      email: 'test@example.com',
      password: 'TestPassword123'
    };
    
    console.log('Attempting login...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', loginData);
    
    if (loginResponse.data.token) {
      console.log('✅ Login successful');
      
      // Now test the profile endpoint that was causing the error
      console.log('Testing profile endpoint...');
      const profileResponse = await axios.get('http://localhost:5000/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${loginResponse.data.token}`
        }
      });
      
      console.log('✅ Profile fetch successful:', profileResponse.data);
      console.log('✅ Fix verified - req.user.toJSON() is working properly');
    }
    
  } catch (error) {
    if (error.response) {
      console.log('❌ Error:', error.response.status, error.response.data);
      
      if (error.response.data.code === 'INVALID_CREDENTIALS') {
        console.log('ℹ️  Test user doesn\'t exist. Let\'s try to register one...');
        
        try {
          const registerData = {
            email: 'test@example.com',
            password: 'TestPassword123',
            role: 'teacher',
            firstName: 'Test',
            lastName: 'User',
            schoolId: 1
          };
          
          const registerResponse = await axios.post('http://localhost:5000/api/auth/register', registerData);
          console.log('✅ Registration successful');
          
          // Now try the profile endpoint with the new token
          const profileResponse = await axios.get('http://localhost:5000/api/auth/profile', {
            headers: {
              'Authorization': `Bearer ${registerResponse.data.token}`
            }
          });
          
          console.log('✅ Profile fetch successful:', profileResponse.data);
          console.log('✅ Fix verified - req.user.toJSON() is working properly');
          
        } catch (registerError) {
          if (registerError.response) {
            console.log('❌ Registration error:', registerError.response.status, registerError.response.data);
          } else {
            console.log('❌ Registration error:', registerError.message);
          }
        }
      }
    } else {
      console.log('❌ Network error:', error.message);
    }
  }
}

testLoginFix();
