const http = require('http');

function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

async function testLogin() {
  try {
    console.log('🔐 Testing login fix...');
    
    // Login request
    const loginData = JSON.stringify({
      email: 'principal@example-school.co.il',
      password: 'principal123'
    });

    const loginOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    };

    console.log('📤 Sending login request...');
    const loginResponse = await makeRequest(loginOptions, loginData);
    
    if (loginResponse.statusCode === 200) {
      const loginResult = JSON.parse(loginResponse.body);
      console.log('✅ Login successful!');
      console.log('👤 User:', loginResult.user.firstName, loginResult.user.lastName);
      
      // Test profile endpoint
      const profileOptions = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/profile',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${loginResult.token}`
        }
      };

      console.log('📤 Testing profile endpoint...');
      const profileResponse = await makeRequest(profileOptions);
      
      if (profileResponse.statusCode === 200) {
        const profileResult = JSON.parse(profileResponse.body);
        console.log('✅ Profile fetch successful!');
        console.log('👤 Profile data:', profileResult.user);
        console.log('🎉 Fix verified - req.user.toJSON() is working properly!');
      } else {
        console.log('❌ Profile fetch failed:', profileResponse.statusCode);
        console.log('Response:', profileResponse.body);
      }
      
    } else {
      console.log('❌ Login failed:', loginResponse.statusCode);
      console.log('Response:', loginResponse.body);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testLogin();
