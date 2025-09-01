import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import MemoryCardPreview from './MemoryCardPreview';

const CardGenerationInterface = ({ 
  recordingId, 
  onClose, 
  onCardsGenerated,
  initialConfig = {} 
}) => {
  const [step, setStep] = useState('config'); // 'config', 'generating', 'preview', 'saving'
  const [config, setConfig] = useState({
    cardCount: 10,
    difficultyLevel: 'medium',
    subjectArea: '',
    gradeLevel: '',
    ...initialConfig
  });
  const [generatedCards, setGeneratedCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [jobId, setJobId] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');
  
  // Set selection options
  const [saveToExistingSet, setSaveToExistingSet] = useState(false);
  const [selectedSetId, setSelectedSetId] = useState('');
  const [newSetName, setNewSetName] = useState('');
  const [newSetDescription, setNewSetDescription] = useState('');
  const [userSets, setUserSets] = useState([]);

  useEffect(() => {
    loadUserSets();
  }, []);

  useEffect(() => {
    // Select all cards by default when generated
    if (generatedCards.length > 0) {
      setSelectedCards(new Set(generatedCards.map((_, index) => index)));
    }
  }, [generatedCards]);

  const loadUserSets = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const userId = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user'))?.id;
      
      if (!userId) return;

      const response = await fetch(`/api/memory-cards/sets/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setUserSets(result.data || []);
      }
    } catch (error) {
      console.error('Error loading user sets:', error);
    }
  };

  const handleGenerateCards = async () => {
    setStep('generating');
    setError(null);
    setLoading(true);
    setGenerationProgress('מתחיל יצירת כרטיסים...');

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const response = await fetch(`/api/memory-cards/generate/from-lesson/${recordingId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ config })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'שגיאה ביצירת כרטיסים');
      }

      if (result.success) {
        setJobId(result.jobId);
        setGeneratedCards(result.cards || []);
        setGenerationProgress('כרטיסים נוצרו בהצלחה!');
        
        setTimeout(() => {
          setStep('preview');
          setLoading(false);
        }, 1000);
      } else {
        throw new Error(result.message || 'שגיאה ביצירת כרטיסים');
      }

    } catch (error) {
      console.error('Error generating cards:', error);
      setError(error.message);
      setStep('config');
      setLoading(false);
    }
  };

  const handleCardToggle = (index) => {
    const newSelected = new Set(selectedCards);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedCards(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedCards.size === generatedCards.length) {
      setSelectedCards(new Set());
    } else {
      setSelectedCards(new Set(generatedCards.map((_, index) => index)));
    }
  };

  const handleSaveCards = async () => {
    if (selectedCards.size === 0) {
      setError('יש לבחור לפחות כרטיס אחד לשמירה');
      return;
    }

    if (!saveToExistingSet && !newSetName.trim()) {
      setError('יש להזין שם לסט החדש');
      return;
    }

    if (saveToExistingSet && !selectedSetId) {
      setError('יש לבחור סט קיים');
      return;
    }

    setStep('saving');
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const approvedCards = Array.from(selectedCards).map(index => generatedCards[index]);

      const requestBody = {
        approvedCards,
        ...(saveToExistingSet 
          ? { setId: parseInt(selectedSetId) }
          : { 
              setName: newSetName.trim(),
              setDescription: newSetDescription.trim() || null
            }
        )
      };

      const response = await fetch(`/api/memory-cards/generate/approve/${jobId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'שגיאה בשמירת הכרטיסים');
      }

      if (result.success) {
        // Notify parent component
        if (onCardsGenerated) {
          onCardsGenerated({
            setId: result.data.setId,
            setName: result.data.setName,
            cardsAdded: result.data.cardsAdded
          });
        }

        // Close the interface
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        throw new Error(result.message || 'שגיאה בשמירת הכרטיסים');
      }

    } catch (error) {
      console.error('Error saving cards:', error);
      setError(error.message);
      setStep('preview');
      setLoading(false);
    }
  };

  const renderConfigStep = () => (
    <div className="config-step">
      <h3>הגדרות יצירת כרטיסים</h3>
      
      <div className="config-form">
        <div className="form-group">
          <label>מספר כרטיסים ליצירה:</label>
          <select 
            value={config.cardCount} 
            onChange={(e) => setConfig({...config, cardCount: parseInt(e.target.value)})}
          >
            <option value={5}>5 כרטיסים</option>
            <option value={10}>10 כרטיסים</option>
            <option value={15}>15 כרטיסים</option>
            <option value={20}>20 כרטיסים</option>
          </select>
        </div>

        <div className="form-group">
          <label>רמת קושי:</label>
          <select 
            value={config.difficultyLevel} 
            onChange={(e) => setConfig({...config, difficultyLevel: e.target.value})}
          >
            <option value="easy">קל</option>
            <option value="medium">בינוני</option>
            <option value="hard">קשה</option>
          </select>
        </div>

        <div className="form-group">
          <label>תחום לימוד:</label>
          <input
            type="text"
            value={config.subjectArea}
            onChange={(e) => setConfig({...config, subjectArea: e.target.value})}
            placeholder="לדוגמה: מתמטיקה, היסטוריה, מדעים..."
            dir="rtl"
          />
        </div>

        <div className="form-group">
          <label>כיתה:</label>
          <input
            type="text"
            value={config.gradeLevel}
            onChange={(e) => setConfig({...config, gradeLevel: e.target.value})}
            placeholder="לדוגמה: כיתה ה, כיתות ד-ו..."
            dir="rtl"
          />
        </div>
      </div>

      <div className="step-actions">
        <button className="btn btn-secondary" onClick={onClose}>
          ביטול
        </button>
        <button className="btn btn-primary" onClick={handleGenerateCards}>
          🎯 צור כרטיסים
        </button>
      </div>
    </div>
  );

  const renderGeneratingStep = () => (
    <div className="generating-step">
      <div className="generation-status">
        <LoadingSpinner />
        <h3>יוצר כרטיסים...</h3>
        <p>{generationProgress}</p>
        
        <div className="generation-info">
          <div className="info-item">
            <span className="label">מספר כרטיסים:</span>
            <span className="value">{config.cardCount}</span>
          </div>
          <div className="info-item">
            <span className="label">רמת קושי:</span>
            <span className="value">
              {config.difficultyLevel === 'easy' ? 'קל' : 
               config.difficultyLevel === 'medium' ? 'בינוני' : 'קשה'}
            </span>
          </div>
          {config.subjectArea && (
            <div className="info-item">
              <span className="label">תחום:</span>
              <span className="value">{config.subjectArea}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="preview-step">
      <div className="preview-header">
        <h3>כרטיסים שנוצרו ({generatedCards.length})</h3>
        <p>בחר את הכרטיסים שברצונך לשמור</p>
        
        <div className="selection-controls">
          <button 
            className="btn btn-outline btn-sm" 
            onClick={handleSelectAll}
          >
            {selectedCards.size === generatedCards.length ? 'בטל בחירת הכל' : 'בחר הכל'}
          </button>
          <span className="selection-count">
            נבחרו {selectedCards.size} מתוך {generatedCards.length}
          </span>
        </div>
      </div>

      <div className="cards-preview-grid">
        {generatedCards.map((card, index) => (
          <div 
            key={index} 
            className={`card-preview-item ${selectedCards.has(index) ? 'selected' : ''}`}
          >
            <div className="card-selection">
              <input
                type="checkbox"
                checked={selectedCards.has(index)}
                onChange={() => handleCardToggle(index)}
                id={`card-${index}`}
              />
              <label htmlFor={`card-${index}`} className="card-number">
                {index + 1}
              </label>
            </div>
            
            <MemoryCardPreview
              card={card}
              size="small"
              showFlipHint={false}
              className="generated-card"
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
          </div>
        ))}
      </div>

      <div className="save-options">
        <h4>שמירת הכרטיסים</h4>
        
        <div className="save-option">
          <input
            type="radio"
            id="new-set"
            name="save-option"
            checked={!saveToExistingSet}
            onChange={() => setSaveToExistingSet(false)}
          />
          <label htmlFor="new-set">צור סט חדש</label>
        </div>

        {!saveToExistingSet && (
          <div className="new-set-form">
            <input
              type="text"
              value={newSetName}
              onChange={(e) => setNewSetName(e.target.value)}
              placeholder="שם הסט החדש"
              dir="rtl"
              required
            />
            <textarea
              value={newSetDescription}
              onChange={(e) => setNewSetDescription(e.target.value)}
              placeholder="תיאור הסט (אופציונלי)"
              dir="rtl"
              rows={2}
            />
          </div>
        )}

        <div className="save-option">
          <input
            type="radio"
            id="existing-set"
            name="save-option"
            checked={saveToExistingSet}
            onChange={() => setSaveToExistingSet(true)}
          />
          <label htmlFor="existing-set">הוסף לסט קיים</label>
        </div>

        {saveToExistingSet && (
          <div className="existing-set-form">
            <select
              value={selectedSetId}
              onChange={(e) => setSelectedSetId(e.target.value)}
              required
            >
              <option value="">בחר סט קיים...</option>
              {userSets.map(set => (
                <option key={set.id} value={set.id}>
                  {set.name} ({set.totalCards || 0} כרטיסים)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="step-actions">
        <button className="btn btn-secondary" onClick={() => setStep('config')}>
          ← חזור
        </button>
        <button 
          className="btn btn-primary" 
          onClick={handleSaveCards}
          disabled={selectedCards.size === 0}
        >
          💾 שמור כרטיסים ({selectedCards.size})
        </button>
      </div>
    </div>
  );

  const renderSavingStep = () => (
    <div className="saving-step">
      <div className="saving-status">
        <LoadingSpinner />
        <h3>שומר כרטיסים...</h3>
        <p>הכרטיסים נשמרים בסט שלך</p>
        
        <div className="saving-info">
          <div className="info-item">
            <span className="label">כרטיסים נבחרים:</span>
            <span className="value">{selectedCards.size}</span>
          </div>
          <div className="info-item">
            <span className="label">יעד:</span>
            <span className="value">
              {saveToExistingSet 
                ? userSets.find(s => s.id === parseInt(selectedSetId))?.name || 'סט קיים'
                : newSetName || 'סט חדש'
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="card-generation-interface">
      <div className="generation-modal">
        <div className="modal-header">
          <h2>🎴 יצירת כרטיסי זיכרון</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-content">
          {error && <ErrorMessage message={error} />}
          
          {step === 'config' && renderConfigStep()}
          {step === 'generating' && renderGeneratingStep()}
          {step === 'preview' && renderPreviewStep()}
          {step === 'saving' && renderSavingStep()}
        </div>
      </div>

      <style jsx>{`
        .card-generation-interface {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .generation-modal {
          background: var(--color-surface, #ffffff);
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          max-width: 90vw;
          max-height: 90vh;
          width: 100%;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid var(--color-border, #e9ecef);
          background: linear-gradient(135deg, var(--color-primary, #3498db) 0%, #2980b9 100%);
          color: white;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .close-btn {
          background: none;
          border: none;
          color: white;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .modal-content {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
        }

        .config-step h3,
        .preview-step h3 {
          margin: 0 0 1rem 0;
          color: var(--color-text, #2c3e50);
          font-size: 1.2rem;
          font-weight: 700;
        }

        .config-form {
          display: grid;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-weight: 600;
          color: var(--color-text, #2c3e50);
          font-size: 0.9rem;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 0.75rem;
          border: 2px solid var(--color-border, #e9ecef);
          border-radius: 8px;
          font-size: 1rem;
          background: var(--color-inputBackground, #ffffff);
          color: var(--color-text, #2c3e50);
          transition: all 0.3s ease;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: var(--color-primary, #3498db);
          box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
        }

        .generating-step,
        .saving-step {
          text-align: center;
          padding: 2rem 0;
        }

        .generation-status,
        .saving-status {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .generation-status h3,
        .saving-status h3 {
          margin: 0;
          color: var(--color-text, #2c3e50);
          font-size: 1.3rem;
          font-weight: 700;
        }

        .generation-status p,
        .saving-status p {
          margin: 0;
          color: var(--color-textSecondary, #7f8c8d);
          font-size: 1rem;
        }

        .generation-info,
        .saving-info {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          background: var(--color-surfaceHover, #f8f9fa);
          padding: 1rem;
          border-radius: 8px;
          border: 1px solid var(--color-border, #e9ecef);
          min-width: 200px;
        }

        .info-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .info-item .label {
          font-size: 0.85rem;
          color: var(--color-textSecondary, #7f8c8d);
          font-weight: 600;
        }

        .info-item .value {
          font-size: 0.9rem;
          color: var(--color-text, #2c3e50);
          font-weight: 700;
        }

        .preview-header {
          margin-bottom: 1.5rem;
        }

        .preview-header p {
          margin: 0.5rem 0;
          color: var(--color-textSecondary, #7f8c8d);
        }

        .selection-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 1rem;
          padding: 0.75rem;
          background: var(--color-surfaceHover, #f8f9fa);
          border-radius: 8px;
          border: 1px solid var(--color-border, #e9ecef);
        }

        .selection-count {
          font-weight: 600;
          color: var(--color-primary, #3498db);
        }

        .cards-preview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
          max-height: 400px;
          overflow-y: auto;
          padding: 0.5rem;
        }

        .card-preview-item {
          position: relative;
          border: 2px solid var(--color-border, #e9ecef);
          border-radius: 12px;
          padding: 0.75rem;
          background: var(--color-surface, #ffffff);
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .card-preview-item:hover {
          border-color: var(--color-primary, #3498db);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(52, 152, 219, 0.2);
        }

        .card-preview-item.selected {
          border-color: var(--color-primary, #3498db);
          background: linear-gradient(135deg, rgba(52, 152, 219, 0.05) 0%, rgba(52, 152, 219, 0.02) 100%);
          box-shadow: 0 2px 8px rgba(52, 152, 219, 0.2);
        }

        .card-selection {
          position: absolute;
          top: -8px;
          right: -8px;
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .card-selection input[type="checkbox"] {
          display: none;
        }

        .card-number {
          background: linear-gradient(135deg, var(--color-primary, #3498db) 0%, #2980b9 100%);
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 2px solid var(--color-surface, #ffffff);
          box-shadow: 0 2px 6px rgba(52, 152, 219, 0.4);
        }

        .card-preview-item.selected .card-number {
          background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
          box-shadow: 0 2px 6px rgba(39, 174, 96, 0.4);
        }

        .card-preview-item:not(.selected) .card-number {
          opacity: 0.7;
        }

        .card-meta {
          margin-top: 0.75rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .difficulty-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 600;
        }

        .difficulty-easy {
          background: rgba(39, 174, 96, 0.1);
          color: #27ae60;
          border: 1px solid rgba(39, 174, 96, 0.2);
        }

        .difficulty-medium {
          background: rgba(243, 156, 18, 0.1);
          color: #f39c12;
          border: 1px solid rgba(243, 156, 18, 0.2);
        }

        .difficulty-hard {
          background: rgba(231, 76, 60, 0.1);
          color: #e74c3c;
          border: 1px solid rgba(231, 76, 60, 0.2);
        }

        .card-tags {
          display: flex;
          gap: 0.25rem;
          flex-wrap: wrap;
        }

        .tag {
          background: linear-gradient(135deg, rgba(52, 152, 219, 0.1) 0%, rgba(52, 152, 219, 0.05) 100%);
          color: var(--color-primary, #3498db);
          padding: 0.2rem 0.4rem;
          border-radius: 8px;
          font-size: 0.65rem;
          font-weight: 600;
          border: 1px solid rgba(52, 152, 219, 0.2);
        }

        .tag-more {
          background: linear-gradient(135deg, rgba(108, 117, 125, 0.1) 0%, rgba(108, 117, 125, 0.05) 100%);
          color: var(--color-textSecondary, #6c757d);
          border-color: rgba(108, 117, 125, 0.2);
        }

        .save-options {
          background: var(--color-surfaceHover, #f8f9fa);
          padding: 1.5rem;
          border-radius: 12px;
          border: 1px solid var(--color-border, #e9ecef);
          margin-bottom: 2rem;
        }

        .save-options h4 {
          margin: 0 0 1rem 0;
          color: var(--color-text, #2c3e50);
          font-size: 1.1rem;
          font-weight: 700;
        }

        .save-option {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .save-option input[type="radio"] {
          margin: 0;
        }

        .save-option label {
          font-weight: 600;
          color: var(--color-text, #2c3e50);
          cursor: pointer;
        }

        .new-set-form,
        .existing-set-form {
          margin: 0.5rem 0 1rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .step-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--color-border, #e9ecef);
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-primary {
          background: linear-gradient(135deg, var(--color-primary, #3498db) 0%, #2980b9 100%);
          color: white;
          box-shadow: 0 2px 6px rgba(52, 152, 219, 0.3);
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 3px 8px rgba(52, 152, 219, 0.4);
        }

        .btn-primary:disabled {
          background: var(--color-border, #e9ecef);
          color: var(--color-textSecondary, #7f8c8d);
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .btn-secondary {
          background: var(--color-surfaceHover, #f8f9fa);
          color: var(--color-text, #2c3e50);
          border: 1px solid var(--color-border, #e9ecef);
        }

        .btn-secondary:hover {
          background: var(--color-border, #e9ecef);
          transform: translateY(-1px);
        }

        .btn-outline {
          background: transparent;
          color: var(--color-primary, #3498db);
          border: 1px solid var(--color-primary, #3498db);
        }

        .btn-outline:hover {
          background: var(--color-primary, #3498db);
          color: white;
        }

        .btn-sm {
          padding: 0.5rem 1rem;
          font-size: 0.8rem;
        }

        @media (max-width: 768px) {
          .generation-modal {
            max-width: 95vw;
            max-height: 95vh;
            margin: 0.5rem;
          }

          .modal-header {
            padding: 1rem;
          }

          .modal-header h2 {
            font-size: 1.3rem;
          }

          .modal-content {
            padding: 1rem;
          }

          .config-form {
            gap: 0.75rem;
          }

          .cards-preview-grid {
            grid-template-columns: 1fr;
            max-height: 300px;
          }

          .step-actions {
            flex-direction: column;
            gap: 0.75rem;
          }

          .btn {
            width: 100%;
            justify-content: center;
          }

          .selection-controls {
            flex-direction: column;
            gap: 0.5rem;
            text-align: center;
          }

          .generation-info,
          .saving-info {
            min-width: auto;
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .card-generation-interface {
            padding: 0.5rem;
          }

          .generation-modal {
            max-width: 100vw;
            max-height: 100vh;
            border-radius: 8px;
          }

          .modal-header {
            padding: 0.75rem;
          }

          .modal-content {
            padding: 0.75rem;
          }

          .cards-preview-grid {
            gap: 0.75rem;
            padding: 0.25rem;
          }

          .card-preview-item {
            padding: 0.5rem;
          }

          .save-options {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default CardGenerationInterface;
