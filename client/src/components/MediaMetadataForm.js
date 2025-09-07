import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const FormOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
  backdrop-filter: blur(4px);
`;

const FormContainer = styled.div`
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 2rem;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
`;

const FormHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
`;

const FormTitle = styled.h2`
  color: var(--color-text);
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  direction: rtl;
`;

const CloseButton = styled.button`
  background: var(--color-danger);
  color: var(--color-textOnPrimary);
  border: none;
  border-radius: var(--radius-sm);
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: var(--transition-fast);

  &:hover {
    background: var(--color-dangerHover);
  }
`;

const FormSection = styled.div`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h3`
  color: var(--color-text);
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  direction: rtl;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  color: var(--color-text);
  font-weight: 500;
  margin-bottom: 0.5rem;
  direction: rtl;
  text-align: right;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surfaceElevated);
  color: var(--color-text);
  font-size: 0.9rem;
  direction: rtl;
  text-align: right;
  
  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px var(--color-primaryLight);
  }
  
  &::placeholder {
    color: var(--color-textSecondary);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surfaceElevated);
  color: var(--color-text);
  font-size: 0.9rem;
  direction: rtl;
  text-align: right;
  min-height: 100px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px var(--color-primaryLight);
  }
  
  &::placeholder {
    color: var(--color-textSecondary);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surfaceElevated);
  color: var(--color-text);
  font-size: 0.9rem;
  direction: rtl;
  
  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px var(--color-primaryLight);
  }
`;

const TagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

const Tag = styled.span`
  background: var(--color-primary);
  color: var(--color-textOnPrimary);
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const TagRemoveButton = styled.button`
  background: none;
  border: none;
  color: var(--color-textOnPrimary);
  cursor: pointer;
  font-size: 0.7rem;
  padding: 0;
  
  &:hover {
    opacity: 0.7;
  }
`;

const TagInput = styled.input`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surfaceElevated);
  color: var(--color-text);
  font-size: 0.8rem;
  direction: rtl;
  text-align: right;
  
  &:focus {
    outline: none;
    border-color: var(--color-primary);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition-fast);
  
  &.primary {
    background: var(--color-primary);
    color: var(--color-textOnPrimary);
    
    &:hover {
      background: var(--color-primaryHover);
    }
    
    &:disabled {
      background: var(--color-textSecondary);
      cursor: not-allowed;
    }
  }
  
  &.secondary {
    background: var(--color-surfaceElevated);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    
    &:hover {
      background: var(--color-border);
    }
  }
`;

const ErrorMessage = styled.div`
  background: var(--color-errorLight);
  color: var(--color-error);
  padding: 0.75rem;
  border-radius: var(--radius-sm);
  margin-bottom: 1rem;
  border: 1px solid var(--color-errorBorder);
  direction: rtl;
  text-align: right;
`;

const SuccessMessage = styled.div`
  background: var(--color-successLight);
  color: var(--color-success);
  padding: 0.75rem;
  border-radius: var(--radius-sm);
  margin-bottom: 1rem;
  border: 1px solid var(--color-successBorder);
  direction: rtl;
  text-align: right;
`;

