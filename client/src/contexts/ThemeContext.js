import React, { createContext, useContext, useState, useEffect } from 'react';

// Theme definitions
const themes = {
  light: {
    name: 'light',
    colors: {
      // Primary colors
      primary: '#3498db',
      primaryHover: '#2980b9',
      primaryLight: '#e3f2fd',
      secondary: '#95a5a6',
      secondaryHover: '#7f8c8d',
      success: '#27ae60',
      successHover: '#229954',
      warning: '#f39c12',
      warningHover: '#e67e22',
      error: '#e74c3c',
      errorHover: '#c0392b',
      
      // Background colors
      background: '#f8f9fa',
      surface: '#ffffff',
      surfaceHover: '#f8f9fa',
      cardBackground: '#ffffff',
      headerBackground: '#2c3e50',
      
      // Text colors
      text: '#2c3e50',
      textSecondary: '#7f8c8d',
      textLight: '#6c757d',
      textOnPrimary: '#ffffff',
      textOnDark: '#ffffff',
      
      // Border and divider colors
      border: '#e9ecef',
      borderLight: '#f1f3f4',
      divider: '#e0e0e0',
      
      // Form colors
      inputBackground: '#ffffff',
      inputBorder: '#ddd',
      inputBorderFocus: '#3498db',
      inputBorderError: '#e74c3c',
      
      // Status colors
      online: '#27ae60',
      offline: '#e74c3c',
      pending: '#f39c12',
      
      // Gradient colors
      gradientStart: '#667eea',
      gradientEnd: '#764ba2',
      
      // Shadow colors
      shadowLight: 'rgba(0, 0, 0, 0.1)',
      shadowMedium: 'rgba(0, 0, 0, 0.15)',
      shadowDark: 'rgba(0, 0, 0, 0.3)',
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      xxl: '3rem',
    },
    borderRadius: {
      sm: '4px',
      md: '8px',
      lg: '12px',
      xl: '16px',
      round: '50%',
    },
    transitions: {
      fast: '0.15s ease',
      normal: '0.2s ease',
      slow: '0.3s ease',
    }
  },
  dark: {
    name: 'dark',
    colors: {
      // Primary colors
      primary: '#5dade2',
      primaryHover: '#3498db',
      primaryLight: '#1e3a5f',
      secondary: '#aab7b8',
      secondaryHover: '#95a5a6',
      success: '#58d68d',
      successHover: '#27ae60',
      warning: '#f7dc6f',
      warningHover: '#f39c12',
      error: '#ec7063',
      errorHover: '#e74c3c',
      
      // Background colors
      background: '#121212',
      surface: '#1e1e1e',
      surfaceHover: '#2d2d2d',
      cardBackground: '#2d2d2d',
      headerBackground: '#1a1a1a',
      
      // Text colors
      text: '#ffffff',
      textSecondary: '#bdc3c7',
      textLight: '#95a5a6',
      textOnPrimary: '#ffffff',
      textOnDark: '#ffffff',
      
      // Border and divider colors
      border: '#444444',
      borderLight: '#333333',
      divider: '#404040',
      
      // Form colors
      inputBackground: '#2d2d2d',
      inputBorder: '#444444',
      inputBorderFocus: '#5dade2',
      inputBorderError: '#ec7063',
      
      // Status colors
      online: '#58d68d',
      offline: '#ec7063',
      pending: '#f7dc6f',
      
      // Gradient colors
      gradientStart: '#4a69bd',
      gradientEnd: '#6c5ce7',
      
      // Shadow colors
      shadowLight: 'rgba(0, 0, 0, 0.3)',
      shadowMedium: 'rgba(0, 0, 0, 0.5)',
      shadowDark: 'rgba(0, 0, 0, 0.7)',
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      xxl: '3rem',
    },
    borderRadius: {
      sm: '4px',
      md: '8px',
      lg: '12px',
      xl: '16px',
      round: '50%',
    },
    transitions: {
      fast: '0.15s ease',
      normal: '0.2s ease',
      slow: '0.3s ease',
    }
  }
};

// Create theme context
const ThemeContext = createContext();

// Theme provider component
export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('light');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize theme on mount
  useEffect(() => {
    const initializeTheme = () => {
      try {
        // Check for saved theme preference
        const savedTheme = localStorage.getItem('limud-ai-theme');
        
        if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
          setCurrentTheme(savedTheme);
        } else {
          // Check system preference
          const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
          setCurrentTheme(prefersDark ? 'dark' : 'light');
        }
      } catch (error) {
        console.warn('Error loading theme preference:', error);
        setCurrentTheme('light');
      } finally {
        setIsLoading(false);
      }
    };

    initializeTheme();
  }, []);

  // Update CSS custom properties when theme changes
  useEffect(() => {
    if (isLoading) return;

    const theme = themes[currentTheme];
    const root = document.documentElement;

    // Set CSS custom properties
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    Object.entries(theme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key}`, value);
    });

    Object.entries(theme.borderRadius).forEach(([key, value]) => {
      root.style.setProperty(`--radius-${key}`, value);
    });

    Object.entries(theme.transitions).forEach(([key, value]) => {
      root.style.setProperty(`--transition-${key}`, value);
    });

    // Set theme name for CSS selectors
    root.setAttribute('data-theme', currentTheme);

    // Save theme preference
    try {
      localStorage.setItem('limud-ai-theme', currentTheme);
    } catch (error) {
      console.warn('Error saving theme preference:', error);
    }
  }, [currentTheme, isLoading]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      // Only update if user hasn't manually set a preference
      const savedTheme = localStorage.getItem('limud-ai-theme');
      if (!savedTheme) {
        setCurrentTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    setCurrentTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setTheme = (themeName) => {
    if (themes[themeName]) {
      setCurrentTheme(themeName);
    }
  };

  const value = {
    currentTheme,
    theme: themes[currentTheme],
    themes,
    toggleTheme,
    setTheme,
    isLoading,
    isDark: currentTheme === 'dark',
    isLight: currentTheme === 'light'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Theme toggle button component
export const ThemeToggleButton = ({ className = '', size = 'medium', showLabel = false }) => {
  const { currentTheme, toggleTheme, isLoading } = useTheme();

  const sizeClasses = {
    small: 'theme-toggle-sm',
    medium: 'theme-toggle-md',
    large: 'theme-toggle-lg'
  };

  if (isLoading) {
    return (
      <button 
        className={`theme-toggle ${sizeClasses[size]} ${className}`}
        disabled
        aria-label="טוען נושא..."
      >
        <span className="theme-toggle-icon">⚪</span>
        {showLabel && <span className="theme-toggle-label">טוען...</span>}
      </button>
    );
  }

  return (
    <button 
      className={`theme-toggle ${sizeClasses[size]} ${className}`}
      onClick={toggleTheme}
      aria-label={currentTheme === 'light' ? 'עבור למצב כהה' : 'עבור למצב בהיר'}
      title={currentTheme === 'light' ? 'עבור למצב כהה' : 'עבור למצב בהיר'}
    >
      <span className="theme-toggle-icon">
        {currentTheme === 'light' ? '🌙' : '☀️'}
      </span>
      {showLabel && (
        <span className="theme-toggle-label">
          {currentTheme === 'light' ? 'מצב כהה' : 'מצב בהיר'}
        </span>
      )}
    </button>
  );
};

export default ThemeContext;
