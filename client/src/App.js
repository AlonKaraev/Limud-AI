import React, { useState, useEffect, createContext, useContext } from 'react';
import styled from 'styled-components';
import { heTranslations } from './translations';
import { ThemeProvider, useTheme, ThemeToggleButton } from './contexts/ThemeContext';
import './styles/theme.css';
import RecordingInterface from './components/RecordingInterface';
import SessionManager from './components/SessionManager';
import LessonsManager from './components/LessonsManager';
import PrincipalDashboard from './components/PrincipalDashboard';
import StudentDashboard from './components/StudentDashboard';

// Create contexts for global state management
const AuthContext = createContext();
const LanguageContext = createContext();

// Styled components for Hebrew RTL layout
const AppContainer = styled.div`
  direction: rtl;
  text-align: right;
  font-family: 'Heebo', sans-serif;
  min-height: 100vh;
  background-color: var(--color-background);
  color: var(--color-text);
  transition: background-color var(--transition-normal), color var(--transition-normal);
`;

const Header = styled.header`
  background-color: var(--color-headerBackground);
  color: var(--color-textOnDark);
  padding: 1rem 2rem;
  box-shadow: 0 2px 4px var(--color-shadowLight);
  transition: background-color var(--transition-normal), box-shadow var(--transition-normal);
`;

const HeaderContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Logo = styled.h1`
  margin: 0;
  font-size: 1.8rem;
  font-weight: 600;
`;

const Nav = styled.nav`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const NavButton = styled.button`
  background: none;
  border: 1px solid rgba(255,255,255,0.3);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Heebo', sans-serif;
  font-size: 0.9rem;
  transition: all 0.2s;

  &:hover {
    background-color: rgba(255,255,255,0.1);
    border-color: rgba(255,255,255,0.5);
  }

  &.primary {
    background-color: #3498db;
    border-color: #3498db;
  }

  &.primary:hover {
    background-color: #2980b9;
  }
`;

const Main = styled.main`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const Card = styled.div`
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: var(--radius-md);
  padding: 2rem;
  box-shadow: 0 2px 8px var(--color-shadowLight);
  margin-bottom: 2rem;
  border: 1px solid var(--color-border);
  transition: background-color var(--transition-normal), color var(--transition-normal), border-color var(--transition-normal);
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 400px;
  margin: 0 auto;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 500;
  color: #2c3e50;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: 'Heebo', sans-serif;
  font-size: 1rem;
  direction: rtl;
  text-align: right;

  &:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
  }

  &.error {
    border-color: #e74c3c;
  }
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: 'Heebo', sans-serif;
  font-size: 1rem;
  direction: rtl;
  background-color: white;

  &:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
  }
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  font-family: 'Heebo', sans-serif;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #2980b9;
  }

  &:disabled {
    background-color: #bdc3c7;
    cursor: not-allowed;
  }

  &.secondary {
    background-color: #95a5a6;
  }

  &.secondary:hover {
    background-color: #7f8c8d;
  }
`;

const ErrorMessage = styled.div`
  color: #e74c3c;
  font-size: 0.9rem;
  margin-top: 0.25rem;
`;

const SuccessMessage = styled.div`
  color: #27ae60;
  font-size: 0.9rem;
  margin-top: 0.25rem;
`;

