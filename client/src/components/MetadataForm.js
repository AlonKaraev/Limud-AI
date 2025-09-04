import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const MetadataContainer = styled.div`
  background: var(--color-surfaceElevated, #f8f9fa);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 1rem;
  margin: 0.5rem 0;
`;

const MetadataTitle = styled.h4`
  color: var(--color-text);
  margin: 0 0 1rem 0;
  font-size: 0.9rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const FormFieldFull = styled(FormField)`
  grid-column: 1 / -1;
`;

const Label = styled.label`
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-text);
`;

const Input = styled.input`
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-family: 'Heebo', sans-serif;
  font-size: 0.9rem;
  background: var(--color-surface);
  color: var(--color-text);
  transition: var(--transition-fast);

  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px var(--color-primaryLight, rgba(52, 152, 219, 0.2));
  }

  &::placeholder {
    color: var(--color-textTertiary);
  }
`;

const Select = styled.select`
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-family: 'Heebo', sans-serif;
  font-size: 0.9rem;
  background: var(--color-surface);
  color: var(--color-text);
  transition: var(--transition-fast);

  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px var(--color-primaryLight, rgba(52, 152, 219, 0.2));
  }
`;

const TextArea = styled.textarea`
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-family: 'Heebo', sans-serif;
  font-size: 0.9rem;
  background: var(--color-surface);
  color: var(--color-text);
  transition: var(--transition-fast);
  resize: vertical;
  min-height: 60px;

  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px var(--color-primaryLight, rgba(52, 152, 219, 0.2));
  }

  &::placeholder {
    color: var(--color-textTertiary);
  }
`;

const ToggleButton = styled.button`
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  padding: 0.25rem 0;
  text-decoration: underline;
  transition: var(--transition-fast);

  &:hover {
    color: var(--color-primaryHover);
  }
`;

const CollapsibleSection = styled.div`
  margin-top: 0.5rem;
  border-top: 1px solid var(--color-border);
  padding-top: 0.5rem;
