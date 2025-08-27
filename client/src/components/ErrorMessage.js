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

const ErrorMessage = ({ 
  error, 
  onRetry, 
  onDismiss,
  type = 'error',
  className = '',
  showRetry = true,
  showDismiss = false
}) => {
  const getErrorMessage = (error) => {
    if (typeof error === 'string') {
      return error;
    }
    
    if (error?.message) {
      // Map common error messages to Hebrew
      const errorMappings = {
        'Network Error': t('student.connectionError'),
        'Failed to fetch': t('student.connectionError'),
        'Unauthorized': t('student.sessionExpired'),
        'Forbidden': t('student.accessDenied'),
        'Not Found': t('student.contentNotFound'),
        'Internal Server Error': t('student.serverError')
      };
      
      return errorMappings[error.message] || error.message;
    }
    
    return t('student.unknownError');
  };

  const getErrorIcon = (type) => {
    const icons = {
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      network: '🌐'
    };
    return icons[type] || icons.error;
  };

  const errorMessage = getErrorMessage(error);
  const errorIcon = getErrorIcon(type);

  return (
    <div className={`error-message error-message-${type} ${className}`} role="alert">
      <div className="error-content">
        <div className="error-icon" role="img" aria-label={t(`accessibility.${type}`)}>
          {errorIcon}
        </div>
        <div className="error-text">
          <p className="error-main-text">{errorMessage}</p>
          {error?.details && process.env.NODE_ENV === 'development' && (
            <details className="error-details">
              <summary>פרטי שגיאה נוספים</summary>
              <pre className="error-details-text">{error.details}</pre>
            </details>
          )}
        </div>
      </div>
      
      {(showRetry || showDismiss) && (
        <div className="error-actions">
          {showRetry && onRetry && (
            <button 
              className="btn btn-sm btn-primary"
              onClick={onRetry}
              aria-label={t('student.retry')}
            >
              {t('student.retry')}
            </button>
          )}
          {showDismiss && onDismiss && (
            <button 
              className="btn btn-sm btn-secondary"
              onClick={onDismiss}
              aria-label={t('accessibility.close')}
            >
              {t('accessibility.close')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Network status component
export const NetworkStatus = ({ isOnline, onRetry }) => {
  if (isOnline) {
    return null;
  }

  return (
    <div className="network-status offline" role="alert">
      <div className="network-content">
        <span className="network-icon" role="img" aria-label="לא מקוון">📡</span>
        <span className="network-text">{t('student.noInternetConnection')}</span>
        {onRetry && (
          <button 
            className="btn btn-sm btn-outline"
            onClick={onRetry}
            aria-label={t('student.retry')}
          >
            {t('student.retry')}
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage;
