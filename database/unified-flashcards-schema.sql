-- Unified Flashcards Database Schema
-- This schema merges manual flashcards with lesson-generated flashcards (similar to unified tests)

-- Create unified memory card sets table (enhanced version)
CREATE TABLE IF NOT EXISTS memory_card_sets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Set type and source information
    set_type VARCHAR(50) NOT NULL DEFAULT 'manual' CHECK (set_type IN ('manual', 'lesson_generated', 'ai_generated')),
    source_type VARCHAR(50) DEFAULT 'manual' CHECK (source_type IN ('manual', 'recording', 'lesson', 'ai_processing')),
    source_id INTEGER, -- References recording_id for lesson sets, NULL for manual
    
    -- Educational metadata
    subject_area VARCHAR(100),
    grade_level VARCHAR(20),
    curriculum VARCHAR(100),
    
    -- Set configuration
    total_cards INTEGER DEFAULT 0,
    difficulty_level VARCHAR(20) DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard', 'mixed')),
    learning_objectives JSONB DEFAULT '[]', -- Array of learning objectives
    
    -- Status and visibility
    is_public BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_shared BOOLEAN DEFAULT FALSE,
    shared_with JSONB DEFAULT '[]', -- Array of user/class IDs
    
    -- AI-specific metadata (for lesson sets)
    ai_provider VARCHAR(50), -- 'openai', 'anthropic', etc.
    model_version VARCHAR(100),
    confidence_score DECIMAL(3,2) DEFAULT 0.0,
    processing_metadata JSONB DEFAULT '{}',
    
    -- Content organization
    tags JSONB DEFAULT '[]', -- Array of tags
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_memory_card_sets_user_id ON memory_card_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_card_sets_set_type ON memory_card_sets(set_type);
CREATE INDEX IF NOT EXISTS idx_memory_card_sets_source_type ON memory_card_sets(source_type);
CREATE INDEX IF NOT EXISTS idx_memory_card_sets_source_id ON memory_card_sets(source_id);
CREATE INDEX IF NOT EXISTS idx_memory_card_sets_subject_area ON memory_card_sets(subject_area);
CREATE INDEX IF NOT EXISTS idx_memory_card_sets_grade_level ON memory_card_sets(grade_level);
CREATE INDEX IF NOT EXISTS idx_memory_card_sets_is_public ON memory_card_sets(is_public);
CREATE INDEX IF NOT EXISTS idx_memory_card_sets_is_active ON memory_card_sets(is_active);
CREATE INDEX IF NOT EXISTS idx_memory_card_sets_created_at ON memory_card_sets(created_at);
CREATE INDEX IF NOT EXISTS idx_memory_card_sets_tags ON memory_card_sets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_memory_card_sets_learning_objectives ON memory_card_sets USING GIN(learning_objectives);

-- Apply update trigger
CREATE TRIGGER update_memory_card_sets_updated_at BEFORE UPDATE ON memory_card_sets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enhanced memory cards table (already exists but add lesson-specific fields)
-- Note: This assumes the existing memory_cards table structure
-- We'll add columns via ALTER statements if they don't exist

-- Add lesson-specific columns to existing memory_cards table
DO $$ 
BEGIN
    -- Add AI generation info if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'memory_cards' AND column_name = 'ai_generated') THEN
        ALTER TABLE memory_cards ADD COLUMN ai_generated BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'memory_cards' AND column_name = 'ai_provider') THEN
        ALTER TABLE memory_cards ADD COLUMN ai_provider VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'memory_cards' AND column_name = 'confidence_score') THEN
        ALTER TABLE memory_cards ADD COLUMN confidence_score DECIMAL(3,2) DEFAULT 0.0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'memory_cards' AND column_name = 'generation_metadata') THEN
        ALTER TABLE memory_cards ADD COLUMN generation_metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_memory_cards_ai_generated ON memory_cards(ai_generated);
CREATE INDEX IF NOT EXISTS idx_memory_cards_ai_provider ON memory_cards(ai_provider);

-- Create views for backward compatibility and easy querying

-- View for lesson-generated flashcard sets
CREATE OR REPLACE VIEW lesson_flashcard_sets AS
SELECT 
    id,
    user_id,
    source_id as recording_id,
    name as set_name,
    description,
    set_type,
    subject_area,
    grade_level,
    total_cards,
    difficulty_level,
    learning_objectives,
    confidence_score,
    ai_provider,
    model_version,
    processing_metadata as metadata,
    tags,
    is_public,
    is_active,
    created_at,
    updated_at
FROM memory_card_sets 
WHERE set_type IN ('lesson_generated', 'ai_generated') 
AND source_type IN ('recording', 'lesson', 'ai_processing');

