-- Unified Tests Database Schema
-- This schema merges manual tests with AI-generated lesson tests (similar to summaries)

-- Create unified tests table
CREATE TABLE IF NOT EXISTS tests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    test_type VARCHAR(50) NOT NULL DEFAULT 'manual' CHECK (test_type IN ('manual', 'lesson_generated', 'ai_generated')),
    
    -- Source information
    source_type VARCHAR(50) DEFAULT 'manual' CHECK (source_type IN ('manual', 'recording', 'lesson', 'ai_processing')),
    source_id INTEGER, -- References recording_id for lesson tests, NULL for manual
    
    -- Educational metadata
    subject_area VARCHAR(100),
    grade_level VARCHAR(20),
    curriculum VARCHAR(100),
    
    -- Test configuration
    time_limit INTEGER DEFAULT 0, -- in minutes, 0 = no limit
    question_count INTEGER DEFAULT 0,
    passing_score INTEGER DEFAULT 60, -- percentage
    allow_retakes BOOLEAN DEFAULT TRUE,
    shuffle_questions BOOLEAN DEFAULT FALSE,
    shuffle_answers BOOLEAN DEFAULT FALSE,
    show_results_immediately BOOLEAN DEFAULT TRUE,
    
    -- Content organization
    tags JSONB DEFAULT '[]', -- Array of tags
    difficulty_level VARCHAR(20) DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard', 'mixed')),
    learning_objectives JSONB DEFAULT '[]', -- Array of learning objectives
    
    -- Status and visibility
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
    is_public BOOLEAN DEFAULT FALSE,
    is_shared BOOLEAN DEFAULT FALSE,
    shared_with JSONB DEFAULT '[]', -- Array of user/class IDs
    
    -- AI-specific metadata (for lesson tests)
    ai_provider VARCHAR(50), -- 'openai', 'anthropic', etc.
    model_version VARCHAR(100),
    confidence_score DECIMAL(3,2) DEFAULT 0.0,
    processing_metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tests_user_id ON tests(user_id);
CREATE INDEX IF NOT EXISTS idx_tests_test_type ON tests(test_type);
CREATE INDEX IF NOT EXISTS idx_tests_source_type ON tests(source_type);
CREATE INDEX IF NOT EXISTS idx_tests_source_id ON tests(source_id);
CREATE INDEX IF NOT EXISTS idx_tests_subject_area ON tests(subject_area);
CREATE INDEX IF NOT EXISTS idx_tests_grade_level ON tests(grade_level);
CREATE INDEX IF NOT EXISTS idx_tests_status ON tests(status);
CREATE INDEX IF NOT EXISTS idx_tests_is_public ON tests(is_public);
CREATE INDEX IF NOT EXISTS idx_tests_created_at ON tests(created_at);
CREATE INDEX IF NOT EXISTS idx_tests_tags ON tests USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_tests_learning_objectives ON tests USING GIN(learning_objectives);

