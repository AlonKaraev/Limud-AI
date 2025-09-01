import React, { useState, useEffect } from 'react';
import './MemoryCardForm.css';
import MemoryCardPreview from './MemoryCardPreview';
import TagInput from './TagInput';
import LessonToCardsWorkflow from './LessonToCardsWorkflow';

const MemoryCardForm = ({ userId, onCardCreated, onCancel }) => {
  const [formData, setFormData] = useState({
    setId: '',
    newSetName: '',
    newSetDescription: '',
    subjectArea: '',
    gradeLevel: '',
    frontText: '',
    backText: '',
    difficultyLevel: 'medium',
    tags: [],
    cardType: 'text'
  });

  const [existingSets, setExistingSets] = useState([]);
  const [isCreatingNewSet, setIsCreatingNewSet] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  // Load existing sets on component mount
  useEffect(() => {
    loadExistingSets();
  }, [userId]);

  const loadExistingSets = async () => {
    try {
      if (!userId) {
        console.log('No userId provided, skipping sets loading');
        return;
      }

      // Get auth token from localStorage or sessionStorage
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const response = await fetch(`/api/memory-cards/sets/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        // API returns { success: true, data: sets }, so we need result.data
        const sets = result.success ? result.data : [];
        setExistingSets(sets);
      } else {
        console.error('Failed to load sets:', response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        console.error('Error details:', errorData);
      }
    } catch (error) {
      console.error('Error loading sets:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSetSelectionChange = (e) => {
    const value = e.target.value;
    if (value === 'new') {
      setIsCreatingNewSet(true);
      setFormData(prev => ({ ...prev, setId: '' }));
    } else {
      setIsCreatingNewSet(false);
      setFormData(prev => ({ ...prev, setId: value }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate set selection or new set creation
    if (!isCreatingNewSet && !formData.setId) {
      newErrors.setId = 'יש לבחור סט קיים או ליצור סט חדש';
    }

    if (isCreatingNewSet) {
      if (!formData.newSetName.trim()) {
        newErrors.newSetName = 'שם הסט הוא שדה חובה';
      }
      if (!formData.subjectArea.trim()) {
        newErrors.subjectArea = 'תחום הלימוד הוא שדה חובה';
      }
      if (!formData.gradeLevel.trim()) {
        newErrors.gradeLevel = 'רמת הכיתה היא שדה חובה';
      }
    }

    // Validate card content
    if (!formData.frontText.trim()) {
      newErrors.frontText = 'הטקסט הקדמי הוא שדה חובה';
    }

    if (!formData.backText.trim()) {
      newErrors.backText = 'הטקסט האחורי הוא שדה חובה';
    }

    // Validate Hebrew text (optional - allow mixed content)
    if (formData.frontText.trim() && formData.frontText.trim().length < 2) {
      newErrors.frontText = 'הטקסט הקדמי חייב להכיל לפחות 2 תווים';
    }

    if (formData.backText.trim() && formData.backText.trim().length < 2) {
      newErrors.backText = 'הטקסט האחורי חייב להכיל לפחות 2 תווים';
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
      let setId = formData.setId;

      // Create new set if needed
      if (isCreatingNewSet) {
        // Get auth token from localStorage or sessionStorage
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        
        const setResponse = await fetch('/api/memory-cards/sets', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.newSetName,
            description: formData.newSetDescription,
            userId: userId,
            subjectArea: formData.subjectArea,
            gradeLevel: formData.gradeLevel,
            isPublic: false
          }),
        });

        if (!setResponse.ok) {
          const errorData = await setResponse.json();
          throw new Error(errorData.message || 'שגיאה ביצירת הסט');
        }

        const setResult = await setResponse.json();
        const newSet = setResult.success ? setResult.data : setResult;
        setId = newSet.id;
        
        // Add to existing sets list
        setExistingSets(prev => [newSet, ...prev]);
      }

      // Create the card
      // Get auth token from localStorage or sessionStorage
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const cardResponse = await fetch('/api/memory-cards', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          setId: setId,
          frontText: formData.frontText.trim(),
          backText: formData.backText.trim(),
          cardType: formData.cardType,
          difficultyLevel: formData.difficultyLevel,
          tags: Array.isArray(formData.tags) ? formData.tags : []
        }),
      });

      if (!cardResponse.ok) {
        const errorData = await cardResponse.json();
        throw new Error(errorData.message || 'שגיאה ביצירת הכרטיס');
      }

      const cardResult = await cardResponse.json();
      const newCard = cardResult.success ? cardResult.data : cardResult;
      setSuccessMessage('הכרטיס נוצר בהצלחה!');
      
      // Reset form for next card
      setFormData(prev => ({
        ...prev,
        frontText: '',
        backText: '',
        tags: [],
        setId: setId, // Keep the same set selected
        newSetName: '',
        newSetDescription: ''
      }));
      setIsCreatingNewSet(false);

      // Notify parent component
      if (onCardCreated) {
        onCardCreated(newCard);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);

    } catch (error) {
      console.error('Error creating card:', error);
      setErrors({ submit: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAndAddAnother = async (e) => {
    await handleSubmit(e);
    // Form is already reset in handleSubmit for next card
  };

  const resetForm = () => {
    setFormData({
      setId: '',
      newSetName: '',
      newSetDescription: '',
      subjectArea: '',
      gradeLevel: '',
      frontText: '',
      backText: '',
      difficultyLevel: 'medium',
      tags: [],
      cardType: 'text'
    });
    setIsCreatingNewSet(false);
    setErrors({});
    setSuccessMessage('');
  };

  return (
    <div className="memory-card-form-container">
      <div className="memory-card-form-header">
        <h2>יצירת כרטיס זיכרון חדש</h2>
        <p>צור כרטיסי זיכרון עם תמיכה מלאה בעברית</p>
      </div>

      {successMessage && (
        <div className="success-message">
          <span className="success-icon">✓</span>
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="memory-card-form">
        {/* Set Selection Section */}
        <div className="form-section">
          <h3>בחירת סט כרטיסים</h3>
          
          <div className="form-group">
            <label className="form-label">בחר סט קיים או צור חדש</label>
            <select
              className={`form-select ${errors.setId ? 'error' : ''}`}
              value={isCreatingNewSet ? 'new' : formData.setId}
              onChange={handleSetSelectionChange}
            >
              <option value="">בחר סט...</option>
              {existingSets.map(set => (
                <option key={set.id} value={set.id}>
                  {set.name} ({set.totalCards || 0} כרטיסים)
                </option>
              ))}
              <option value="new">+ צור סט חדש</option>
            </select>
            {errors.setId && <div className="form-error">{errors.setId}</div>}
          </div>

          {/* New Set Creation Fields */}
          {isCreatingNewSet && (
            <div className="new-set-fields">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label form-label-required">שם הסט</label>
                  <input
                    type="text"
                    name="newSetName"
                    value={formData.newSetName}
                    onChange={handleInputChange}
                    className={`form-input ${errors.newSetName ? 'error' : ''}`}
                    placeholder="לדוגמה: מתמטיקה - כיתה ג'"
                    dir="rtl"
                  />
                  {errors.newSetName && <div className="form-error">{errors.newSetName}</div>}
                </div>

                <div className="form-group">
                  <label className="form-label form-label-optional">תיאור הסט</label>
                  <input
                    type="text"
                    name="newSetDescription"
                    value={formData.newSetDescription}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="תיאור קצר של הסט"
                    dir="rtl"
                  />
                </div>
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
          )}
        </div>

        {/* Card Content Section */}
        <div className="form-section">
          <h3>תוכן הכרטיס</h3>
          
          <div className="card-content-layout">
            <div className="card-inputs">
              <div className="form-group">
                <label className="form-label form-label-required">הצד הקדמי</label>
                <textarea
                  name="frontText"
                  value={formData.frontText}
                  onChange={handleInputChange}
                  className={`form-textarea card-text-area ${errors.frontText ? 'error' : ''}`}
                  placeholder="הכנס את השאלה או הטקסט שיופיע בצד הקדמי של הכרטיס..."
                  rows="4"
                  dir="rtl"
                />
                {errors.frontText && <div className="form-error">{errors.frontText}</div>}
                <div className="form-help">
                  הטקסט שיופיע בצד הקדמי של הכרטיס. יכול להכיל עברית, אנגלית או תערובת.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label form-label-required">הצד האחורי</label>
                <textarea
                  name="backText"
                  value={formData.backText}
                  onChange={handleInputChange}
                  className={`form-textarea card-text-area ${errors.backText ? 'error' : ''}`}
                  placeholder="הכנס את התשובה או הטקסט שיופיע בצד האחורי של הכרטיס..."
                  rows="4"
                  dir="rtl"
                />
                {errors.backText && <div className="form-error">{errors.backText}</div>}
                <div className="form-help">
                  הטקסט שיופיע בצד האחורי של הכרטיס. זוהי התשובה או ההסבר.
                </div>
              </div>
            </div>

            <div className="card-preview-section">
              <h4 className="preview-title">תצוגה מקדימה</h4>
              <div className="preview-description">
                כך הכרטיס יראה לתלמידים. לחץ על הכרטיס להיפוך בין הצדדים.
              </div>
              <MemoryCardPreview
                card={{
                  frontText: formData.frontText || 'הצד הקדמי של הכרטיס יופיע כאן...',
                  backText: formData.backText || 'הצד האחורי של הכרטיס יופיע כאן...',
                  cardType: formData.cardType,
                  difficultyLevel: formData.difficultyLevel,
                  tags: Array.isArray(formData.tags) ? formData.tags : [],
                  setName: isCreatingNewSet ? formData.newSetName : existingSets.find(set => set.id === formData.setId)?.name
                }}
                size="medium"
                showFlipHint={true}
                className="form-preview"
              />
            </div>
          </div>
        </div>

        {/* Card Metadata Section */}
        <div className="form-section">
          <h3>הגדרות נוספות</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">רמת קושי</label>
              <select
                name="difficultyLevel"
                value={formData.difficultyLevel}
                onChange={handleInputChange}
                className="form-select"
              >
                <option value="easy">קל</option>
                <option value="medium">בינוני</option>
                <option value="hard">קשה</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">סוג כרטיס</label>
              <select
                name="cardType"
                value={formData.cardType}
                onChange={handleInputChange}
                className="form-select"
              >
                <option value="text">טקסט</option>
                <option value="image">תמונה</option>
                <option value="audio">אודיו</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label form-label-optional">תגיות</label>
            <TagInput
              tags={formData.tags}
              onChange={(newTags) => setFormData(prev => ({ ...prev, tags: newTags }))}
              placeholder="הוסף תגית..."
              maxTags={8}
              disabled={isLoading}
            />
            <div className="form-help">
              תגיות עוזרות לארגן ולחפש כרטיסים. הקש Enter או פסיק להוספת תגית.
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
            type="button"
            onClick={handleSaveAndAddAnother}
            className="btn btn-outline"
            disabled={isLoading}
          >
            {isLoading ? 'שומר...' : 'שמור והוסף עוד'}
          </button>
          
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? 'שומר...' : 'שמור כרטיס'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MemoryCardForm;