-- View for manual flashcard sets
CREATE OR REPLACE VIEW manual_flashcard_sets AS
SELECT 
    id,
    user_id,
    name,
    description,
    subject_area,
    grade_level,
    total_cards,
    difficulty_level,
    tags,
    is_public,
    is_active,
    created_at,
    updated_at
FROM memory_card_sets 
WHERE set_type = 'manual' 
AND source_type = 'manual';

-- Flashcard statistics view (enhanced to include lesson sets)
CREATE OR REPLACE VIEW flashcard_statistics AS
SELECT 
    user_id,
    COUNT(*) as total_sets,
    COUNT(*) FILTER (WHERE set_type = 'manual') as manual_sets,
    COUNT(*) FILTER (WHERE set_type IN ('lesson_generated', 'ai_generated')) as lesson_sets,
    COUNT(*) FILTER (WHERE is_active = true) as active_sets,
    COUNT(*) FILTER (WHERE is_public = true) as public_sets,
    COUNT(*) FILTER (WHERE is_shared = true) as shared_sets,
    SUM(total_cards) as total_cards,
    COUNT(DISTINCT subject_area) FILTER (WHERE subject_area IS NOT NULL) as subjects_covered,
    COUNT(DISTINCT grade_level) FILTER (WHERE grade_level IS NOT NULL) as grade_levels_covered
FROM memory_card_sets 
WHERE is_active = true
GROUP BY user_id;

-- Combined overview statistics (tests + flashcards)
CREATE OR REPLACE VIEW overview_statistics AS
SELECT 
    COALESCE(t.user_id, f.user_id) as user_id,
    COALESCE(t.total_tests, 0) as total_tests,
    COALESCE(t.manual_tests, 0) as manual_tests,
    COALESCE(t.lesson_tests, 0) as lesson_tests,
    COALESCE(t.active_tests, 0) as active_tests,
    COALESCE(t.total_questions, 0) as total_questions,
    COALESCE(f.total_sets, 0) as total_flashcard_sets,
    COALESCE(f.manual_sets, 0) as manual_flashcard_sets,
    COALESCE(f.lesson_sets, 0) as lesson_flashcard_sets,
    COALESCE(f.active_sets, 0) as active_flashcard_sets,
    COALESCE(f.total_cards, 0) as total_flashcards,
    GREATEST(COALESCE(t.subjects_covered, 0), COALESCE(f.subjects_covered, 0)) as subjects_covered,
    GREATEST(COALESCE(t.grade_levels_covered, 0), COALESCE(f.grade_levels_covered, 0)) as grade_levels_covered
FROM test_statistics t
FULL OUTER JOIN flashcard_statistics f ON t.user_id = f.user_id;

-- Function to get flashcard set with source information
CREATE OR REPLACE FUNCTION get_flashcard_set_with_source(set_id INTEGER)
RETURNS TABLE (
    id INTEGER,
    name VARCHAR(255),
    description TEXT,
    set_type VARCHAR(50),
    source_type VARCHAR(50),
    source_title VARCHAR(255),
    source_metadata JSONB,
    subject_area VARCHAR(100),
    grade_level VARCHAR(20),
    total_cards INTEGER,
    tags JSONB,
    is_public BOOLEAN,
    is_active BOOLEAN,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.description,
        s.set_type,
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
        s.total_cards,
        s.tags,
        s.is_public,
        s.is_active,
        s.created_at
    FROM memory_card_sets s
    LEFT JOIN recordings r ON s.source_type = 'recording' AND s.source_id = r.id
    WHERE s.id = set_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create lesson flashcard set from AI content
CREATE OR REPLACE FUNCTION create_lesson_flashcard_set(
    p_user_id INTEGER,
    p_recording_id INTEGER,
    p_name VARCHAR(255),
    p_description TEXT DEFAULT NULL,
    p_subject_area VARCHAR(100) DEFAULT NULL,
    p_grade_level VARCHAR(20) DEFAULT NULL,
    p_total_cards INTEGER DEFAULT 0,
    p_difficulty_level VARCHAR(20) DEFAULT 'medium',
    p_learning_objectives JSONB DEFAULT '[]',
    p_ai_provider VARCHAR(50) DEFAULT 'openai',
    p_model_version VARCHAR(100) DEFAULT NULL,
    p_confidence_score DECIMAL(3,2) DEFAULT 0.0,
    p_processing_metadata JSONB DEFAULT '{}'
)
RETURNS INTEGER AS $$
DECLARE
    new_set_id INTEGER;
    recording_metadata JSONB;
BEGIN
    -- Get recording metadata to populate fields if not provided
    SELECT metadata INTO recording_metadata 
    FROM recordings 
    WHERE id = p_recording_id AND user_id = p_user_id;
    
    -- Insert new lesson flashcard set
    INSERT INTO memory_card_sets (
        user_id,
        name,
        description,
        set_type,
        source_type,
        source_id,
        subject_area,
        grade_level,
        total_cards,
        difficulty_level,
        learning_objectives,
        ai_provider,
        model_version,
        confidence_score,
        processing_metadata,
        tags,
        is_active
    ) VALUES (
        p_user_id,
        p_name,
        p_description,
        'lesson_generated',
        'recording',
        p_recording_id,
        COALESCE(p_subject_area, recording_metadata->>'subject', recording_metadata->>'subjectArea'),
        COALESCE(p_grade_level, recording_metadata->>'classLevel', recording_metadata->>'gradeLevel'),
        p_total_cards,
        p_difficulty_level,
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
        ),
        true
    ) RETURNING id INTO new_set_id;
    
    RETURN new_set_id;
