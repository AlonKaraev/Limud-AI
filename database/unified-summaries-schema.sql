-- Unified Summaries Database Schema
-- This schema merges manual summaries with AI-generated lesson summaries

-- Create unified summaries table
CREATE TABLE IF NOT EXISTS summaries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    summary_type VARCHAR(50) NOT NULL DEFAULT 'manual' CHECK (summary_type IN ('manual', 'lesson_generated', 'ai_generated')),
    
    -- Source information
    source_type VARCHAR(50) DEFAULT 'manual' CHECK (source_type IN ('manual', 'recording', 'lesson', 'ai_processing')),
    source_id INTEGER, -- References recording_id for lesson summaries, NULL for manual
    
    -- Educational metadata
    subject_area VARCHAR(100),
    grade_level VARCHAR(20),
    curriculum VARCHAR(100),
    
    -- Content organization
    tags JSONB DEFAULT '[]', -- Array of tags
    key_topics JSONB DEFAULT '[]', -- Array of main topics (from AI or manual)
    learning_objectives JSONB DEFAULT '[]', -- Array of learning objectives
    
    -- Sharing and visibility
    is_public BOOLEAN DEFAULT FALSE,
    is_shared BOOLEAN DEFAULT FALSE,
    shared_with JSONB DEFAULT '[]', -- Array of user/class IDs
    
    -- AI-specific metadata (for lesson summaries)
    ai_provider VARCHAR(50), -- 'openai', 'anthropic', etc.
    model_version VARCHAR(100),
    confidence_score DECIMAL(3,2) DEFAULT 0.0,
    processing_metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_summaries_user_id ON summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_summaries_summary_type ON summaries(summary_type);
CREATE INDEX IF NOT EXISTS idx_summaries_source_type ON summaries(source_type);
CREATE INDEX IF NOT EXISTS idx_summaries_source_id ON summaries(source_id);
CREATE INDEX IF NOT EXISTS idx_summaries_subject_area ON summaries(subject_area);
CREATE INDEX IF NOT EXISTS idx_summaries_grade_level ON summaries(grade_level);
CREATE INDEX IF NOT EXISTS idx_summaries_is_public ON summaries(is_public);
CREATE INDEX IF NOT EXISTS idx_summaries_created_at ON summaries(created_at);
CREATE INDEX IF NOT EXISTS idx_summaries_tags ON summaries USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_summaries_key_topics ON summaries USING GIN(key_topics);

-- Apply update trigger
CREATE TRIGGER update_summaries_updated_at BEFORE UPDATE ON summaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Migration script to move existing data
-- This will be run separately to migrate existing content_summaries to the new unified table

-- Create a view for backward compatibility with existing lesson summary queries
CREATE OR REPLACE VIEW lesson_summaries AS
SELECT 
    id,
    user_id,
    source_id as recording_id,
    NULL as transcription_id, -- Not available in unified table
    title as summary_text, -- Map title to summary_text for compatibility
    content as summary_text,
    summary_type,
    key_topics,
    learning_objectives,
    subject_area,
    grade_level,
    confidence_score,
    ai_provider,
    model_version,
    processing_metadata as metadata,
    created_at,
    updated_at
FROM summaries 
WHERE summary_type IN ('lesson_generated', 'ai_generated') 
AND source_type IN ('recording', 'lesson', 'ai_processing');

-- Create a view for manual summaries (for backward compatibility)
CREATE OR REPLACE VIEW manual_summaries AS
SELECT 
    id,
    user_id,
    title,
    content,
    subject_area,
    grade_level,
    tags,
    is_public,
    created_at,
    updated_at
FROM summaries 
WHERE summary_type = 'manual' 
AND source_type = 'manual';

-- Summary statistics view
CREATE OR REPLACE VIEW summary_statistics AS
SELECT 
    user_id,
    COUNT(*) as total_summaries,
    COUNT(*) FILTER (WHERE summary_type = 'manual') as manual_summaries,
    COUNT(*) FILTER (WHERE summary_type IN ('lesson_generated', 'ai_generated')) as lesson_summaries,
    COUNT(*) FILTER (WHERE is_public = true) as public_summaries,
    COUNT(*) FILTER (WHERE is_shared = true) as shared_summaries,
    COUNT(DISTINCT subject_area) FILTER (WHERE subject_area IS NOT NULL) as subjects_covered,
    COUNT(DISTINCT grade_level) FILTER (WHERE grade_level IS NOT NULL) as grade_levels_covered
FROM summaries 
GROUP BY user_id;

