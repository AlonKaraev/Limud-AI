const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

class ConsoleLogger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  /**
   * Format timestamp for logging
   */
  getTimestamp() {
    return new Date().toLocaleString('he-IL', {
      timeZone: 'Asia/Jerusalem',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * Log authentication errors with detailed context
   */
  logAuthError(errorType, details = {}) {
    const timestamp = this.getTimestamp();
    const icon = '🔐';
    
    console.log(`\n${colors.red}${colors.bright}${icon} [AUTH ERROR] ${timestamp}${colors.reset}`);
    console.log(`${colors.red}├── Type: ${errorType}${colors.reset}`);
    
    if (details.endpoint) {
      console.log(`${colors.red}├── Endpoint: ${details.method || 'POST'} ${details.endpoint}${colors.reset}`);
    }
    
    if (details.email) {
      console.log(`${colors.red}├── User: ${details.email}${colors.reset}`);
    }
    
    if (details.userId) {
      console.log(`${colors.red}├── User ID: ${details.userId}${colors.reset}`);
    }
    
    if (details.ip) {
      console.log(`${colors.red}├── IP: ${details.ip}${colors.reset}`);
    }
    
    if (details.userAgent) {
      const shortAgent = details.userAgent.substring(0, 50) + (details.userAgent.length > 50 ? '...' : '');
      console.log(`${colors.red}├── User-Agent: ${shortAgent}${colors.reset}`);
    }
    
    if (details.reason) {
      console.log(`${colors.red}├── Reason: ${details.reason}${colors.reset}`);
    }
    
    if (details.message) {
      console.log(`${colors.red}├── Details: ${details.message}${colors.reset}`);
    }
    
    if (details.validationErrors && Array.isArray(details.validationErrors)) {
      console.log(`${colors.red}├── Validation Errors:${colors.reset}`);
      details.validationErrors.forEach(err => {
        console.log(`${colors.red}│   ├── ${err.field}: ${err.message}${colors.reset}`);
      });
    }
    
    if (this.isDevelopment && details.stack) {
      console.log(`${colors.red}└── Stack: ${details.stack}${colors.reset}`);
    } else {
      console.log(`${colors.red}└── [End Auth Error]${colors.reset}`);
    }
    
    console.log(''); // Empty line for readability
  }

  /**
   * Log authentication success events
   */
  logAuthSuccess(eventType, details = {}) {
    if (!this.isDevelopment) return; // Only log success in development
    
    const timestamp = this.getTimestamp();
    const icon = '✅';
    
    console.log(`\n${colors.green}${colors.bright}${icon} [AUTH SUCCESS] ${timestamp}${colors.reset}`);
    console.log(`${colors.green}├── Type: ${eventType}${colors.reset}`);
    
    if (details.email) {
      console.log(`${colors.green}├── User: ${details.email}${colors.reset}`);
    }
    
    if (details.role) {
      console.log(`${colors.green}├── Role: ${details.role}${colors.reset}`);
    }
    
    if (details.endpoint) {
      console.log(`${colors.green}├── Endpoint: ${details.method || 'POST'} ${details.endpoint}${colors.reset}`);
    }
    
    console.log(`${colors.green}└── [End Auth Success]${colors.reset}`);
    console.log('');
  }

  /**
   * Log content sharing errors with detailed context
   */
  logSharingError(errorType, details = {}) {
    const timestamp = this.getTimestamp();
    const icon = '📤';
    
    console.log(`\n${colors.yellow}${colors.bright}${icon} [SHARING ERROR] ${timestamp}${colors.reset}`);
    console.log(`${colors.yellow}├── Type: ${errorType}${colors.reset}`);
    
    if (details.userId) {
      console.log(`${colors.yellow}├── User ID: ${details.userId}${colors.reset}`);
    }
    
    if (details.userEmail) {
      console.log(`${colors.yellow}├── User: ${details.userEmail}${colors.reset}`);
    }
    
    if (details.recordingId) {
      console.log(`${colors.yellow}├── Recording: ${details.recordingId}${colors.reset}`);
    }
    
    if (details.contentTypes && Array.isArray(details.contentTypes)) {
      console.log(`${colors.yellow}├── Content Types: [${details.contentTypes.join(', ')}]${colors.reset}`);
    }
    
    if (details.targetClasses && Array.isArray(details.targetClasses)) {
      console.log(`${colors.yellow}├── Target Classes: [${details.targetClasses.join(', ')}]${colors.reset}`);
    }
    
    if (details.missingContent && Array.isArray(details.missingContent)) {
      console.log(`${colors.yellow}├── Missing Content: [${details.missingContent.join(', ')}]${colors.reset}`);
    }
    
    if (details.message) {
      console.log(`${colors.yellow}├── Details: ${details.message}${colors.reset}`);
    }
    
    if (details.suggestion) {
      console.log(`${colors.yellow}├── Suggestion: ${details.suggestion}${colors.reset}`);
    }
    
    if (details.dbError) {
      console.log(`${colors.yellow}├── Database Error: ${details.dbError}${colors.reset}`);
    }
    
    if (this.isDevelopment && details.stack) {
      console.log(`${colors.yellow}└── Stack: ${details.stack}${colors.reset}`);
    } else {
      console.log(`${colors.yellow}└── [End Sharing Error]${colors.reset}`);
    }
    
    console.log('');
  }

  /**
   * Log content sharing success events
   */
  logSharingSuccess(details = {}) {
    if (!this.isDevelopment) return; // Only log success in development
    
    const timestamp = this.getTimestamp();
    const icon = '🎯';
    
    console.log(`\n${colors.green}${colors.bright}${icon} [SHARING SUCCESS] ${timestamp}${colors.reset}`);
    
    if (details.userEmail) {
      console.log(`${colors.green}├── User: ${details.userEmail}${colors.reset}`);
    }
    
    if (details.recordingId) {
      console.log(`${colors.green}├── Recording: ${details.recordingId}${colors.reset}`);
    }
    
    if (details.contentTypes && Array.isArray(details.contentTypes)) {
      console.log(`${colors.green}├── Shared Content: [${details.contentTypes.join(', ')}]${colors.reset}`);
    }
    
    if (details.classCount) {
      console.log(`${colors.green}├── Classes: ${details.classCount}${colors.reset}`);
    }
    
    if (details.studentCount) {
      console.log(`${colors.green}├── Students Reached: ${details.studentCount}${colors.reset}`);
    }
    
    console.log(`${colors.green}└── [End Sharing Success]${colors.reset}`);
    console.log('');
  }

  /**
   * Log database errors with context
   */
  logDatabaseError(operation, error, details = {}) {
    const timestamp = this.getTimestamp();
    const icon = '🗄️';
    
    console.log(`\n${colors.red}${colors.bright}${icon} [DATABASE ERROR] ${timestamp}${colors.reset}`);
    console.log(`${colors.red}├── Operation: ${operation}${colors.reset}`);
    console.log(`${colors.red}├── Error Code: ${error.code || 'UNKNOWN'}${colors.reset}`);
    console.log(`${colors.red}├── Message: ${error.message}${colors.reset}`);
    
    if (details.query) {
      console.log(`${colors.red}├── Query: ${details.query.substring(0, 100)}...${colors.reset}`);
    }
    
    if (details.params) {
      console.log(`${colors.red}├── Parameters: ${JSON.stringify(details.params)}${colors.reset}`);
    }
    
    if (this.isDevelopment && error.stack) {
      console.log(`${colors.red}└── Stack: ${error.stack}${colors.reset}`);
    } else {
      console.log(`${colors.red}└── [End Database Error]${colors.reset}`);
    }
    
    console.log('');
  }

  /**
   * Log rate limiting events
   */
  logRateLimit(details = {}) {
    const timestamp = this.getTimestamp();
    const icon = '⏱️';
    
    console.log(`\n${colors.magenta}${colors.bright}${icon} [RATE LIMIT] ${timestamp}${colors.reset}`);
    console.log(`${colors.magenta}├── IP: ${details.ip || 'Unknown'}${colors.reset}`);
    console.log(`${colors.magenta}├── Endpoint: ${details.endpoint || 'Unknown'}${colors.reset}`);
    console.log(`${colors.magenta}├── Attempts: ${details.attempts || 'Unknown'}${colors.reset}`);
    console.log(`${colors.magenta}├── Window: ${details.windowMs || 'Unknown'}ms${colors.reset}`);
    console.log(`${colors.magenta}└── [End Rate Limit]${colors.reset}`);
    console.log('');
  }

  /**
   * Log general errors with context
   */
  logError(category, error, details = {}) {
    const timestamp = this.getTimestamp();
    const icon = '❌';
    
    console.log(`\n${colors.red}${colors.bright}${icon} [${category.toUpperCase()} ERROR] ${timestamp}${colors.reset}`);
    console.log(`${colors.red}├── Message: ${error.message || error}${colors.reset}`);
    
    Object.keys(details).forEach(key => {
      if (details[key] !== undefined && details[key] !== null) {
        console.log(`${colors.red}├── ${key}: ${details[key]}${colors.reset}`);
      }
    });
    
    if (this.isDevelopment && error.stack) {
      console.log(`${colors.red}└── Stack: ${error.stack}${colors.reset}`);
    } else {
      console.log(`${colors.red}└── [End ${category} Error]${colors.reset}`);
    }
    
    console.log('');
  }
}

// Export singleton instance
module.exports = new ConsoleLogger();
