// Content Security Middleware - Basic Implementation
// This provides fallback implementations for content security functions

/**
 * Detect and redact PII from text content
 * Basic implementation - in production this would use more sophisticated PII detection
 */
function detectAndRedactPII(text) {
  if (!text || typeof text !== 'string') {
    return {
      content: text,
      piiFound: false,
      redactions: []
    };
  }

  // Basic patterns for common PII (email, phone numbers, etc.)
  const piiPatterns = [
    {
      name: 'email',
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      replacement: '[EMAIL_REDACTED]'
    },
    {
      name: 'phone',
      pattern: /\b\d{3}-\d{3}-\d{4}\b|\b\d{10}\b/g,
      replacement: '[PHONE_REDACTED]'
    },
    {
      name: 'israeli_id',
      pattern: /\b\d{9}\b/g,
      replacement: '[ID_REDACTED]'
    }
  ];

  let redactedContent = text;
  const redactions = [];
  let piiFound = false;

  for (const pattern of piiPatterns) {
    const matches = text.match(pattern.pattern);
    if (matches) {
      piiFound = true;
      redactions.push({
        type: pattern.name,
        count: matches.length,
        matches: matches
      });
      redactedContent = redactedContent.replace(pattern.pattern, pattern.replacement);
    }
  }

  return {
    content: redactedContent,
    piiFound,
    redactions
  };
}

/**
 * Validate content quality
 * Basic implementation - checks for minimum content requirements
 */
function validateContentQuality(content, contentType) {
  if (!content) {
    return {
      isValid: false,
      score: 0,
      issues: ['Content is empty or null']
    };
  }

  const issues = [];
  let score = 100;

  switch (contentType) {
    case 'transcription':
      if (!content.transcription_text) {
        issues.push('Missing transcription text');
        score -= 50;
      } else {
        const textLength = content.transcription_text.length;
        if (textLength < 50) {
          issues.push('Transcription text is too short');
          score -= 30;
        }
        if (textLength > 10000) {
          issues.push('Transcription text is very long');
          score -= 10;
        }
      }
      break;

    case 'summary':
      if (!content.summary_text) {
        issues.push('Missing summary text');
        score -= 50;
      } else {
        const textLength = content.summary_text.length;
        if (textLength < 20) {
          issues.push('Summary text is too short');
          score -= 30;
        }
      }
      break;

    case 'test':
      if (!Array.isArray(content) || content.length === 0) {
        issues.push('No questions found');
        score -= 50;
      } else {
        const validQuestions = content.filter(q => q && q.question_text);
        if (validQuestions.length < content.length) {
          issues.push('Some questions are missing text');
          score -= 20;
        }
        if (validQuestions.length < 3) {
          issues.push('Too few valid questions');
          score -= 20;
        }
      }
      break;

    default:
      issues.push('Unknown content type');
      score -= 20;
  }

  return {
    isValid: score >= 50,
    score: Math.max(0, score),
    issues
  };
}

/**
 * Generate a secure sharing token
 */
function generateSharingToken() {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Check rate limiting for content sharing
 * Basic implementation - in production this would use Redis or similar
 */
async function checkRateLimit(userId, action) {
  // For now, always allow - in production implement proper rate limiting
  return {
    allowed: true,
    limit: 10,
    remaining: 9,
    resetTime: new Date(Date.now() + 3600000) // 1 hour from now
  };
}

/**
 * Log content access for audit purposes
 * Basic implementation - logs to console, in production would use proper logging service
 */
async function logContentAccess(logData) {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...logData
    };
    
    console.log('Content Access Log:', JSON.stringify(logEntry));
    
    // In production, you would store this in a database or send to a logging service
    return true;
  } catch (error) {
    console.error('Failed to log content access:', error);
    return false;
  }
}

/**
 * Validate school access (placeholder)
 * This function is imported but not used in the current implementation
 */
async function validateSchoolAccess(userId, resourceIds) {
  // Placeholder implementation
  return {
    valid: true,
    message: 'Access granted'
  };
}

module.exports = {
  detectAndRedactPII,
  validateContentQuality,
  generateSharingToken,
  checkRateLimit,
  logContentAccess,
  validateSchoolAccess
};
