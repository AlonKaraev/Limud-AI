import React, { useState } from 'react';

const SummaryForm = ({ onSummaryCreated, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    subjectArea: '',
    gradeLevel: '',
    tags: [],
    isPublic: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleTagsChange = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tag = e.target.value.trim();
      if (tag && !formData.tags.includes(tag)) {
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, tag]
        }));
        e.target.value = '';
      }
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'כותרת הסיכום היא שדה חובה';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'תוכן הסיכום הוא שדה חובה';
    }

    if (!formData.subjectArea.trim()) {
      newErrors.subjectArea = 'תחום הלימוד הוא שדה חובה';
    }

    if (!formData.gradeLevel.trim()) {
      newErrors.gradeLevel = 'רמת הכיתה היא שדה חובה';
    }

    if (formData.title.trim() && formData.title.trim().length < 3) {
      newErrors.title = 'כותרת הסיכום חייבת להכיל לפחות 3 תווים';
    }

    if (formData.content.trim() && formData.content.trim().length < 10) {
      newErrors.content = 'תוכן הסיכום חייב להכיל לפחות 10 תווים';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});
    setSuccessMessage('');

    try {
      // Create new summary object
      const newSummary = {
        id: Date.now().toString(), // Simple ID generation
        title: formData.title.trim(),
        content: formData.content.trim(),
        subjectArea: formData.subjectArea,
        gradeLevel: formData.gradeLevel,
        tags: formData.tags,
        isPublic: formData.isPublic,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Get existing summaries from localStorage
      const existingSummaries = localStorage.getItem('limud-ai-summaries');
      const summariesList = existingSummaries ? JSON.parse(existingSummaries) : [];
      
      // Add new summary to the beginning of the list
      const updatedSummaries = [newSummary, ...summariesList];
      
      // Save to localStorage
      localStorage.setItem('limud-ai-summaries', JSON.stringify(updatedSummaries));
      
      setSuccessMessage('הסיכום נוצר בהצלחה!');
      
      // Reset form
      setFormData({
        title: '',
        content: '',
        subjectArea: '',
        gradeLevel: '',
        tags: [],
        isPublic: false
      });

      // Notify parent component
      if (onSummaryCreated) {
        onSummaryCreated(newSummary);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);

    } catch (error) {
      console.error('Error creating summary:', error);
      setErrors({ submit: 'שגיאה בשמירת הסיכום' });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      subjectArea: '',
      gradeLevel: '',
      tags: [],
      isPublic: false
    });
    setErrors({});
    setSuccessMessage('');
  };

  return (
    <div className="summary-form-container">
      <div className="summary-form-header">
        <div className="header-content">
          <h2>יצירת סיכום חדש</h2>
          <p>צור סיכום מקיף עם תמיכה מלאה בעברית</p>
        </div>
        <button 
          type="button"
          className="close-button"
          onClick={onCancel}
          aria-label="סגור"
        >
          ×
        </button>
      </div>

      {successMessage && (
        <div className="success-message">
          <span className="success-icon">✓</span>
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="summary-form">
        {/* Basic Information Section */}
        <div className="form-section">
          <h3>מידע בסיסי</h3>
          
          <div className="form-group">
            <label className="form-label form-label-required">כותרת הסיכום</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={`form-input ${errors.title ? 'error' : ''}`}
              placeholder="לדוגמה: סיכום שיעור מתמטיקה - שברים"
              dir="rtl"
            />
            {errors.title && <div className="form-error">{errors.title}</div>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label form-label-required">תחום לימוד</label>
              <select
                name="subjectArea"
                value={formData.subjectArea}
                onChange={handleInputChange}
                className={`form-select ${errors.subjectArea ? 'error' : ''}`}
              >
                <option value="">בחר תחום...</option>
                <option value="מתמטיקה">מתמטיקה</option>
                <option value="עברית">עברית</option>
                <option value="אנגלית">אנגלית</option>
                <option value="מדעים">מדעים</option>
                <option value="היסטוריה">היסטוריה</option>
                <option value="גיאוגרפיה">גיאוגרפיה</option>
                <option value="אחר">אחר</option>
              </select>
              {errors.subjectArea && <div className="form-error">{errors.subjectArea}</div>}
            </div>

            <div className="form-group">
              <label className="form-label form-label-required">רמת כיתה</label>
              <select
                name="gradeLevel"
                value={formData.gradeLevel}
                onChange={handleInputChange}
                className={`form-select ${errors.gradeLevel ? 'error' : ''}`}
              >
                <option value="">בחר כיתה...</option>
                <option value="א'">א'</option>
                <option value="ב'">ב'</option>
                <option value="ג'">ג'</option>
                <option value="ד'">ד'</option>
                <option value="ה'">ה'</option>
                <option value="ו'">ו'</option>
                <option value="ז'">ז'</option>
                <option value="ח'">ח'</option>
                <option value="ט'">ט'</option>
                <option value="י'">י'</option>
                <option value="יא'">יא'</option>
                <option value="יב'">יב'</option>
              </select>
              {errors.gradeLevel && <div className="form-error">{errors.gradeLevel}</div>}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="form-section">
          <h3>תוכן הסיכום</h3>
          
          <div className="form-group">
            <label className="form-label form-label-required">תוכן הסיכום</label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              className={`form-textarea summary-content-area ${errors.content ? 'error' : ''}`}
              placeholder="הכנס את תוכן הסיכום כאן... יכול להכיל נקודות עיקריות, הסברים, דוגמאות ועוד"
              rows="12"
              dir="rtl"
            />
            {errors.content && <div className="form-error">{errors.content}</div>}
            <div className="form-help">
              כתוב סיכום מקיף של השיעור או הנושא. השתמש בפסקאות, רשימות ודוגמאות להבהרה.
            </div>
          </div>
        </div>

        {/* Additional Settings Section */}
        <div className="form-section">
          <h3>הגדרות נוספות</h3>
          
          <div className="form-group">
            <label className="form-label form-label-optional">תגיות</label>
            <div className="tags-input-container">
              <input
                type="text"
                placeholder="הוסף תגית והקש Enter..."
                onKeyDown={handleTagsChange}
                className="form-input tags-input"
                dir="rtl"
              />
              <div className="tags-display">
                {formData.tags.map((tag, index) => (
                  <span key={index} className="tag">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="tag-remove"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <div className="form-help">
              תגיות עוזרות לארגן ולחפש סיכומים. הקש Enter או פסיק להוספת תגית.
            </div>
          </div>

          <div className="form-group">
            <label className="form-checkbox">
              <input
                type="checkbox"
                name="isPublic"
                checked={formData.isPublic}
                onChange={handleInputChange}
              />
              <span className="checkbox-label">סיכום ציבורי (נגיש למורים אחרים)</span>
            </label>
            <div className="form-help">
              סיכומים ציבוריים יכולים להיות נצפים ומשותפים עם מורים אחרים במערכת.
            </div>
          </div>
        </div>

        {/* Error Display */}
        {errors.submit && (
          <div className="error-message">
            <span className="error-icon">⚠</span>
            {errors.submit}
          </div>
        )}

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={onCancel || resetForm}
            className="btn btn-secondary"
            disabled={isLoading}
          >
            ביטול
          </button>
          
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? 'שומר...' : 'שמור סיכום'}
          </button>
        </div>
      </form>

      <style jsx>{`
        .summary-form-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
          background: var(--color-surface, #ffffff);
          border-radius: var(--radius-lg, 12px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .summary-form-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid var(--color-border, #e9ecef);
        }

        .header-content {
          text-align: center;
          flex: 1;
        }

        .summary-form-header h2 {
          color: var(--color-primary, #3498db);
          margin: 0 0 0.5rem 0;
          font-size: 1.8rem;
        }

        .summary-form-header p {
          color: var(--color-textSecondary, #7f8c8d);
          margin: 0;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 2rem;
          color: var(--color-textSecondary, #7f8c8d);
          cursor: pointer;
          padding: 0.25rem;
          line-height: 1;
          border-radius: var(--radius-sm, 4px);
          transition: all 0.3s ease;
          width: 2.5rem;
          height: 2.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .close-button:hover {
          background: var(--color-surfaceHover, #f8f9fa);
          color: var(--color-text, #2c3e50);
          transform: scale(1.1);
        }

        .close-button:active {
          transform: scale(0.95);
        }

        .success-message {
          background: #d4edda;
          color: #155724;
          padding: 1rem;
          border-radius: var(--radius-md, 8px);
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border: 1px solid #c3e6cb;
        }

        .success-icon {
          font-weight: bold;
          font-size: 1.2rem;
        }

        .error-message {
          background: #f8d7da;
          color: #721c24;
          padding: 1rem;
          border-radius: var(--radius-md, 8px);
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border: 1px solid #f5c6cb;
        }

        .error-icon {
          font-weight: bold;
          font-size: 1.2rem;
        }

        .summary-form {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .form-section {
          background: var(--color-surfaceHover, #f8f9fa);
          padding: 1.5rem;
          border-radius: var(--radius-md, 8px);
          border: 1px solid var(--color-border, #e9ecef);
        }

        .form-section h3 {
          margin: 0 0 1rem 0;
          color: var(--color-text, #2c3e50);
          font-size: 1.2rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--color-border, #e9ecef);
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: var(--color-text, #2c3e50);
        }

        .form-label-required::after {
          content: ' *';
          color: #e74c3c;
        }

        .form-label-optional::after {
          content: ' (אופציונלי)';
          color: var(--color-textSecondary, #7f8c8d);
          font-weight: normal;
          font-size: 0.9em;
        }

        .form-input,
        .form-select,
        .form-textarea {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid var(--color-border, #e9ecef);
          border-radius: var(--radius-md, 8px);
          font-size: 1rem;
          transition: all 0.3s ease;
          background: var(--color-surface, #ffffff);
        }

        .form-input:focus,
        .form-select:focus,
        .form-textarea:focus {
          outline: none;
          border-color: var(--color-primary, #3498db);
          box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
        }

        .form-input.error,
        .form-select.error,
        .form-textarea.error {
          border-color: #e74c3c;
          box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1);
        }

        .summary-content-area {
          min-height: 200px;
          resize: vertical;
          font-family: inherit;
          line-height: 1.6;
        }

        .tags-input-container {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .tags-input {
          margin-bottom: 0;
        }

        .tags-display {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .tag {
          background: var(--color-primary, #3498db);
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm, 4px);
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .tag-remove {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          font-size: 1.2rem;
          line-height: 1;
          padding: 0;
          margin-left: 0.25rem;
        }

        .tag-remove:hover {
          opacity: 0.7;
        }

        .form-checkbox {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }

        .form-checkbox input[type="checkbox"] {
          width: auto;
          margin: 0;
        }

        .checkbox-label {
          font-weight: 500;
          color: var(--color-text, #2c3e50);
        }

        .form-error {
          color: #e74c3c;
          font-size: 0.9rem;
          margin-top: 0.25rem;
          font-weight: 500;
        }

        .form-help {
          color: var(--color-textSecondary, #7f8c8d);
          font-size: 0.9rem;
          margin-top: 0.25rem;
          line-height: 1.4;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          padding-top: 1rem;
          border-top: 1px solid var(--color-border, #e9ecef);
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: var(--radius-md, 8px);
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: var(--color-primary, #3498db);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2980b9;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
        }

        .btn-secondary {
          background: var(--color-textSecondary, #7f8c8d);
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #6c757d;
          transform: translateY(-1px);
        }

        @media (max-width: 768px) {
          .summary-form-container {
            padding: 1rem;
            margin: 1rem;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .form-actions {
            flex-direction: column;
          }

          .btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default SummaryForm;
