
const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const router = express.Router();

router.get('/debug-jwt', (req, res) => {
  const serverSecret = process.env.JWT_SECRET || 'your-secret-key';
  const testPayload = { test: 'data', timestamp: Date.now() };
  
  try {
    const token = jwt.sign(testPayload, serverSecret, { expiresIn: '1h' });
    const decoded = jwt.verify(token, serverSecret);
    
    res.json({
      success: true,
      serverSecretLength: serverSecret.length,
      serverSecretPreview: serverSecret.substring(0, 20) + '...',
      tokenCreated: !!token,
      tokenVerified: !!decoded,
      nodeEnv: process.env.NODE_ENV,
      allEnvVars: Object.keys(process.env).filter(key => key.includes('JWT')),
      testToken: token
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      serverSecretLength: serverSecret.length,
      serverSecretPreview: serverSecret.substring(0, 20) + '...'
    });
  }
});

module.exports = router;
