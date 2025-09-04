const fetch = require('node-fetch');

async function testDocumentsAPI() {
  console.log('🔍 Testing Documents API directly...');
  
  try {
    // First, try to login to get a token
    console.log('1. Attempting login...');
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);
    
    if (!loginResponse.ok || !loginData.token) {
      console.log('❌ Login failed, trying to create a test user...');
      
      // Try to register a test user
      const registerResponse = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
          role: 'teacher'
        })
      });
      
      const registerData = await registerResponse.json();
      console.log('Register response:', registerData);
      
      if (!registerResponse.ok) {
        console.log('❌ Registration also failed. Exiting...');
        return;
      }
      
      // Try login again
      const loginResponse2 = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        })
      });
      
      const loginData2 = await loginResponse2.json();
      if (!loginResponse2.ok || !loginData2.token) {
        console.log('❌ Second login attempt failed. Exiting...');
        return;
      }
      
      loginData.token = loginData2.token;
      loginData.user = loginData2.user;
    }
    
    console.log('✅ Login successful!');
    console.log('User ID:', loginData.user.id);
    console.log('User Email:', loginData.user.email);
    
    // Now test the documents API
    console.log('\n2. Testing documents API...');
    const documentsResponse = await fetch('http://localhost:5000/api/documents', {
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });
    
    const documentsData = await documentsResponse.json();
    console.log('Documents API response status:', documentsResponse.status);
    console.log('Documents API response:', JSON.stringify(documentsData, null, 2));
    
    if (documentsData.documents) {
      console.log(`📊 Found ${documentsData.documents.length} documents for user ${loginData.user.id}`);
      
      if (documentsData.documents.length > 0) {
        console.log('📄 Sample document:');
        console.log(JSON.stringify(documentsData.documents[0], null, 2));
      }
    }
    
    // Test debug endpoints if available
    console.log('\n3. Testing debug endpoints...');
    
    const dbStatusResponse = await fetch('http://localhost:5000/api/debug/db-status', {
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });
    
    if (dbStatusResponse.ok) {
      const dbStatusData = await dbStatusResponse.json();
      console.log('Database status:', JSON.stringify(dbStatusData, null, 2));
    }
    
    const documentsTableResponse = await fetch('http://localhost:5000/api/debug/documents-table', {
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });
    
    if (documentsTableResponse.ok) {
      const documentsTableData = await documentsTableResponse.json();
      console.log('Documents table debug:', JSON.stringify(documentsTableData, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error);
  }
}

// Run the test
testDocumentsAPI();
