import React, { useState, useEffect, createContext, useContext } from 'react';
import { heTranslations } from './translations';
import { ThemeProvider, useTheme, ThemeToggleButton } from './contexts/ThemeContext';
import tokenManager from './utils/TokenManager';
import './styles/theme.css';
import './styles/components.css';
import './styles/forms.css';
import RecordingInterface from './components/RecordingInterface';
import SessionManager from './components/SessionManager';
import LessonsManager from './components/LessonsManager';
import PrincipalDashboard from './components/PrincipalDashboard';
import StudentDashboard from './components/StudentDashboard';
import TeacherDashboard from './components/TeacherDashboard';

// Create contexts for global state management
const AuthContext = createContext();
const LanguageContext = createContext();

// Custom hooks
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};

// Translation helper function
const getNestedTranslation = (obj, path) => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

// Authentication Provider
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    initializeAuth();
    
    // Listen for token events
    const handleTokenExpired = () => {
      console.log('🔄 Token expired, clearing user state');
      setUser(null);
    };
    
    const handleTokenRefreshed = (event) => {
      console.log('🔄 Token refreshed, updating user data');
      if (event.detail.user) {
        setUser(event.detail.user);
      }
    };
    
    const handleAuthFailed = () => {
      console.log('🔄 Authentication failed, clearing user state');
      setUser(null);
    };

    window.addEventListener('tokenExpired', handleTokenExpired);
    window.addEventListener('tokenRefreshed', handleTokenRefreshed);
    window.addEventListener('authenticationFailed', handleAuthFailed);

    return () => {
      window.removeEventListener('tokenExpired', handleTokenExpired);
      window.removeEventListener('tokenRefreshed', handleTokenRefreshed);
      window.removeEventListener('authenticationFailed', handleAuthFailed);
    };
  }, []);

  const initializeAuth = async () => {
    try {
      // Check if we have a valid token
      if (tokenManager.isAuthenticated()) {
        const userData = tokenManager.getUserData();
        if (userData) {
          setUser(userData);
          console.log('✅ User authenticated from stored token:', userData.email);
        } else {
          // Token exists but no user data, validate with server
          await validateCurrentUser();
        }
      }
    } catch (error) {
      console.error('❌ Error initializing auth:', error);
      tokenManager.clearToken();
    } finally {
      setLoading(false);
    }
  };

  const validateCurrentUser = async () => {
    try {
      const response = await tokenManager.authenticatedFetch('/api/auth/validate');
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
          // Update stored user data
          tokenManager.setToken(tokenManager.getToken(), data.user);
          console.log('✅ User validated with server:', data.user.email);
        }
      }
    } catch (error) {
      console.error('❌ Error validating user:', error);
      tokenManager.clearToken();
      setUser(null);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Use TokenManager to store token and user data
        tokenManager.setToken(data.token, data.user);
        setUser(data.user);
        console.log('✅ Login successful:', data.user.email);
        return { success: true, data };
      } else {
        console.log('❌ Login failed:', data.error);
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      return { success: false, error: 'שגיאה בתהליך ההתחברות' };
    }
  };

  const register = async (userData) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ Registration successful:', data.user.email);
        return { success: true, data };
      } else {
        console.log('❌ Registration failed:', data.error);
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      return { success: false, error: 'שגיאה ביצירת המשתמש' };
    }
  };

  const logout = async () => {
    try {
      // Call server logout endpoint if authenticated
      if (tokenManager.isAuthenticated()) {
        await tokenManager.authenticatedFetch('/api/auth/logout', {
          method: 'POST'
        });
      }
    } catch (error) {
      console.error('❌ Logout error:', error);
    } finally {
      // Always clear local state
      tokenManager.clearToken();
      setUser(null);
      console.log('✅ User logged out');
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    tokenManager // Expose tokenManager for advanced usage
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Language Provider
const LanguageProvider = ({ children }) => {
  const t = (key, params = {}) => {
    let translation = getNestedTranslation(heTranslations, key) || key;
    
    // Replace parameters in translation
    Object.keys(params).forEach(param => {
      translation = translation.replace(`{{${param}}}`, params[param]);
    });
    
    return translation;
  };

  return (
    <LanguageContext.Provider value={{ t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Login Form Component
const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(email, password);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title text-center">
          {t('auth.login')}
        </h2>
      </div>
      <form className="form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">{t('auth.email')}</label>
          <input
            className="form-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">{t('auth.password')}</label>
          <input
            className="form-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions form-actions-center">
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? (
              <>
                {t('auth.login')}
                <div className="loading-spinner loading-spinner-small"></div>
              </>
            ) : (
              t('auth.login')
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

// Registration Form Component
const RegisterForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'student',
    schoolId: 1
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [detailedErrors, setDetailedErrors] = useState([]);
  const { register } = useAuth();
  const { t } = useTranslation();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    
    // Clear field error when user starts typing
    if (fieldErrors[e.target.name]) {
      setFieldErrors({
        ...fieldErrors,
        [e.target.name]: ''
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    const errorList = [];

    // Email validation
    if (!formData.email) {
      errors.email = t('validation.emailRequired');
      errorList.push(t('validation.emailRequired'));
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = t('validation.emailInvalid');
      errorList.push(t('validation.emailInvalid'));
    }

    // First name validation
    if (!formData.firstName || formData.firstName.trim().length < 2) {
      errors.firstName = t('validation.firstNameRequired');
      errorList.push(t('validation.firstNameRequired'));
    }

    // Last name validation
    if (!formData.lastName || formData.lastName.trim().length < 2) {
      errors.lastName = t('validation.lastNameRequired');
      errorList.push(t('validation.lastNameRequired'));
    }

    // Phone validation (optional but if provided must be valid)
    if (formData.phone && !/^05\d{8}$/.test(formData.phone)) {
      errors.phone = t('validation.phoneInvalid');
      errorList.push(t('validation.phoneInvalid'));
    }

    // Password validation - collect ALL password errors
    const passwordErrors = [];
    if (!formData.password) {
      passwordErrors.push(t('validation.passwordRequired'));
    } else {
      if (formData.password.length < 8) {
        passwordErrors.push(t('validation.passwordMinLength', { min: 8 }));
      }
      if (!/(?=.*[a-z])/.test(formData.password)) {
        passwordErrors.push('הסיסמה חייבת להכיל לפחות אות קטנה אחת (a-z)');
      }
      if (!/(?=.*[A-Z])/.test(formData.password)) {
        passwordErrors.push('הסיסמה חייבת להכיל לפחות אות גדולה אחת (A-Z)');
      }
      if (!/(?=.*\d)/.test(formData.password)) {
        passwordErrors.push('הסיסמה חייבת להכיל לפחות מספר אחד (0-9)');
      }
    }
    
    if (passwordErrors.length > 0) {
      errors.password = passwordErrors.join(', ');
      errorList.push(...passwordErrors);
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = t('errors.passwordMismatch');
      errorList.push(t('errors.passwordMismatch'));
    }

    return { errors, errorList };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setFieldErrors({});
    setShowErrorPopup(false);

    // Client-side validation
    const { errors, errorList } = validateForm();
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setDetailedErrors(errorList);
      setShowErrorPopup(true);
      setError('אנא תקן את השגיאות המסומנות בטופס');
      setLoading(false);
      return;
    }

    const result = await register(formData);
    
    if (result.success) {
      setSuccess(t('auth.registrationSuccess'));
    } else {
      setError(result.error);
      
      // Handle server validation errors
      if (result.error && typeof result.error === 'object' && result.error.details) {
        const serverErrors = {};
        const serverErrorList = [];
        
        result.error.details.forEach(detail => {
          serverErrors[detail.field] = detail.message;
          serverErrorList.push(detail.message);
        });
        
        setFieldErrors(serverErrors);
        setDetailedErrors(serverErrorList);
        setShowErrorPopup(true);
      }
    }
    
    setLoading(false);
  };

  return (
    <>
      {showErrorPopup && (
        <div className="error-popup">
          <div className="error-popup-header">
            שגיאות בטופס
            <button className="error-popup-close" onClick={() => setShowErrorPopup(false)}>
              ×
            </button>
          </div>
          <ul className="error-list">
            {detailedErrors.map((error, index) => (
              <li key={index} className="error-list-item">{error}</li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="card">
        <div className="card-header">
          <h2 className="card-title text-center">
            {t('auth.register')}
          </h2>
        </div>
        <form className="form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label form-label-required">{t('auth.email')}</label>
              <input
                className={`form-input ${fieldErrors.email ? 'error' : ''}`}
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
              {fieldErrors.email && <div className="form-error">{fieldErrors.email}</div>}
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label className="form-label form-label-required">{t('auth.firstName')}</label>
              <input
                className={`form-input ${fieldErrors.firstName ? 'error' : ''}`}
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
              {fieldErrors.firstName && <div className="form-error">{fieldErrors.firstName}</div>}
            </div>
            
            <div className="form-group">
              <label className="form-label form-label-required">{t('auth.lastName')}</label>
              <input
                className={`form-input ${fieldErrors.lastName ? 'error' : ''}`}
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
              {fieldErrors.lastName && <div className="form-error">{fieldErrors.lastName}</div>}
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label className="form-label form-label-optional">{t('auth.phone')}</label>
              <input
                className={`form-input ${fieldErrors.phone ? 'error' : ''}`}
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="05XXXXXXXX"
              />
              {fieldErrors.phone && <div className="form-error">{fieldErrors.phone}</div>}
            </div>
            
            <div className="form-group">
              <label className="form-label form-label-required">{t('auth.role')}</label>
              <select
                className="form-select"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
              >
                <option value="student">{t('auth.student')}</option>
                <option value="teacher">{t('auth.teacher')}</option>
              </select>
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label className="form-label form-label-required">{t('auth.password')}</label>
              <input
                className={`form-input ${fieldErrors.password ? 'error' : ''}`}
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
              {fieldErrors.password && <div className="form-error">{fieldErrors.password}</div>}
            </div>
            
            <div className="form-group">
              <label className="form-label form-label-required">{t('auth.confirmPassword')}</label>
              <input
                className={`form-input ${fieldErrors.confirmPassword ? 'error' : ''}`}
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
              {fieldErrors.confirmPassword && <div className="form-error">{fieldErrors.confirmPassword}</div>}
            </div>
          </div>
          
          {error && <div className="form-error">{error}</div>}
          {success && <div className="form-success">{success}</div>}
          
          <div className="form-actions form-actions-center">
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? (
                <>
                  {t('auth.register')}
                  <div className="loading-spinner loading-spinner-small"></div>
                </>
              ) : (
                t('auth.register')
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

// Dashboard Component
const Dashboard = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [fileStorageService] = useState(() => new (require('./services/FileStorageService').default)());
  const [isProcessingRecording, setIsProcessingRecording] = useState(false);

  // If user is principal, show Principal Dashboard
  if (user.role === 'principal') {
    return <PrincipalDashboard />;
  }

  // If user is student, show Student Dashboard directly without wrapper
  if (user.role === 'student') {
    return <StudentDashboard user={user} onLogout={logout} />;
  }

  // If user is teacher, show Teacher Dashboard
  if (user.role === 'teacher') {
    return (
      <TeacherDashboard 
        user={user}
        t={t}
        onLogout={logout}
        fileStorageService={fileStorageService}
        isProcessingRecording={isProcessingRecording}
        setIsProcessingRecording={setIsProcessingRecording}
      />
    );
  }

  // Fallback for other roles (shouldn't happen with current logic)
  return null;
};

// Main App Component
const App = () => {
  const [showRegister, setShowRegister] = useState(false);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AppContent showRegister={showRegister} setShowRegister={setShowRegister} />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

const AppContent = ({ showRegister, setShowRegister }) => {
  const { user, loading, logout, isAuthenticated } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="theme-bg-background" style={{ 
        direction: 'rtl', 
        textAlign: 'right', 
        fontFamily: 'Heebo, sans-serif', 
        minHeight: '100vh' 
      }}>
        <div className="loading-container-fullscreen">
          <div className="loading-message" style={{ fontSize: '1.2rem' }}>
            {t('forms.loading')}
          </div>
          <div className="loading-spinner loading-spinner-medium"></div>
        </div>
      </div>
    );
  }

  // For students, render StudentDashboard directly without App header to avoid duplication
  if (isAuthenticated && user.role === 'student') {
    return (
      <div className="theme-bg-background" style={{ 
        direction: 'rtl', 
        textAlign: 'right', 
        fontFamily: 'Heebo, sans-serif', 
        minHeight: '100vh' 
      }}>
        <StudentDashboard user={user} onLogout={logout} />
      </div>
    );
  }

  // For other users (teachers, principals) or non-authenticated users, show normal layout
  return (
    <div className="theme-bg-background" style={{ 
      direction: 'rtl', 
      textAlign: 'right', 
      fontFamily: 'Heebo, sans-serif', 
      minHeight: '100vh' 
    }}>
      <header className="app-header">
        <div className="header-content">
          <h1 className="header-title">LimudAI</h1>
          <nav className="header-actions">
            {isAuthenticated ? (
              <>
                <span className="user-greeting">שלום, {user.firstName}</span>
                <ThemeToggleButton size="small" />
                <button className="btn btn-outline btn-sm" onClick={logout}>
                  {t('auth.logout')}
                </button>
              </>
            ) : (
              <>
                <ThemeToggleButton size="small" />
                <button 
                  className="btn btn-outline btn-sm" 
                  onClick={() => setShowRegister(!showRegister)}
                >
                  {showRegister ? t('auth.login') : t('auth.register')}
                </button>
              </>
            )}
          </nav>
        </div>
      </header>
      
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        {isAuthenticated ? (
          <Dashboard />
        ) : (
          showRegister ? <RegisterForm /> : <LoginForm />
        )}
      </main>
    </div>
  );
};

export default App;