`;

// Predefined options for dropdowns
const DOMAINS = [
  'מתמטיקה',
  'עברית',
  'אנגלית',
  'מדעים',
  'היסטוריה',
  'גיאוגרפיה',
  'אמנות',
  'מוזיקה',
  'ספורט',
  'מחשבים',
  'פיזיקה',
  'כימיה',
  'ביולוגיה',
  'ספרות',
  'פילוסופיה',
  'אחר'
];


const MetadataForm = ({ 
  fileData, 
  onChange, 
  disabled = false,
  showAdvanced = false,
  mediaType = 'document'
}) => {
  const [metadata, setMetadata] = useState({
    fileName: fileData?.name || '',
    domain: '',
    subject: '',
    topic: '',
    gradeLevel: '',
    description: '',
    keywords: '',
    language: 'עברית',
    difficulty: 'בינוני',
    duration: '',
    author: '',
    ...fileData?.metadata
  });

  const [showAdvancedFields, setShowAdvancedFields] = useState(showAdvanced);

  // Initialize fileName from fileData
  useEffect(() => {
    if (fileData?.name && !metadata.fileName) {
      handleMetadataChange('fileName', fileData.name);
    }
  }, [fileData?.name]);

  const handleMetadataChange = (field, value) => {
    const updatedMetadata = {
      ...metadata,
      [field]: value
    };
    setMetadata(updatedMetadata);
    
    // Call parent onChange with updated metadata
    if (onChange) {
      onChange(updatedMetadata);
    }
  };

  const getMediaIcon = () => {
    switch (mediaType) {
      case 'audio':
        return '🎵';
      case 'video':
        return '🎬';
      case 'document':
        return '📄';
      default:
        return '📁';
    }
  };

  return (
    <MetadataContainer>
      <MetadataTitle>
        {getMediaIcon()} פרטי הקובץ
      </MetadataTitle>
      
      <FormGrid>
        <FormFieldFull>
          <Label>שם הקובץ *</Label>
          <Input
            type="text"
            value={metadata.fileName}
            onChange={(e) => handleMetadataChange('fileName', e.target.value)}
            placeholder="הכנס שם לקובץ..."
            disabled={disabled}
          />
        </FormFieldFull>

        <FormField>
          <Label>תחום *</Label>
          <Select
            value={metadata.domain}
            onChange={(e) => handleMetadataChange('domain', e.target.value)}
            disabled={disabled}
          >
            <option value="">בחר תחום...</option>
            {DOMAINS.map(domain => (
              <option key={domain} value={domain}>{domain}</option>
            ))}
          </Select>
        </FormField>

        <FormField>
          <Label>נושא</Label>
          <Input
            type="text"
            value={metadata.subject}
            onChange={(e) => handleMetadataChange('subject', e.target.value)}
            placeholder="הכנס נושא..."
            disabled={disabled}
          />
        </FormField>

        <FormField>
          <Label>נושא משני</Label>
          <Input
            type="text"
            value={metadata.topic}
            onChange={(e) => handleMetadataChange('topic', e.target.value)}
            placeholder="הכנס נושא משני..."
            disabled={disabled}
          />
        </FormField>

        <FormField>
          <Label>רמת כיתה</Label>
          <Input
            type="text"
            value={metadata.gradeLevel}
            onChange={(e) => handleMetadataChange('gradeLevel', e.target.value)}
            placeholder="הכנס רמת כיתה..."
            disabled={disabled}
          />
        </FormField>
      </FormGrid>

      <FormFieldFull>
        <Label>תיאור</Label>
        <TextArea
          value={metadata.description}
          onChange={(e) => handleMetadataChange('description', e.target.value)}
          placeholder="תיאור קצר של תוכן הקובץ..."
          disabled={disabled}
        />
      </FormFieldFull>

      <ToggleButton
        type="button"
        onClick={() => setShowAdvancedFields(!showAdvancedFields)}
        disabled={disabled}
      >
        {showAdvancedFields ? 'הסתר שדות מתקדמים' : 'הצג שדות מתקדמים'}
      </ToggleButton>

      {showAdvancedFields && (
        <CollapsibleSection>
          <FormGrid>
            <FormField>
              <Label>שפה</Label>
              <Select
                value={metadata.language}
                onChange={(e) => handleMetadataChange('language', e.target.value)}
                disabled={disabled}
              >
                <option value="עברית">עברית</option>
                <option value="אנגלית">אנגלית</option>
                <option value="ערבית">ערבית</option>
                <option value="רוסית">רוסית</option>
                <option value="צרפתית">צרפתית</option>
                <option value="אחר">אחר</option>
              </Select>
            </FormField>

            <FormField>
              <Label>רמת קושי</Label>
              <Select
                value={metadata.difficulty}
                onChange={(e) => handleMetadataChange('difficulty', e.target.value)}
                disabled={disabled}
              >
                <option value="קל">קל</option>
                <option value="בינוני">בינוני</option>
                <option value="קשה">קשה</option>
                <option value="מתקדם">מתקדם</option>
              </Select>
            </FormField>

            {(mediaType === 'audio' || mediaType === 'video') && (
              <FormField>
                <Label>משך זמן משוער (דקות)</Label>
                <Input
                  type="number"
                  value={metadata.duration}
                  onChange={(e) => handleMetadataChange('duration', e.target.value)}
                  placeholder="משך בדקות..."
                  min="0"
                  disabled={disabled}
                />
              </FormField>
            )}

            <FormField>
              <Label>מחבר/מורה</Label>
              <Input
                type="text"
                value={metadata.author}
                onChange={(e) => handleMetadataChange('author', e.target.value)}
                placeholder="שם המחבר או המורה..."
                disabled={disabled}
              />
            </FormField>
          </FormGrid>

          <FormFieldFull>
            <Label>מילות מפתח</Label>
            <Input
              type="text"
              value={metadata.keywords}
              onChange={(e) => handleMetadataChange('keywords', e.target.value)}
              placeholder="מילות מפתח מופרדות בפסיקים..."
              disabled={disabled}
            />
          </FormFieldFull>
        </CollapsibleSection>
      )}
    </MetadataContainer>
  );
};

export default MetadataForm;