END;
$$ LANGUAGE plpgsql;

-- Function to migrate existing card generation jobs to unified sets
CREATE OR REPLACE FUNCTION migrate_card_generation_to_unified_sets()
RETURNS INTEGER AS $$
DECLARE
    migrated_count INTEGER := 0;
    job_record RECORD;
    new_set_id INTEGER;
    card_record RECORD;
BEGIN
    -- Find completed card generation jobs that don't have corresponding sets
    FOR job_record IN 
        SELECT 
            cgj.*,
            r.user_id,
            r.metadata as recording_metadata,
            COUNT(mc.id) as cards_count
        FROM card_generation_jobs cgj
        LEFT JOIN recordings r ON cgj.recording_id = r.id
        LEFT JOIN memory_cards mc ON mc.generation_metadata->>'jobId' = cgj.id::text
        WHERE cgj.status = 'completed'
        AND cgj.recording_id IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM memory_card_sets mcs 
            WHERE mcs.source_type = 'recording' 
            AND mcs.source_id = cgj.recording_id 
            AND mcs.set_type = 'lesson_generated'
        )
        GROUP BY cgj.id, r.user_id, r.metadata
        HAVING COUNT(mc.id) > 0
    LOOP
        -- Create unified flashcard set for this job
        SELECT create_lesson_flashcard_set(
            job_record.user_id,
            job_record.recording_id,
            COALESCE(
                job_record.recording_metadata->>'lessonName',
                'כרטיסי זיכרון מתוכן שיעור ' || job_record.recording_id
            ),
            'סט כרטיסי זיכרון שנוצר אוטומטית מתוכן השיעור',
            COALESCE(
                (job_record.generation_config::jsonb)->>'subjectArea',
                job_record.recording_metadata->>'subject'
            ),
            COALESCE(
                (job_record.generation_config::jsonb)->>'gradeLevel',
                job_record.recording_metadata->>'classLevel'
            ),
            job_record.cards_count,
            COALESCE((job_record.generation_config::jsonb)->>'difficultyLevel', 'medium'),
            COALESCE((job_record.generation_config::jsonb)->>'learning_objectives', '[]'::jsonb),
            COALESCE((job_record.generation_config::jsonb)->>'provider', 'openai'),
            (job_record.generation_config::jsonb)->>'model',
            0.8, -- Default confidence score
            job_record.generation_config::jsonb
        ) INTO new_set_id;
        
        -- Update existing cards to belong to this set
        UPDATE memory_cards 
        SET set_id = new_set_id,
            ai_generated = true,
            ai_provider = COALESCE((job_record.generation_config::jsonb)->>'provider', 'openai'),
            confidence_score = 0.8,
            generation_metadata = jsonb_build_object(
                'jobId', job_record.id,
                'sourceType', 'lesson',
                'generationConfig', job_record.generation_config::jsonb
            )
        WHERE generation_metadata->>'jobId' = job_record.id::text;
        
        migrated_count := migrated_count + 1;
    END LOOP;
    
    RETURN migrated_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE memory_card_sets IS 'Unified table for all types of flashcard sets - manual, lesson-generated, and AI-generated';
COMMENT ON COLUMN memory_card_sets.set_type IS 'Type of set: manual (user-created), lesson_generated (from lesson recordings), ai_generated (from AI processing)';
COMMENT ON COLUMN memory_card_sets.source_type IS 'Source of the set: manual, recording, lesson, ai_processing';
COMMENT ON COLUMN memory_card_sets.source_id IS 'ID of the source (recording_id for lesson sets, NULL for manual)';
COMMENT ON COLUMN memory_card_sets.tags IS 'JSON array of tags for categorization and search';
COMMENT ON COLUMN memory_card_sets.learning_objectives IS 'JSON array of learning objectives';
COMMENT ON COLUMN memory_card_sets.is_public IS 'Whether the set is visible to other teachers';
COMMENT ON COLUMN memory_card_sets.is_shared IS 'Whether the set has been shared with specific users/classes';
COMMENT ON COLUMN memory_card_sets.shared_with IS 'JSON array of user/class IDs the set is shared with';
COMMENT ON VIEW overview_statistics IS 'Combined statistics view showing both tests and flashcards for dashboard overview';
