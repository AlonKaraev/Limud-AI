/**
 * Token Manager - Handles JWT token storage, validation, and refresh
 * Provides centralized token management for the Limud AI application
 */

class TokenManager {
  constructor() {
    this.tokenKey = 'token'; // Match the key used in the original App.js
    this.userKey = 'limudai_user_data';
    this.refreshThreshold = 5 * 60 * 1000; // 5 minutes before expiry
    this.refreshPromise = null; // Prevent multiple simultaneous refresh attempts
  }

  /**
   * Store authentication token and user data
   * @param {string} token - JWT token
   * @param {object} userData - User information
   */
  setToken(token, userData = null) {
    try {
      localStorage.setItem(this.tokenKey, token);
      if (userData) {
        localStorage.setItem(this.userKey, JSON.stringify(userData));
      }
      
      // Set up automatic refresh if token is valid
      this.scheduleTokenRefresh(token);
      
      console.log('✅ Token stored successfully');
    } catch (error) {
      console.error('❌ Failed to store token:', error);
      throw new Error('Failed to store authentication token');
    }
  }

  /**
   * Get stored authentication token
   * @returns {string|null} JWT token or null if not found
   */
  getToken() {
    try {
      const token = localStorage.getItem(this.tokenKey);
      
      if (!token) {
        return null;
      }

      // Validate token format
      if (!this.isValidTokenFormat(token)) {
        console.warn('⚠️ Invalid token format found, removing...');
        this.clearToken();
        return null;
      }

      // Check if token is expired
      if (this.isTokenExpired(token)) {
        console.warn('⚠️ Token expired, removing...');
        this.clearToken();
        return null;
      }

      return token;
    } catch (error) {
      console.error('❌ Failed to get token:', error);
      return null;
    }
  }

  /**
   * Get stored user data
   * @returns {object|null} User data or null if not found
   */
  getUserData() {
    try {
      const userData = localStorage.getItem(this.userKey);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('❌ Failed to get user data:', error);
      return null;
    }
  }

  /**
   * Clear stored token and user data
   */
  clearToken() {
    try {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
      console.log('✅ Token cleared successfully');
    } catch (error) {
      console.error('❌ Failed to clear token:', error);
    }
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} True if authenticated, false otherwise
   */
  isAuthenticated() {
    const token = this.getToken();
    return !!token;
  }

