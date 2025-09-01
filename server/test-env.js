require('dotenv').config({ path: '../.env' });

console.log('Environment variables from server directory:');
console.log('JWT_SECRET:', process.env.JWT_SECRET);
console.log('JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 'undefined');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);

// Test if the server can load the User model and verify tokens
const User = require('./models/User');
const jwt = require('jsonwebtoken');

const testPayload = {
  id: 1,
  email: 'test@1234.com',
  role: 'student'
};

try {
  const token = jwt.sign(testPayload, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
  console.log('Token created successfully');
  
  const decoded = User.verifyToken(token);
  console.log('Token verified successfully by User model');
  console.log('Decoded:', decoded);
} catch (error) {
  console.log('Token verification failed:', error.message);
}