const MediaMetadataForm = ({ 
  isOpen, 
  onClose, 
  mediaItem, 
  mediaType,
  onSave,
  isLoading = false 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    classLevel: '',
    curriculum: '',
    lessonName: '',
    tags: [],
    category: '',
    language: 'he',
    duration: '',
    quality: '',
    notes: ''
  });
  
  const [newTag, setNewTag] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  // Initialize form data when modal opens or mediaItem changes
  useEffect(() => {
    if (isOpen && mediaItem) {
      const metadata = mediaItem.metadata || {};
      const tags = mediaItem.tags || [];
      
      setFormData({
        title: mediaItem.title || mediaItem.name || mediaItem.filename || mediaItem.originalFileName || '',
        description: metadata.description || '',
        subject: metadata.subject || '',
        classLevel: metadata.classLevel || '',
        curriculum: metadata.curriculum || '',
        lessonName: metadata.lessonName || '',
        tags: Array.isArray(tags) ? tags : [],
        category: metadata.category || '',
        language: metadata.language || 'he',
        duration: metadata.duration || '',
        quality: metadata.quality || '',
        notes: metadata.notes || ''
      });
      
      setError('');
      setSuccess('');
    }
  }, [isOpen, mediaItem]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault();
      const tag = newTag.trim();
      if (!formData.tags.includes(tag)) {
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, tag]
        }));
      }
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('שם הקובץ הוא שדה חובה');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Prepare metadata object
      const metadata = {
        description: formData.description,
        subject: formData.subject,
        classLevel: formData.classLevel,
        curriculum: formData.curriculum,
        lessonName: formData.lessonName,
        category: formData.category,
        language: formData.language,
        duration: formData.duration,
        quality: formData.quality,
        notes: formData.notes,
        lastModified: new Date().toISOString()
      };

      // Call the save function
      await onSave({
        title: formData.title,
        metadata,
        tags: formData.tags
      });

      setSuccess('המטא-דאטה נשמרה בהצלחה');
      
      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (error) {
      console.error('Error saving metadata:', error);
      setError(error.message || 'שגיאה בשמירת המטא-דאטה');
    } finally {
      setSaving(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const getMediaTypeIcon = () => {
    switch (mediaType) {
      case 'audio': return '🎵';
      case 'video': return '🎬';
      case 'document': return '📄';
      case 'image': return '🖼️';
      default: return '📁';
    }
  };

  const getMediaTypeLabel = () => {
    switch (mediaType) {
      case 'audio': return 'אודיו';
      case 'video': return 'וידאו';
      case 'document': return 'מסמך';
      case 'image': return 'תמונה';
      default: return 'מדיה';
    }
  };

  return (
    <FormOverlay onClick={handleOverlayClick}>
      <FormContainer>
        <FormHeader>
          <FormTitle>
            {getMediaTypeIcon()} עריכת מטא-דאטה - {getMediaTypeLabel()}
          </FormTitle>
          <CloseButton onClick={onClose}>
            ✕ סגור
          </CloseButton>
        </FormHeader>

        {error && <ErrorMessage>{error}</ErrorMessage>}
        {success && <SuccessMessage>{success}</SuccessMessage>}

        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <FormSection>
            <SectionTitle>📝 מידע בסיסי</SectionTitle>
            
            <FormGroup>
              <Label>שם הקובץ *</Label>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="הכנס שם לקובץ"
                required
              />
            </FormGroup>

            <FormGroup>
              <Label>תיאור</Label>
              <TextArea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="תיאור קצר של התוכן"
              />
            </FormGroup>

            <FormGroup>
              <Label>קטגוריה</Label>
              <Select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
              >
                <option value="">בחר קטגוריה</option>
                <option value="lesson">שיעור</option>
                <option value="exercise">תרגיל</option>
                <option value="exam">מבחן</option>
                <option value="presentation">מצגת</option>
                <option value="homework">שיעורי בית</option>
                <option value="project">פרויקט</option>
                <option value="other">אחר</option>
              </Select>
            </FormGroup>
          </FormSection>

          {/* Educational Information */}
          <FormSection>
            <SectionTitle>🎓 מידע חינוכי</SectionTitle>
            
            <FormGroup>
              <Label>שם השיעור</Label>
              <Input
                type="text"
                value={formData.lessonName}
                onChange={(e) => handleInputChange('lessonName', e.target.value)}
                placeholder="שם השיעור או הנושא"
              />
            </FormGroup>

            <FormGroup>
              <Label>מקצוע</Label>
              <Select
                value={formData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
              >
                <option value="">בחר מקצוע</option>
                <option value="mathematics">מתמטיקה</option>
                <option value="hebrew">עברית</option>
                <option value="english">אנגלית</option>
                <option value="science">מדעים</option>
                <option value="history">היסטוריה</option>
                <option value="geography">גיאוגרפיה</option>
                <option value="literature">ספרות</option>
                <option value="physics">פיזיקה</option>
                <option value="chemistry">כימיה</option>
                <option value="biology">ביולוגיה</option>
                <option value="art">אמנות</option>
                <option value="music">מוזיקה</option>
                <option value="pe">חינוך גופני</option>
                <option value="other">אחר</option>
              </Select>
            </FormGroup>

            <FormGroup>
              <Label>רמת כיתה</Label>
              <Select
                value={formData.classLevel}
                onChange={(e) => handleInputChange('classLevel', e.target.value)}
              >
                <option value="">בחר רמת כיתה</option>
                <option value="kindergarten">גן</option>
                <option value="grade1">כיתה א'</option>
                <option value="grade2">כיתה ב'</option>
                <option value="grade3">כיתה ג'</option>
                <option value="grade4">כיתה ד'</option>
                <option value="grade5">כיתה ה'</option>
                <option value="grade6">כיתה ו'</option>
                <option value="grade7">כיתה ז'</option>
                <option value="grade8">כיתה ח'</option>
                <option value="grade9">כיתה ט'</option>
                <option value="grade10">כיתה י'</option>
                <option value="grade11">כיתה יא'</option>
                <option value="grade12">כיתה יב'</option>
              </Select>
            </FormGroup>

            <FormGroup>
              <Label>תכנית לימודים</Label>
              <Select
                value={formData.curriculum}
                onChange={(e) => handleInputChange('curriculum', e.target.value)}
              >
                <option value="">בחר תכנית לימודים</option>
                <option value="israeli">תכנית לימודים ישראלית</option>
                <option value="international">תכנית בינלאומית</option>
                <option value="religious">תכנית דתית</option>
                <option value="special">חינוך מיוחד</option>
                <option value="other">אחר</option>
              </Select>
            </FormGroup>
          </FormSection>

          {/* Technical Information */}
          <FormSection>
            <SectionTitle>⚙️ מידע טכני</SectionTitle>
            
            <FormGroup>
              <Label>שפה</Label>
              <Select
                value={formData.language}
                onChange={(e) => handleInputChange('language', e.target.value)}
              >
                <option value="he">עברית</option>
                <option value="en">אנגלית</option>
                <option value="ar">ערבית</option>
                <option value="fr">צרפתית</option>
                <option value="es">ספרדית</option>
                <option value="ru">רוסית</option>
                <option value="other">אחר</option>
              </Select>
            </FormGroup>

            {(mediaType === 'audio' || mediaType === 'video') && (
              <FormGroup>
                <Label>משך זמן (דקות)</Label>
                <Input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', e.target.value)}
                  placeholder="משך הזמן בדקות"
                  min="0"
                />
              </FormGroup>
            )}

            <FormGroup>
              <Label>איכות</Label>
              <Select
                value={formData.quality}
                onChange={(e) => handleInputChange('quality', e.target.value)}
              >
                <option value="">בחר איכות</option>
                <option value="high">גבוהה</option>
                <option value="medium">בינונית</option>
                <option value="low">נמוכה</option>
              </Select>
            </FormGroup>
          </FormSection>

          {/* Tags */}
          <FormSection>
            <SectionTitle>🏷️ תגיות</SectionTitle>
            
            <TagsContainer>
              {formData.tags.map((tag, index) => (
                <Tag key={index}>
                  {tag}
                  <TagRemoveButton
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    ✕
                  </TagRemoveButton>
                </Tag>
              ))}
            </TagsContainer>
            
            <TagInput
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="הוסף תגית והקש Enter"
            />
          </FormSection>

          {/* Notes */}
          <FormSection>
            <SectionTitle>📋 הערות</SectionTitle>
            
            <FormGroup>
              <Label>הערות נוספות</Label>
              <TextArea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="הערות או מידע נוסף"
              />
            </FormGroup>
          </FormSection>

          <ButtonGroup>
            <Button type="button" className="secondary" onClick={onClose}>
              ביטול
            </Button>
            <Button 
              type="submit" 
              className="primary" 
              disabled={saving || isLoading}
            >
              {saving ? 'שומר...' : 'שמור שינויים'}
            </Button>
          </ButtonGroup>
        </form>
      </FormContainer>
    </FormOverlay>
  );
};

export default MediaMetadataForm;
