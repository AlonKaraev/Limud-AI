-- Unified Tests Database Schema for SQLite
-- This schema merges manual tests with AI-generated lesson tests (similar to summaries)

-- Create unified tests table
CREATE TABLE IF NOT EXISTS tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    test_type TEXT NOT NULL DEFAULT 'manual' CHECK (test_type IN ('manual', 'lesson_generated', 'ai_generated')),
    
    -- Source information
    source_type TEXT DEFAULT 'manual' CHECK (source_type IN ('manual', 'recording', 'lesson', 'ai_processing')),
    source_id INTEGER, -- References recording_id for lesson tests, NULL for manual
    
    -- Educational metadata
    subject_area TEXT,
    grade_level TEXT,
    curriculum TEXT,
    
    -- Test configuration
    time_limit INTEGER DEFAULT 0, -- in minutes, 0 = no limit
    question_count INTEGER DEFAULT 0,
    passing_score INTEGER DEFAULT 60, -- percentage
    allow_retakes INTEGER DEFAULT 1,
    shuffle_questions INTEGER DEFAULT 0,
    shuffle_answers INTEGER DEFAULT 0,
    show_results_immediately INTEGER DEFAULT 1,
    
    -- Content organization
    tags TEXT DEFAULT '[]', -- JSON array of tags
    difficulty_level TEXT DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard', 'mixed')),
    learning_objectives TEXT DEFAULT '[]', -- JSON array of learning objectives
    
    -- Status and visibility
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
    is_public INTEGER DEFAULT 0,
    is_shared INTEGER DEFAULT 0,
    shared_with TEXT DEFAULT '[]', -- JSON array of user/class IDs
    
    -- AI-specific metadata (for lesson tests)
    ai_provider TEXT, -- 'openai', 'anthropic', etc.
    model_version TEXT,
    confidence_score REAL DEFAULT 0.0,
    processing_metadata TEXT DEFAULT '{}',
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

-- Create unified test questions table (replaces generated_questions for tests)
CREATE TABLE IF NOT EXISTS test_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank')),
    difficulty_level TEXT DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    points INTEGER DEFAULT 1,
    order_index INTEGER DEFAULT 0,
    
    -- Multiple choice specific
    correct_answer TEXT, -- For non-multiple choice questions
    explanation TEXT,
    
    -- Metadata
    metadata TEXT DEFAULT '{}',
    tags TEXT DEFAULT '[]',
    
    -- AI generation info
    ai_generated INTEGER DEFAULT 0,
    ai_provider TEXT,
    confidence_score REAL DEFAULT 0.0,
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for test questions
CREATE INDEX IF NOT EXISTS idx_test_questions_test_id ON test_questions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_question_type ON test_questions(question_type);
CREATE INDEX IF NOT EXISTS idx_test_questions_difficulty ON test_questions(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_test_questions_order ON test_questions(order_index);
CREATE INDEX IF NOT EXISTS idx_test_questions_ai_generated ON test_questions(ai_generated);

-- Create test question options table
CREATE TABLE IF NOT EXISTS test_question_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL REFERENCES test_questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct INTEGER DEFAULT 0,
    explanation TEXT,
    option_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for question options
CREATE INDEX IF NOT EXISTS idx_test_question_options_question_id ON test_question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_test_question_options_is_correct ON test_question_options(is_correct);
CREATE INDEX IF NOT EXISTS idx_test_question_options_order ON test_question_options(option_order);

-- Create views for backward compatibility with existing question sets queries
CREATE VIEW IF NOT EXISTS lesson_tests AS
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
CREATE VIEW IF NOT EXISTS manual_tests AS
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
CREATE VIEW IF NOT EXISTS test_statistics AS
SELECT 
    user_id,
    COUNT(*) as total_tests,
    SUM(CASE WHEN test_type = 'manual' THEN 1 ELSE 0 END) as manual_tests,
    SUM(CASE WHEN test_type IN ('lesson_generated', 'ai_generated') THEN 1 ELSE 0 END) as lesson_tests,
    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_tests,
    SUM(CASE WHEN is_public = 1 THEN 1 ELSE 0 END) as public_tests,
    SUM(CASE WHEN is_shared = 1 THEN 1 ELSE 0 END) as shared_tests,
    SUM(question_count) as total_questions,
    COUNT(DISTINCT subject_area) as subjects_covered,
    COUNT(DISTINCT grade_level) as grade_levels_covered
FROM tests 
GROUP BY user_id;

-- Add comments for documentation
-- tests table: Unified table for all types of tests - manual, lesson-generated, and AI-generated
-- test_type: Type of test: manual (user-created), lesson_generated (from lesson recordings), ai_generated (from AI processing)
-- source_type: Source of the test: manual, recording, lesson, ai_processing
-- source_id: ID of the source (recording_id for lesson tests, NULL for manual)
-- tags: JSON array of tags for categorization and search
-- learning_objectives: JSON array of learning objectives
-- is_public: Whether the test is visible to other teachers
-- is_shared: Whether the test has been shared with specific users/classes
-- shared_with: JSON array of user/class IDs the test is shared with
-- test_questions: Questions belonging to tests in the unified system
-- test_question_options: Multiple choice options for test questions
