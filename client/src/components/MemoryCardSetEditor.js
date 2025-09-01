import React, { useState, useEffect } from 'react';
import MemoryCardPreview from './MemoryCardPreview';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

const MemoryCardSetEditor = ({ setId, onClose, onSave }) => {
  const [setData, setSetData] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Set metadata form
  const [setForm, setSetForm] = useState({
    name: '',
    description: '',
    subjectArea: '',
    gradeLevel: '',
    isPublic: false
  });

  // New card form
  const [newCardForm, setNewCardForm] = useState({
    frontText: '',
    backText: '',
    difficultyLevel: 'medium',
    tags: '',
    cardType: 'text'
  });

  // Edit card form
  const [editingCard, setEditingCard] = useState(null);
  const [editCardForm, setEditCardForm] = useState({
    frontText: '',
    backText: '',
    difficultyLevel: 'medium',
    tags: '',
    cardType: 'text'
  });

  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadSetData();
  }, [setId]);

  const loadSetData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      // Load set with cards
      const response = await fetch(`/api/memory-cards/sets/${setId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('שגיאה בטעינת הסט');
      }

      const result = await response.json();
      if (result.success) {
        const set = result.data;
        setSetData(set);
        setCards(set.cards || []);
        
        // Populate set form
        setSetForm({
          name: set.name || '',
          description: set.description || '',
          subjectArea: set.subjectArea || '',
          gradeLevel: set.gradeLevel || '',
          isPublic: set.isPublic || false
        });
      } else {
        throw new Error(result.message || 'שגיאה בטעינת הסט');
      }
    } catch (err) {
      console.error('Error loading set data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSetForm(prev => ({
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

  const handleNewCardFormChange = (e) => {
    const { name, value } = e.target;
    setNewCardForm(prev => ({
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

  const handleEditCardFormChange = (e) => {
    const { name, value } = e.target;
    setEditCardForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateSetForm = () => {
    const newErrors = {};
    
    if (!setForm.name.trim()) {
      newErrors.name = 'שם הסט הוא שדה חובה';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateCardForm = (form) => {
    const newErrors = {};
    
    if (!form.frontText.trim()) {
      newErrors.frontText = 'הטקסט הקדמי הוא שדה חובה';
    }
    
    if (!form.backText.trim()) {
      newErrors.backText = 'הטקסט האחורי הוא שדה חובה';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveSet = async () => {
    if (!validateSetForm()) {
      return;
    }

    setSaving(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const response = await fetch(`/api/memory-cards/sets/${setId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(setForm)
      });

      if (!response.ok) {
        throw new Error('שגיאה בשמירת הסט');
      }

      const result = await response.json();
      if (result.success) {
        setSuccessMessage('הסט נשמר בהצלחה!');
        setSetData(prev => ({ ...prev, ...setForm }));
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
        
        if (onSave) {
          onSave(result.data);
        }
      } else {
        throw new Error(result.message || 'שגיאה בשמירת הסט');
      }
    } catch (err) {
      console.error('Error saving set:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCard = async () => {
    if (!validateCardForm(newCardForm)) {
      return;
    }

    setSaving(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const cardData = {
        userId: setData.userId,
        setId: setId,
        frontText: newCardForm.frontText.trim(),
        backText: newCardForm.backText.trim(),
        cardType: newCardForm.cardType,
        difficultyLevel: newCardForm.difficultyLevel,
        tags: newCardForm.tags ? newCardForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : []
      };

      const response = await fetch('/api/memory-cards', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cardData)
      });

      if (!response.ok) {
        throw new Error('שגיאה בהוספת הכרטיס');
      }

      const result = await response.json();
      if (result.success) {
        setCards(prev => [...prev, result.data]);
        setNewCardForm({
          frontText: '',
          backText: '',
          difficultyLevel: 'medium',
          tags: '',
          cardType: 'text'
        });
        setShowNewCardForm(false);
        setSuccessMessage('הכרטיס נוסף בהצלחה!');
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        throw new Error(result.message || 'שגיאה בהוספת הכרטיס');
      }
    } catch (err) {
      console.error('Error adding card:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditCard = (card) => {
    setEditingCard(card);
    setEditCardForm({
      frontText: card.frontText || '',
      backText: card.backText || '',
      difficultyLevel: card.difficultyLevel || 'medium',
      tags: card.tags ? card.tags.join(', ') : '',
      cardType: card.cardType || 'text'
    });
  };

  const handleSaveEditCard = async () => {
    if (!validateCardForm(editCardForm)) {
      return;
    }

    setSaving(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const cardData = {
        frontText: editCardForm.frontText.trim(),
        backText: editCardForm.backText.trim(),
        cardType: editCardForm.cardType,
        difficultyLevel: editCardForm.difficultyLevel,
        tags: editCardForm.tags ? editCardForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : []
      };

      const response = await fetch(`/api/memory-cards/${editingCard.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cardData)
      });

      if (!response.ok) {
        throw new Error('שגיאה בעדכון הכרטיס');
      }

      const result = await response.json();
      if (result.success) {
        setCards(prev => prev.map(card => 
          card.id === editingCard.id ? { ...card, ...result.data } : card
        ));
        setEditingCard(null);
        setSuccessMessage('הכרטיס עודכן בהצלחה!');
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        throw new Error(result.message || 'שגיאה בעדכון הכרטיס');
      }
    } catch (err) {
      console.error('Error updating card:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק כרטיס זה?')) {
      return;
    }

    setSaving(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const response = await fetch(`/api/memory-cards/${cardId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('שגיאה במחיקת הכרטיס');
      }

      const result = await response.json();
      if (result.success) {
        setCards(prev => prev.filter(card => card.id !== cardId));
        setSuccessMessage('הכרטיס נמחק בהצלחה!');
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        throw new Error(result.message || 'שגיאה במחיקת הכרטיס');
      }
    } catch (err) {
      console.error('Error deleting card:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="memory-card-set-editor">
        <div className="editor-header">
          <button className="btn btn-secondary" onClick={onClose}>
            ← חזור
          </button>
          <h2>טוען סט לעריכה...</h2>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !setData) {
    return (
      <div className="memory-card-set-editor">
        <div className="editor-header">
          <button className="btn btn-secondary" onClick={onClose}>
            ← חזור
          </button>
          <h2>שגיאה</h2>
        </div>
        <ErrorMessage message={error} />
      </div>
    );
  }

  return (
    <div className="memory-card-set-editor">
      <div className="editor-header">
        <div className="header-left">
          <button className="btn btn-secondary" onClick={onClose}>
            ← חזור
          </button>
        </div>
        
        <div className="header-center">
          <h2>עריכת סט: {setData?.name}</h2>
        </div>
        
        <div className="header-right">
          <button 
            className="btn btn-primary" 
            onClick={handleSaveSet}
            disabled={saving}
          >
            {saving ? 'שומר...' : 'שמור סט'}
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="success-message">
          <span className="success-icon">✓</span>
          {successMessage}
        </div>
      )}

      {error && (
        <ErrorMessage message={error} />
      )}

      {/* Set Information Form */}
      <div className="editor-section">
        <h3>פרטי הסט</h3>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label form-label-required">שם הסט</label>
            <input
              type="text"
              name="name"
              value={setForm.name}
              onChange={handleSetFormChange}
              className={`form-input ${errors.name ? 'error' : ''}`}
              placeholder="שם הסט"
              dir="rtl"
            />
            {errors.name && <div className="form-error">{errors.name}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">תיאור</label>
            <input
              type="text"
              name="description"
              value={setForm.description}
              onChange={handleSetFormChange}
              className="form-input"
              placeholder="תיאור הסט"
              dir="rtl"
            />
          </div>

          <div className="form-group">
            <label className="form-label">תחום לימוד</label>
            <select
              name="subjectArea"
              value={setForm.subjectArea}
              onChange={handleSetFormChange}
              className="form-select"
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
          </div>

          <div className="form-group">
            <label className="form-label">רמת כיתה</label>
            <select
              name="gradeLevel"
              value={setForm.gradeLevel}
              onChange={handleSetFormChange}
              className="form-select"
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
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="isPublic"
                checked={setForm.isPublic}
                onChange={handleSetFormChange}
              />
              <span className="checkbox-text">סט ציבורי (נגיש לכל המשתמשים)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Cards Management */}
      <div className="editor-section">
        <div className="section-header">
          <h3>כרטיסים ({cards.length})</h3>
          <button 
            className="btn btn-outline"
            onClick={() => setShowNewCardForm(!showNewCardForm)}
          >
            + הוסף כרטיס
          </button>
        </div>

        {/* New Card Form */}
        {showNewCardForm && (
          <div className="card-form">
            <h4>כרטיס חדש</h4>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label form-label-required">הצד הקדמי</label>
                <textarea
                  name="frontText"
                  value={newCardForm.frontText}
                  onChange={handleNewCardFormChange}
                  className={`form-textarea ${errors.frontText ? 'error' : ''}`}
                  placeholder="הכנס את השאלה או הטקסט הקדמי..."
                  rows="3"
                  dir="rtl"
                />
                {errors.frontText && <div className="form-error">{errors.frontText}</div>}
              </div>

              <div className="form-group">
                <label className="form-label form-label-required">הצד האחורי</label>
                <textarea
                  name="backText"
                  value={newCardForm.backText}
                  onChange={handleNewCardFormChange}
                  className={`form-textarea ${errors.backText ? 'error' : ''}`}
                  placeholder="הכנס את התשובה או הטקסט האחורי..."
                  rows="3"
                  dir="rtl"
                />
                {errors.backText && <div className="form-error">{errors.backText}</div>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">רמת קושי</label>
                <select
                  name="difficultyLevel"
                  value={newCardForm.difficultyLevel}
                  onChange={handleNewCardFormChange}
                  className="form-select"
                >
                  <option value="easy">קל</option>
                  <option value="medium">בינוני</option>
                  <option value="hard">קשה</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">תגיות</label>
                <input
                  type="text"
                  name="tags"
                  value={newCardForm.tags}
                  onChange={handleNewCardFormChange}
                  className="form-input"
                  placeholder="הפרד תגיות בפסיקים"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="form-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowNewCardForm(false)}
              >
                ביטול
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleAddCard}
                disabled={saving}
              >
                {saving ? 'מוסיף...' : 'הוסף כרטיס'}
              </button>
            </div>
          </div>
        )}

        {/* Cards List */}
        <div className="cards-list">
          {cards.length === 0 ? (
            <div className="empty-cards">
              <div className="empty-icon">🎴</div>
              <p>אין כרטיסים בסט זה. הוסף כרטיס ראשון!</p>
            </div>
          ) : (
            <div className="cards-grid">
              {cards.map((card, index) => (
                <div key={card.id} className="card-editor-item">
                  <div className="card-number">{index + 1}</div>
                  
                  {editingCard && editingCard.id === card.id ? (
                    // Edit mode
                    <div className="card-edit-form">
                      <div className="form-group">
                        <label className="form-label">הצד הקדמי</label>
                        <textarea
                          name="frontText"
                          value={editCardForm.frontText}
                          onChange={handleEditCardFormChange}
                          className="form-textarea"
                          rows="2"
                          dir="rtl"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label className="form-label">הצד האחורי</label>
                        <textarea
                          name="backText"
                          value={editCardForm.backText}
                          onChange={handleEditCardFormChange}
                          className="form-textarea"
                          rows="2"
                          dir="rtl"
                        />
                      </div>
                      
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">רמת קושי</label>
                          <select
                            name="difficultyLevel"
                            value={editCardForm.difficultyLevel}
                            onChange={handleEditCardFormChange}
                            className="form-select"
                          >
                            <option value="easy">קל</option>
                            <option value="medium">בינוני</option>
                            <option value="hard">קשה</option>
                          </select>
                        </div>
                        
                        <div className="form-group">
                          <label className="form-label">תגיות</label>
                          <input
                            type="text"
                            name="tags"
                            value={editCardForm.tags}
                            onChange={handleEditCardFormChange}
                            className="form-input"
                            placeholder="הפרד תגיות בפסיקים"
                            dir="rtl"
                          />
                        </div>
                      </div>
                      
                      <div className="card-actions">
                        <button 
                          className="btn btn-sm btn-secondary"
                          onClick={() => setEditingCard(null)}
                        >
                          ביטול
                        </button>
                        <button 
                          className="btn btn-sm btn-primary"
                          onClick={handleSaveEditCard}
                          disabled={saving}
                        >
                          {saving ? 'שומר...' : 'שמור'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <>
                      <MemoryCardPreview
                        card={card}
                        size="small"
                        showFlipHint={false}
                        className="editor-card"
                      />
                      
                      <div className="card-meta">
                        <span className={`difficulty-badge difficulty-${card.difficultyLevel}`}>
                          {card.difficultyLevel === 'easy' ? 'קל' : 
                           card.difficultyLevel === 'medium' ? 'בינוני' : 'קשה'}
                        </span>
                        {card.tags && card.tags.length > 0 && (
                          <div className="card-tags">
                            {card.tags.slice(0, 2).map((tag, tagIndex) => (
                              <span key={tagIndex} className="tag">{tag}</span>
                            ))}
                            {card.tags.length > 2 && (
                              <span className="tag-more">+{card.tags.length - 2}</span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="card-actions">
                        <button 
                          className="btn btn-sm btn-outline"
                          onClick={() => handleEditCard(card)}
                        >
                          ✏️ עריכה
                        </button>
                        <button 
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDeleteCard(card.id)}
                          disabled={saving}
                        >
                          🗑️ מחיקה
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .memory-card-set-editor {
          max-width: 1200px;
          margin: 0 auto;
          padding: 1rem;
        }

        .editor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid var(--color-border, #e9ecef);
        }

        .header-center h2 {
          margin: 0;
          color: var(--color-primary, #3498db);
          font-size: 1.8rem;
        }

        .success-message {
          background: #d4edda;
          color: #155724;
          padding: 1rem;
          border-radius: var(--radius-md, 8px);
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .success-icon {
          font-weight: bold;
          font-size: 1.2rem;
        }

        .editor-section {
          background: var(--color-surface, #ffffff);
          border: 2px solid var(--color-border, #e9ecef);
          border-radius: var(--radius-md, 8px);
          padding: 2rem;
          margin-bottom: 2rem;
        }

        .editor-section h3 {
          margin: 0 0 1.5rem 0;
          color: var(--color-text, #2c3e50);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .section-header h3 {
          margin: 0;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-label {
          font-weight: 500;
          color: var(--color-text, #2c3e50);
        }

        .form-label-required::after {
          content: ' *';
          color: #e74c3c;
        }

        .form-input,
        .form-textarea,
        .form-select {
          padding: 0.75rem;
          border: 2px solid var(--color-border, #e9ecef);
          border-radius: var(--radius-md, 8px);
          font-size: 1rem;
          transition: border-color 0.3s ease;
        }

        .form-input:focus,
        .form-textarea:focus,
        .form-select:focus {
          outline: none;
          border-color: var(--color-primary, #3498db);
        }

        .form-input.error,
        .form-textarea.error {
          border-color: #e74c3c;
        }

        .form-error {
          color: #e74c3c;
          font-size: 0.9rem;
        }

        .checkbox-group {
          flex-direction: row;
          align-items: center;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }

        .checkbox-text {
          font-weight: normal;
        }

        .card-form {
          background: var(--color-surfaceHover, #f8f9fa);
          border: 2px solid var(--color-border, #e9ecef);
          border-radius: var(--radius-md, 8px);
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .card-form h4 {
          margin: 0 0 1rem 0;
          color: var(--color-text, #2c3e50);
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 1rem;
        }

        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1.5rem;
        }

        .card-editor-item {
          position: relative;
          background: var(--color-surface, #ffffff);
          border: 2px solid var(--color-border, #e9ecef);
          border-radius: var(--radius-md, 8px);
          padding: 1rem;
          transition: all 0.3s ease;
        }

        .card-editor-item:hover {
          border-color: var(--color-primary, #3498db);
          box-shadow: 0 4px 12px rgba(52, 152, 219, 0.15);
        }

        .card-number {
          position: absolute;
          top: -10px;
          right: -10px;
          background: var(--color-primary, #3498db);
          color: white;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.9rem;
          z-index: 10;
          box-shadow: 0 2px 8px rgba(52, 152, 219, 0.3);
        }

        .card-edit-form {
          padding: 1rem;
          background: var(--color-surfaceHover, #f8f9fa);
          border-radius: var(--radius-md, 8px);
        }

        .card-meta {
          margin: 1rem 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .difficulty-badge {
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm, 4px);
          font-size: 0.8rem;
          font-weight: 500;
        }

        .difficulty-easy {
          background: #d4edda;
          color: #155724;
        }

        .difficulty-medium {
          background: #fff3cd;
          color: #856404;
        }

        .difficulty-hard {
          background: #f8d7da;
          color: #721c24;
        }

        .card-tags {
          display: flex;
          gap: 0.25rem;
          flex-wrap: wrap;
        }

        .tag {
          background: var(--color-surfaceHover, #f8f9fa);
          color: var(--color-text, #2c3e50);
          padding: 0.2rem 0.4rem;
          border-radius: var(--radius-sm, 4px);
          font-size: 0.75rem;
          border: 1px solid var(--color-border, #e9ecef);
        }

        .tag-more {
          background: var(--color-primary, #3498db);
          color: white;
          padding: 0.2rem 0.4rem;
          border-radius: var(--radius-sm, 4px);
          font-size: 0.75rem;
        }

        .card-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
          justify-content: flex-end;
        }

        .btn {
          padding: 0.5rem 1rem;
          border: 2px solid transparent;
          border-radius: var(--radius-md, 8px);
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s ease;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-primary {
          background: var(--color-primary, #3498db);
          color: white;
          border-color: var(--color-primary, #3498db);
        }

        .btn-primary:hover:not(:disabled) {
          background: var(--color-primaryHover, #2980b9);
          border-color: var(--color-primaryHover, #2980b9);
        }

        .btn-secondary {
          background: var(--color-border, #e9ecef);
          color: var(--color-text, #2c3e50);
          border-color: var(--color-border, #e9ecef);
        }

        .btn-secondary:hover:not(:disabled) {
          background: var(--color-surfaceHover, #f8f9fa);
        }

        .btn-outline {
          background: transparent;
          color: var(--color-primary, #3498db);
          border-color: var(--color-primary, #3498db);
        }

        .btn-outline:hover:not(:disabled) {
          background: var(--color-primary, #3498db);
          color: white;
        }

        .btn-danger {
          background: #e74c3c;
          color: white;
          border-color: #e74c3c;
        }

        .btn-danger:hover:not(:disabled) {
          background: #c0392b;
          border-color: #c0392b;
        }

        .btn-sm {
          padding: 0.375rem 0.75rem;
          font-size: 0.875rem;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .empty-cards {
          text-align: center;
          padding: 3rem 2rem;
          color: var(--color-textSecondary, #7f8c8d);
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        @media (max-width: 768px) {
          .editor-header {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }

          .header-left,
          .header-right {
            align-self: stretch;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .cards-grid {
            grid-template-columns: 1fr;
          }

          .card-actions {
            flex-direction: column;
          }

          .form-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default MemoryCardSetEditor;