const ErrorPopup = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  background: #fff;
  border: 3px solid #e74c3c;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 8px 24px rgba(231, 76, 60, 0.3), 0 4px 12px rgba(0,0,0,0.15);
  z-index: 1000;
  max-width: 450px;
  direction: rtl;
  animation: slideIn 0.3s ease-out;
  
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  &::before {
    content: '';
    position: absolute;
    top: -3px;
    left: -3px;
    right: -3px;
    bottom: -3px;
    background: linear-gradient(45deg, #ffffff, #ffcccb);
    border-radius: 12px;
    z-index: -1;
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }
`;

const ErrorPopupHeader = styled.div`
  font-weight: 600;
  color: #000;
  margin-bottom: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ErrorPopupClose = styled.button`
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #e74c3c;
  padding: 0;
  margin-left: 0.5rem;
`;

const ErrorList = styled.ul`
  margin: 0;
  padding-right: 1rem;
  list-style-type: disc;
`;

const ErrorListItem = styled.li`
  margin-bottom: 0.25rem;
  color: #666;
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-left: 10px;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

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
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      // Verify token and get user data
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        // Token is invalid
        logout();
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('token', data.token);
      return { success: true, data };
    } else {
      return { success: false, error: data.error };
    }
  };

  const register = async (userData) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });

    const data = await response.json();

    if (response.ok) {
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('token', data.token);
      return { success: true, data };
    } else {
      return { success: false, error: data.error };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user
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
    <Card>
      <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#2c3e50' }}>
        {t('auth.login')}
      </h2>
      <Form onSubmit={handleSubmit}>
        <FormGroup>
          <Label>{t('auth.email')}</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </FormGroup>
        <FormGroup>
          <Label>{t('auth.password')}</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </FormGroup>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              {t('auth.login')}
              <LoadingSpinner />
            </>
          ) : (
            t('auth.login')
          )}
        </Button>
      </Form>
    </Card>
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
        <ErrorPopup>
          <ErrorPopupHeader>
            שגיאות בטופס
            <ErrorPopupClose onClick={() => setShowErrorPopup(false)}>
              ×
            </ErrorPopupClose>
          </ErrorPopupHeader>
          <ErrorList>
            {detailedErrors.map((error, index) => (
              <ErrorListItem key={index}>{error}</ErrorListItem>
            ))}
          </ErrorList>
        </ErrorPopup>
      )}
      
      <Card>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#2c3e50' }}>
          {t('auth.register')}
        </h2>
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label>{t('auth.email')}</Label>
            <Input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={fieldErrors.email ? 'error' : ''}
              required
            />
            {fieldErrors.email && <ErrorMessage>{fieldErrors.email}</ErrorMessage>}
          </FormGroup>
          
          <FormGroup>
            <Label>{t('auth.firstName')}</Label>
            <Input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className={fieldErrors.firstName ? 'error' : ''}
              required
            />
            {fieldErrors.firstName && <ErrorMessage>{fieldErrors.firstName}</ErrorMessage>}
          </FormGroup>
          
          <FormGroup>
            <Label>{t('auth.lastName')}</Label>
            <Input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className={fieldErrors.lastName ? 'error' : ''}
              required
            />
            {fieldErrors.lastName && <ErrorMessage>{fieldErrors.lastName}</ErrorMessage>}
          </FormGroup>
          
          <FormGroup>
            <Label>{t('auth.phone')}</Label>
            <Input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={fieldErrors.phone ? 'error' : ''}
              placeholder="05XXXXXXXX"
            />
            {fieldErrors.phone && <ErrorMessage>{fieldErrors.phone}</ErrorMessage>}
          </FormGroup>
          
          <FormGroup>
            <Label>{t('auth.role')}</Label>
            <Select
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
            >
              <option value="student">{t('auth.student')}</option>
              <option value="teacher">{t('auth.teacher')}</option>
            </Select>
          </FormGroup>
          
          <FormGroup>
            <Label>{t('auth.password')}</Label>
            <Input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={fieldErrors.password ? 'error' : ''}
              required
            />
            {fieldErrors.password && <ErrorMessage>{fieldErrors.password}</ErrorMessage>}
          </FormGroup>
          
          <FormGroup>
            <Label>{t('auth.confirmPassword')}</Label>
            <Input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={fieldErrors.confirmPassword ? 'error' : ''}
              required
            />
            {fieldErrors.confirmPassword && <ErrorMessage>{fieldErrors.confirmPassword}</ErrorMessage>}
          </FormGroup>
          
          {error && <ErrorMessage>{error}</ErrorMessage>}
          {success && <SuccessMessage>{success}</SuccessMessage>}
          
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                {t('auth.register')}
                <LoadingSpinner />
              </>
            ) : (
              t('auth.register')
            )}
          </Button>
        </Form>
      </Card>
    </>
  );
};

// Dashboard Component
const Dashboard = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
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

  const handleRecordingComplete = async (recordingData) => {
    // Prevent duplicate processing
    if (isProcessingRecording) {
      console.log('Recording already being processed, ignoring duplicate call');
      return;
    }

    setIsProcessingRecording(true);
    
    try {
      console.log('Processing recording completion:', {
        duration: recordingData.duration,
        qualityReportDuration: recordingData.qualityReport?.duration,
        blobSize: recordingData.audioBlob?.size,
        aiOptions: recordingData.aiOptions
      });
      
      const result = await fileStorageService.saveRecording(recordingData);
      console.log('Recording saved successfully:', result);
      
      // Trigger AI processing if requested
      if (recordingData.aiOptions && (recordingData.aiOptions.generateSummary || recordingData.aiOptions.generateTest)) {
        console.log('Triggering AI processing for recording:', result.recordingId);
        await triggerAIProcessing(result.recordingId, recordingData.aiOptions);
      }
      
      // Switch to lessons tab to show the new recording with AI content
      setActiveTab('lessons');
    } catch (error) {
      console.error('Error saving recording:', error);
    } finally {
      // Reset the flag after a short delay to allow for legitimate subsequent recordings
      setTimeout(() => {
        setIsProcessingRecording(false);
      }, 2000);
    }
  };

  const triggerAIProcessing = async (recordingId, aiOptions) => {
    try {
      const token = localStorage.getItem('token');
      const processingOptions = [];
      
      if (aiOptions.generateSummary) {
        processingOptions.push('summary');
      }
      if (aiOptions.generateTest) {
        processingOptions.push('questions');
      }
      
      const response = await fetch('/api/ai-content/process-recording', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          recordingId,
          processingOptions
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('AI processing initiated:', result);
      } else {
        const error = await response.json();
        console.error('Failed to initiate AI processing:', error);
      }
    } catch (error) {
      console.error('Error triggering AI processing:', error);
    }
  };

  return (
    <>
      <Card>
        <h2 style={{ color: '#2c3e50', marginBottom: '1rem' }}>
          {user.role === 'teacher' ? t('dashboard.teacherDashboard') : t('dashboard.studentDashboard')}
        </h2>
        <p style={{ fontSize: '1.1rem', marginBottom: '2rem' }}>
          {t('dashboard.welcome')}, {user.firstName} {user.lastName}!
        </p>
        
        {user.role === 'teacher' && (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid #ecf0f1' }}>
              <button
                onClick={() => setActiveTab('overview')}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  background: activeTab === 'overview' ? '#3498db' : 'transparent',
                  color: activeTab === 'overview' ? 'white' : '#2c3e50',
                  borderRadius: '4px 4px 0 0',
                  cursor: 'pointer',
                  fontFamily: 'Heebo, sans-serif'
                }}
              >
                סקירה כללית
              </button>
              <button
                onClick={() => setActiveTab('lessons')}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  background: activeTab === 'lessons' ? '#3498db' : 'transparent',
                  color: activeTab === 'lessons' ? 'white' : '#2c3e50',
                  borderRadius: '4px 4px 0 0',
                  cursor: 'pointer',
                  fontFamily: 'Heebo, sans-serif'
                }}
              >
                שיעורים
              </button>
            </div>
          </div>
        )}

        {activeTab === 'overview' && (
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ 
              background: '#ecf0f1', 
              padding: '1rem', 
              borderRadius: '4px', 
              flex: '1',
              minWidth: '200px'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#2c3e50' }}>
                {t('dashboard.recentActivity')}
              </h3>
              <p style={{ margin: 0, color: '#7f8c8d' }}>
                {t('forms.noData')}
              </p>
            </div>
            <div style={{ 
              background: '#ecf0f1', 
              padding: '1rem', 
              borderRadius: '4px', 
              flex: '1',
              minWidth: '200px'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#2c3e50' }}>
                {t('dashboard.quickActions')}
              </h3>
              <p style={{ margin: 0, color: '#7f8c8d' }}>
                {user.role === 'teacher' ? 'השתמש בלשוניות למעלה לגישה להקלטת שיעורים וניהול הקלטות' : 'בקרוב...'}
              </p>
            </div>
          </div>
        )}
      </Card>

      {user.role === 'teacher' && activeTab === 'record' && (
        <RecordingInterface t={t} onRecordingComplete={handleRecordingComplete} />
      )}

      {user.role === 'teacher' && activeTab === 'sessions' && (
        <SessionManager t={t} />
      )}

      {user.role === 'teacher' && activeTab === 'lessons' && (
        <LessonsManager t={t} />
      )}
    </>
  );
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
      <AppContainer>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          fontSize: '1.2rem',
          color: '#7f8c8d'
        }}>
          {t('forms.loading')}
          <LoadingSpinner />
        </div>
      </AppContainer>
    );
  }

  // For students, render StudentDashboard directly without App header to avoid duplication
  if (isAuthenticated && user.role === 'student') {
    return (
      <AppContainer>
        <StudentDashboard user={user} onLogout={logout} />
      </AppContainer>
    );
  }

  // For other users (teachers, principals) or non-authenticated users, show normal layout
  return (
    <AppContainer>
      <Header>
        <HeaderContent>
          <Logo>LimudAI</Logo>
          <Nav>
            {isAuthenticated ? (
              <>
                <span>שלום, {user.firstName}</span>
                <ThemeToggleButton size="small" />
                <NavButton onClick={logout}>
                  {t('auth.logout')}
                </NavButton>
              </>
            ) : (
              <>
                <ThemeToggleButton size="small" />
                <NavButton onClick={() => setShowRegister(!showRegister)}>
                  {showRegister ? t('auth.login') : t('auth.register')}
                </NavButton>
              </>
            )}
          </Nav>
        </HeaderContent>
      </Header>
      
      <Main>
        {isAuthenticated ? (
          <Dashboard />
        ) : (
          showRegister ? <RegisterForm /> : <LoginForm />
        )}
      </Main>
    </AppContainer>
  );
};

export default App;
