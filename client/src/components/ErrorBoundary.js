import React from 'react';
import { heTranslations } from '../translations';

// Translation helper
const getNestedTranslation = (obj, path) => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

const t = (key, params = {}) => {
  let translation = getNestedTranslation(heTranslations, key) || key;
  
  Object.keys(params).forEach(param => {
    translation = translation.replace(`{{${param}}}`, params[param]);
  });
  
  return translation;
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-icon" role="img" aria-label={t('accessibility.error')}>
              ⚠️
            </div>
            <h2 className="error-title">{t('student.unknownError')}</h2>
            <p className="error-message">
              {this.props.fallbackMessage || 'משהו השתבש. אנא נסה לרענן את הדף.'}
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>פרטי שגיאה (מצב פיתוח)</summary>
                <pre className="error-stack">
                  {this.state.error.toString()}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            
            <div className="error-actions">
              <button 
                className="btn btn-primary"
                onClick={this.handleRetry}
                aria-label={t('student.retry')}
              >
                {t('student.retry')}
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => window.location.reload()}
                aria-label={t('student.refreshData')}
              >
                {t('student.refreshData')}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