-- Apply update trigger
CREATE TRIGGER update_tests_updated_at BEFORE UPDATE ON tests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create unified test questions table (replaces generated_questions for tests)
CREATE TABLE IF NOT EXISTS test_questions (
    id SERIAL PRIMARY KEY,
    test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank')),
    difficulty_level VARCHAR(20) DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    points INTEGER DEFAULT 1,
    order_index INTEGER DEFAULT 0,
    
    -- Multiple choice specific
    correct_answer TEXT, -- For non-multiple choice questions
    explanation TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    tags JSONB DEFAULT '[]',
    
    -- AI generation info
    ai_generated BOOLEAN DEFAULT FALSE,
    ai_provider VARCHAR(50),
    confidence_score DECIMAL(3,2) DEFAULT 0.0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for test questions
CREATE INDEX IF NOT EXISTS idx_test_questions_test_id ON test_questions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_question_type ON test_questions(question_type);
CREATE INDEX IF NOT EXISTS idx_test_questions_difficulty ON test_questions(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_test_questions_order ON test_questions(order_index);
CREATE INDEX IF NOT EXISTS idx_test_questions_ai_generated ON test_questions(ai_generated);

-- Apply update trigger to test questions
CREATE TRIGGER update_test_questions_updated_at BEFORE UPDATE ON test_questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create test question options table
CREATE TABLE IF NOT EXISTS test_question_options (
    id SERIAL PRIMARY KEY,
    question_id INTEGER NOT NULL REFERENCES test_questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    explanation TEXT,
    option_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for question options
CREATE INDEX IF NOT EXISTS idx_test_question_options_question_id ON test_question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_test_question_options_is_correct ON test_question_options(is_correct);
CREATE INDEX IF NOT EXISTS idx_test_question_options_order ON test_question_options(option_order);

-- Create views for backward compatibility with existing question sets queries
CREATE OR REPLACE VIEW lesson_tests AS
SELECT 
    id,
    user_id,
    source_id as recording_id,
    title as set_name,
    description,
    test_type,
    subject_area,
    grade_level,
    question_count as total_questions,
    time_limit as estimated_duration,
    difficulty_level,
    learning_objectives,
    confidence_score,
    ai_provider,
    model_version,
    processing_metadata as metadata,
    created_at,
    updated_at
FROM tests 
WHERE test_type IN ('lesson_generated', 'ai_generated') 
AND source_type IN ('recording', 'lesson', 'ai_processing');

-- Create a view for manual tests
CREATE OR REPLACE VIEW manual_tests AS
SELECT 
    id,
    user_id,
    title,
    description,
    subject_area,
    grade_level,
    question_count,
    time_limit,
    passing_score,
    tags,
    status,
    is_public,
    created_at,
    updated_at
FROM tests 
WHERE test_type = 'manual' 
AND source_type = 'manual';

-- Test statistics view
CREATE OR REPLACE VIEW test_statistics AS
SELECT 
    user_id,
    COUNT(*) as total_tests,
    COUNT(*) FILTER (WHERE test_type = 'manual') as manual_tests,
    COUNT(*) FILTER (WHERE test_type IN ('lesson_generated', 'ai_generated')) as lesson_tests,
    COUNT(*) FILTER (WHERE status = 'active') as active_tests,
    COUNT(*) FILTER (WHERE is_public = true) as public_tests,
    COUNT(*) FILTER (WHERE is_shared = true) as shared_tests,
    SUM(question_count) as total_questions,
    COUNT(DISTINCT subject_area) FILTER (WHERE subject_area IS NOT NULL) as subjects_covered,
    COUNT(DISTINCT grade_level) FILTER (WHERE grade_level IS NOT NULL) as grade_levels_covered
FROM tests 
GROUP BY user_id;

-- Function to get test with source information
CREATE OR REPLACE FUNCTION get_test_with_source(test_id INTEGER)
RETURNS TABLE (
    id INTEGER,
    title VARCHAR(255),
    description TEXT,
    test_type VARCHAR(50),
    source_type VARCHAR(50),
    source_title VARCHAR(255),
    source_metadata JSONB,
    subject_area VARCHAR(100),
    grade_level VARCHAR(20),
    question_count INTEGER,
    tags JSONB,
    status VARCHAR(20),
    is_public BOOLEAN,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.title,
        t.description,
        t.test_type,
        t.source_type,
        CASE 
            WHEN t.source_type = 'recording' AND t.source_id IS NOT NULL THEN 
                COALESCE((r.metadata->>'lessonName')::VARCHAR(255), r.filename)
            ELSE NULL
        END as source_title,
        CASE 
            WHEN t.source_type = 'recording' AND t.source_id IS NOT NULL THEN r.metadata
            ELSE NULL
        END as source_metadata,
        t.subject_area,
        t.grade_level,
        t.question_count,
        t.tags,
        t.status,
        t.is_public,
        t.created_at
    FROM tests t
    LEFT JOIN recordings r ON t.source_type = 'recording' AND t.source_id = r.id
    WHERE t.id = test_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create lesson test from AI content
CREATE OR REPLACE FUNCTION create_lesson_test(
    p_user_id INTEGER,
    p_recording_id INTEGER,
    p_title VARCHAR(255),
    p_description TEXT DEFAULT NULL,
    p_subject_area VARCHAR(100) DEFAULT NULL,
    p_grade_level VARCHAR(20) DEFAULT NULL,
    p_question_count INTEGER DEFAULT 0,
    p_time_limit INTEGER DEFAULT 0,
    p_difficulty_level VARCHAR(20) DEFAULT 'medium',
    p_learning_objectives JSONB DEFAULT '[]',
    p_ai_provider VARCHAR(50) DEFAULT 'openai',
    p_model_version VARCHAR(100) DEFAULT NULL,
    p_confidence_score DECIMAL(3,2) DEFAULT 0.0,
    p_processing_metadata JSONB DEFAULT '{}'
)
RETURNS INTEGER AS $$
DECLARE
    new_test_id INTEGER;
    recording_metadata JSONB;
BEGIN
    -- Get recording metadata to populate fields if not provided
    SELECT metadata INTO recording_metadata 
    FROM recordings 
    WHERE id = p_recording_id AND user_id = p_user_id;
    
    -- Insert new lesson test
    INSERT INTO tests (
        user_id,
        title,
        description,
        test_type,
        source_type,
        source_id,
        subject_area,
        grade_level,
        question_count,
        time_limit,
        difficulty_level,
        learning_objectives,
        ai_provider,
        model_version,
        confidence_score,
        processing_metadata,
        tags,
        status
    ) VALUES (
        p_user_id,
        p_title,
        p_description,
        'lesson_generated',
        'recording',
        p_recording_id,
        COALESCE(p_subject_area, recording_metadata->>'subject', recording_metadata->>'subjectArea'),
        COALESCE(p_grade_level, recording_metadata->>'classLevel', recording_metadata->>'gradeLevel'),
        p_question_count,
        p_time_limit,
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
        'draft'
    ) RETURNING id INTO new_test_id;
    
    RETURN new_test_id;
END;
$$ LANGUAGE plpgsql;

-- Function to migrate existing question sets to unified tests table
CREATE OR REPLACE FUNCTION migrate_question_sets_to_tests()
RETURNS INTEGER AS $$
DECLARE
    migrated_count INTEGER := 0;
    question_set_record RECORD;
    new_test_id INTEGER;
    question_record RECORD;
    new_question_id INTEGER;
    option_record RECORD;
BEGIN
    -- Migrate existing question_sets to unified tests table
    FOR question_set_record IN 
        SELECT 
            qs.*,
            r.user_id,
            COALESCE(qs.set_name, CONCAT('מבחן מתוכן שיעור ', qs.recording_id)) as title,
            COUNT(qsi.question_id) as actual_question_count
        FROM question_sets qs
        LEFT JOIN recordings r ON qs.recording_id = r.id
        LEFT JOIN question_set_items qsi ON qs.id = qsi.question_set_id
        WHERE NOT EXISTS (
            SELECT 1 FROM tests t 
            WHERE t.source_type = 'recording' 
            AND t.source_id = qs.recording_id 
            AND t.test_type = 'lesson_generated'
        )
        GROUP BY qs.id, r.user_id
    LOOP
        -- Insert test
        INSERT INTO tests (
            user_id,
            title,
            description,
            test_type,
            source_type,
            source_id,
            subject_area,
            grade_level,
            question_count,
            time_limit,
            difficulty_level,
            learning_objectives,
            ai_provider,
            model_version,
            confidence_score,
            processing_metadata,
            tags,
            status,
            created_at,
            updated_at
        ) VALUES (
            question_set_record.user_id,
            question_set_record.title,
            question_set_record.description,
            'lesson_generated',
            'recording',
            question_set_record.recording_id,
            question_set_record.subject_area,
            question_set_record.grade_level,
            COALESCE(question_set_record.actual_question_count, question_set_record.total_questions, 0),
            COALESCE(question_set_record.estimated_duration, 0),
            COALESCE(question_set_record.difficulty_level, 'medium'),
            COALESCE(question_set_record.learning_objectives, '[]'::jsonb),
            COALESCE(question_set_record.ai_provider, 'openai'),
            question_set_record.model_version,
            COALESCE(question_set_record.confidence_score, 0.0),
            COALESCE(question_set_record.metadata, '{}'::jsonb),
            jsonb_build_array('lesson', COALESCE(question_set_record.subject_area, 'general')),
            'draft',
            question_set_record.created_at,
            question_set_record.updated_at
        ) RETURNING id INTO new_test_id;
        
        -- Migrate questions for this test
        FOR question_record IN
            SELECT gq.*, qsi.order_index
            FROM generated_questions gq
            INNER JOIN question_set_items qsi ON gq.id = qsi.question_id
            WHERE qsi.question_set_id = question_set_record.id
            ORDER BY qsi.order_index ASC
        LOOP
            -- Insert question
            INSERT INTO test_questions (
                test_id,
                question_text,
                question_type,
                difficulty_level,
                points,
                order_index,
                correct_answer,
                explanation,
                metadata,
                tags,
                ai_generated,
                ai_provider,
                confidence_score,
                created_at,
                updated_at
            ) VALUES (
                new_test_id,
                question_record.question_text,
                COALESCE(question_record.question_type, 'multiple_choice'),
                COALESCE(question_record.difficulty_level, 'medium'),
                COALESCE(question_record.points, 1),
                COALESCE(question_record.order_index, 0),
                question_record.correct_answer,
                question_record.explanation,
                COALESCE(question_record.metadata, '{}'::jsonb),
                COALESCE(question_record.tags, '[]'::jsonb),
                TRUE,
                COALESCE(question_record.ai_provider, 'openai'),
                COALESCE(question_record.confidence_score, 0.0),
                question_record.created_at,
                question_record.updated_at
            ) RETURNING id INTO new_question_id;
            
            -- Migrate question options
            FOR option_record IN
                SELECT * FROM question_options 
                WHERE question_id = question_record.id
                ORDER BY option_order ASC
            LOOP
                INSERT INTO test_question_options (
                    question_id,
                    option_text,
                    is_correct,
                    explanation,
                    option_order,
                    created_at
                ) VALUES (
                    new_question_id,
                    option_record.option_text,
                    option_record.is_correct,
                    option_record.explanation,
                    option_record.option_order,
                    option_record.created_at
                );
            END LOOP;
        END LOOP;
        
        migrated_count := migrated_count + 1;
    END LOOP;
    
    RETURN migrated_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE tests IS 'Unified table for all types of tests - manual, lesson-generated, and AI-generated';
COMMENT ON COLUMN tests.test_type IS 'Type of test: manual (user-created), lesson_generated (from lesson recordings), ai_generated (from AI processing)';
COMMENT ON COLUMN tests.source_type IS 'Source of the test: manual, recording, lesson, ai_processing';
COMMENT ON COLUMN tests.source_id IS 'ID of the source (recording_id for lesson tests, NULL for manual)';
COMMENT ON COLUMN tests.tags IS 'JSON array of tags for categorization and search';
COMMENT ON COLUMN tests.learning_objectives IS 'JSON array of learning objectives';
COMMENT ON COLUMN tests.is_public IS 'Whether the test is visible to other teachers';
COMMENT ON COLUMN tests.is_shared IS 'Whether the test has been shared with specific users/classes';
COMMENT ON COLUMN tests.shared_with IS 'JSON array of user/class IDs the test is shared with';
COMMENT ON TABLE test_questions IS 'Questions belonging to tests in the unified system';
COMMENT ON TABLE test_question_options IS 'Multiple choice options for test questions';
