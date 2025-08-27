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

const LoadingSpinner = ({ 
  size = 'medium', 
  message = null, 
  fullScreen = false,
  className = '',
  'aria-label': ariaLabel
}) => {
  const sizeClasses = {
    small: 'loading-spinner-small',
    medium: 'loading-spinner-medium',
    large: 'loading-spinner-large'
  };

  const spinnerClass = `loading-spinner ${sizeClasses[size]} ${className}`;
  const containerClass = fullScreen ? 'loading-container-fullscreen' : 'loading-container';

  return (
    <div className={containerClass} role="status" aria-live="polite">
      <div 
        className={spinnerClass}
        aria-label={ariaLabel || t('accessibility.loading')}
      />
      {message && (
        <div className="loading-message">
          {message}
        </div>
      )}
      <span className="sr-only">{t('forms.loading')}</span>
    </div>
  );
};

// Skeleton loader for content cards
export const ContentSkeleton = ({ count = 3 }) => {
  return (
    <div className="content-grid">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="content-card skeleton-card">
          <div className="skeleton-title"></div>
          <div className="skeleton-meta">
            <div className="skeleton-tag"></div>
            <div className="skeleton-tag"></div>
            <div className="skeleton-tag"></div>
          </div>
          <div className="skeleton-description">
            <div className="skeleton-line"></div>
            <div className="skeleton-line"></div>
            <div className="skeleton-line short"></div>
          </div>
          <div className="skeleton-actions">
            <div className="skeleton-button"></div>
            <div className="skeleton-button"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Stats skeleton loader
export const StatsSkeleton = () => {
  return (
    <div className="stats-grid">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="stat-card skeleton-card">
          <div className="skeleton-stat-number"></div>
          <div className="skeleton-stat-label"></div>
        </div>
      ))}
    </div>
  );
};

export default LoadingSpinner;