-- Function to get summary with source information
CREATE OR REPLACE FUNCTION get_summary_with_source(summary_id INTEGER)
RETURNS TABLE (
    id INTEGER,
    title VARCHAR(255),
    content TEXT,
    summary_type VARCHAR(50),
    source_type VARCHAR(50),
    source_title VARCHAR(255),
    source_metadata JSONB,
    subject_area VARCHAR(100),
    grade_level VARCHAR(20),
    tags JSONB,
    is_public BOOLEAN,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.title,
        s.content,
        s.summary_type,
        s.source_type,
        CASE 
            WHEN s.source_type = 'recording' AND s.source_id IS NOT NULL THEN 
                COALESCE((r.metadata->>'lessonName')::VARCHAR(255), r.filename)
            ELSE NULL
        END as source_title,
        CASE 
            WHEN s.source_type = 'recording' AND s.source_id IS NOT NULL THEN r.metadata
            ELSE NULL
        END as source_metadata,
        s.subject_area,
        s.grade_level,
        s.tags,
        s.is_public,
        s.created_at
    FROM summaries s
    LEFT JOIN recordings r ON s.source_type = 'recording' AND s.source_id = r.id
    WHERE s.id = summary_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create lesson summary from AI content
CREATE OR REPLACE FUNCTION create_lesson_summary(
    p_user_id INTEGER,
    p_recording_id INTEGER,
    p_title VARCHAR(255),
    p_content TEXT,
    p_subject_area VARCHAR(100) DEFAULT NULL,
    p_grade_level VARCHAR(20) DEFAULT NULL,
    p_key_topics JSONB DEFAULT '[]',
    p_learning_objectives JSONB DEFAULT '[]',
    p_ai_provider VARCHAR(50) DEFAULT 'openai',
    p_model_version VARCHAR(100) DEFAULT NULL,
    p_confidence_score DECIMAL(3,2) DEFAULT 0.0,
    p_processing_metadata JSONB DEFAULT '{}'
)
RETURNS INTEGER AS $$
DECLARE
    new_summary_id INTEGER;
    recording_metadata JSONB;
BEGIN
    -- Get recording metadata to populate fields if not provided
    SELECT metadata INTO recording_metadata 
    FROM recordings 
    WHERE id = p_recording_id AND user_id = p_user_id;
    
    -- Insert new lesson summary
    INSERT INTO summaries (
        user_id,
        title,
        content,
        summary_type,
        source_type,
        source_id,
        subject_area,
        grade_level,
        key_topics,
        learning_objectives,
        ai_provider,
        model_version,
        confidence_score,
        processing_metadata,
        tags
    ) VALUES (
        p_user_id,
        p_title,
        p_content,
        'lesson_generated',
        'recording',
        p_recording_id,
        COALESCE(p_subject_area, recording_metadata->>'subject', recording_metadata->>'subjectArea'),
        COALESCE(p_grade_level, recording_metadata->>'classLevel', recording_metadata->>'gradeLevel'),
        p_key_topics,
        p_learning_objectives,
        p_ai_provider,
        p_model_version,
        p_confidence_score,
        p_processing_metadata,
        COALESCE(
            CASE 
                WHEN recording_metadata->>'subject' IS NOT NULL THEN 
                    jsonb_build_array('lesson', recording_metadata->>'subject')
                ELSE jsonb_build_array('lesson')
            END,
            '["lesson"]'::jsonb
        )
    ) RETURNING id INTO new_summary_id;
    
    RETURN new_summary_id;
END;
$$ LANGUAGE plpgsql;

-- Function to migrate existing content_summaries to unified table
CREATE OR REPLACE FUNCTION migrate_content_summaries()
RETURNS INTEGER AS $$
DECLARE
    migrated_count INTEGER := 0;
    summary_record RECORD;
BEGIN
    -- Migrate existing content_summaries to unified summaries table
    FOR summary_record IN 
        SELECT 
            cs.*,
            r.user_id,
            COALESCE(r.metadata->>'lessonName', CONCAT('סיכום שיעור ', cs.recording_id)) as title
        FROM content_summaries cs
        JOIN recordings r ON cs.recording_id = r.id
        WHERE NOT EXISTS (
            SELECT 1 FROM summaries s 
            WHERE s.source_type = 'recording' 
            AND s.source_id = cs.recording_id 
            AND s.summary_type = 'lesson_generated'
        )
    LOOP
        INSERT INTO summaries (
            user_id,
            title,
            content,
            summary_type,
            source_type,
            source_id,
            subject_area,
            grade_level,
            key_topics,
            learning_objectives,
            ai_provider,
            model_version,
            confidence_score,
            processing_metadata,
            tags,
            created_at,
            updated_at
        ) VALUES (
            summary_record.user_id,
            summary_record.title,
            summary_record.summary_text,
            'lesson_generated',
            'recording',
            summary_record.recording_id,
            summary_record.subject_area,
            summary_record.grade_level,
            COALESCE(summary_record.key_topics, '[]'::jsonb),
            COALESCE(summary_record.learning_objectives, '[]'::jsonb),
            COALESCE(summary_record.ai_provider, 'openai'),
            summary_record.model_version,
            COALESCE(summary_record.confidence_score, 0.0),
            COALESCE(summary_record.metadata, '{}'::jsonb),
            jsonb_build_array('lesson', COALESCE(summary_record.subject_area, 'general')),
            summary_record.created_at,
            summary_record.updated_at
        );
        
        migrated_count := migrated_count + 1;
    END LOOP;
    
    RETURN migrated_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE summaries IS 'Unified table for all types of summaries - manual, lesson-generated, and AI-generated';
COMMENT ON COLUMN summaries.summary_type IS 'Type of summary: manual (user-created), lesson_generated (from lesson recordings), ai_generated (from AI processing)';
COMMENT ON COLUMN summaries.source_type IS 'Source of the summary: manual, recording, lesson, ai_processing';
COMMENT ON COLUMN summaries.source_id IS 'ID of the source (recording_id for lesson summaries, NULL for manual)';
COMMENT ON COLUMN summaries.tags IS 'JSON array of tags for categorization and search';
COMMENT ON COLUMN summaries.key_topics IS 'JSON array of main topics covered in the summary';
COMMENT ON COLUMN summaries.learning_objectives IS 'JSON array of learning objectives';
COMMENT ON COLUMN summaries.is_public IS 'Whether the summary is visible to other teachers';
COMMENT ON COLUMN summaries.is_shared IS 'Whether the summary has been shared with specific users/classes';
COMMENT ON COLUMN summaries.shared_with IS 'JSON array of user/class IDs the summary is shared with';