  /**
   * Get authorization header for API requests
   * @returns {object|null} Authorization header object or null
   */
  getAuthHeader() {
    const token = this.getToken();
    
    if (!token) {
      return null;
    }

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Validate token format (basic JWT structure check)
   * @param {string} token - JWT token to validate
   * @returns {boolean} True if format is valid
   */
  isValidTokenFormat(token) {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // JWT should have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    // Each part should be base64 encoded (basic check)
    try {
      parts.forEach(part => {
        if (!part) throw new Error('Empty part');
        // Try to decode base64 (will throw if invalid)
        atob(part.replace(/-/g, '+').replace(/_/g, '/'));
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if token is expired
   * @param {string} token - JWT token to check
   * @returns {boolean} True if expired
   */
  isTokenExpired(token) {
    try {
      const payload = this.decodeTokenPayload(token);
      if (!payload || !payload.exp) {
        return true;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp <= currentTime;
    } catch (error) {
      console.error('❌ Failed to check token expiration:', error);
      return true;
    }
  }

  /**
   * Check if token needs refresh (within threshold of expiry)
   * @param {string} token - JWT token to check
   * @returns {boolean} True if needs refresh
   */
  needsRefresh(token) {
    try {
      const payload = this.decodeTokenPayload(token);
      if (!payload || !payload.exp) {
        return true;
      }

      const currentTime = Date.now();
      const expiryTime = payload.exp * 1000;
      const timeUntilExpiry = expiryTime - currentTime;

      return timeUntilExpiry <= this.refreshThreshold;
    } catch (error) {
      console.error('❌ Failed to check token refresh need:', error);
      return true;
    }
  }

  /**
   * Decode JWT token payload
   * @param {string} token - JWT token to decode
   * @returns {object|null} Decoded payload or null
   */
  decodeTokenPayload(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch (error) {
      console.error('❌ Failed to decode token payload:', error);
      return null;
    }
  }

  /**
   * Get token expiration info
   * @param {string} token - JWT token to analyze
   * @returns {object} Token expiration information
   */
  getTokenInfo(token = null) {
    const targetToken = token || this.getToken();
    
    if (!targetToken) {
      return {
        valid: false,
        expired: true,
        timeUntilExpiry: 0,
        expiryDate: null
      };
    }

    try {
      const payload = this.decodeTokenPayload(targetToken);
      if (!payload || !payload.exp) {
        return {
          valid: false,
          expired: true,
          timeUntilExpiry: 0,
          expiryDate: null
        };
      }

      const currentTime = Date.now();
      const expiryTime = payload.exp * 1000;
      const timeUntilExpiry = expiryTime - currentTime;
      const expired = timeUntilExpiry <= 0;

      return {
        valid: true,
        expired,
        timeUntilExpiry: Math.max(0, timeUntilExpiry),
        expiryDate: new Date(expiryTime),
        payload: {
          id: payload.id,
          email: payload.email,
          role: payload.role,
          school_id: payload.school_id
        }
      };
    } catch (error) {
      console.error('❌ Failed to get token info:', error);
      return {
        valid: false,
        expired: true,
        timeUntilExpiry: 0,
        expiryDate: null
      };
    }
  }

  /**
   * Schedule automatic token refresh
   * @param {string} token - Current token
   */
  scheduleTokenRefresh(token) {
    const tokenInfo = this.getTokenInfo(token);
    
    if (!tokenInfo.valid || tokenInfo.expired) {
      return;
    }

    const refreshTime = Math.max(1000, tokenInfo.timeUntilExpiry - this.refreshThreshold);
    
    setTimeout(() => {
      if (this.needsRefresh(this.getToken())) {
        console.log('🔄 Token needs refresh, triggering refresh...');
        this.triggerTokenRefresh();
      }
    }, refreshTime);
  }

  /**
   * Trigger token refresh (to be implemented with actual refresh endpoint)
   */
  async triggerTokenRefresh() {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    try {
      this.refreshPromise = this.performTokenRefresh();
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Perform actual token refresh using the server refresh endpoint
   */
  async performTokenRefresh() {
    console.log('🔄 Performing token refresh...');
    
    try {
      const currentToken = localStorage.getItem(this.tokenKey);
      if (!currentToken) {
        throw new Error('No token available for refresh');
      }

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.token) {
          // Store the new token
          this.setToken(data.token, data.user);
          console.log('✅ Token refreshed successfully');
          
          // Trigger refresh success event
          window.dispatchEvent(new CustomEvent('tokenRefreshed', {
            detail: { 
              message: 'Session refreshed successfully',
              user: data.user
            }
          }));
          
          return true;
        } else {
          throw new Error('Invalid refresh response');
        }
      } else {
        // Refresh failed - token is likely expired or invalid
        throw new Error(`Refresh failed with status: ${response.status}`);
      }
    } catch (error) {
      console.warn('⚠️ Token refresh failed:', error.message);
      
      // Clear invalid token
      this.clearToken();
      
      // Trigger login redirect or show login modal
      window.dispatchEvent(new CustomEvent('tokenExpired', {
        detail: { 
          message: 'Your session has expired. Please login again.',
          reason: error.message
        }
      }));
      
      return false;
    }
  }

  /**
   * Make authenticated API request with automatic token handling
   * @param {string} url - API endpoint URL
   * @param {object} options - Fetch options
   * @returns {Promise<Response>} Fetch response
   */
  async authenticatedFetch(url, options = {}) {
    const authHeaders = this.getAuthHeader();
    
    if (!authHeaders) {
      throw new Error('No authentication token available');
    }

    const requestOptions = {
      ...options,
      headers: {
        ...authHeaders,
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, requestOptions);
      
      // Handle authentication errors
      if (response.status === 401) {
        const errorData = await response.json().catch(() => ({}));
        
        if (errorData.code === 'INVALID_TOKEN' || errorData.code === 'MISSING_TOKEN') {
          console.warn('⚠️ Authentication failed, clearing token...');
          this.clearToken();
          
          window.dispatchEvent(new CustomEvent('authenticationFailed', {
            detail: { 
              message: 'Authentication failed. Please login again.',
              errorCode: errorData.code
            }
          }));
        }
        
        throw new Error(`Authentication failed: ${errorData.error || 'Unknown error'}`);
      }

      return response;
    } catch (error) {
      console.error('❌ Authenticated fetch failed:', error);
      throw error;
    }
  }

  /**
   * Debug token information (development only)
   */
  debugToken() {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    const token = this.getToken();
    const userData = this.getUserData();
    const tokenInfo = this.getTokenInfo(token);

    console.log('🔍 Token Debug Info:', {
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      tokenValid: tokenInfo.valid,
      tokenExpired: tokenInfo.expired,
      timeUntilExpiry: tokenInfo.timeUntilExpiry,
      expiryDate: tokenInfo.expiryDate,
      userData,
      payload: tokenInfo.payload
    });
  }
}

// Create singleton instance
const tokenManager = new TokenManager();

export default tokenManager;
