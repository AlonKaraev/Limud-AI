-- AI Content Generation Schema Extension
-- This extends the existing schema with tables for AI-generated content

-- AI Processing Jobs table to track processing status
CREATE TABLE ai_processing_jobs (
    id SERIAL PRIMARY KEY,
    recording_id INTEGER NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_type VARCHAR(50) NOT NULL CHECK (job_type IN ('transcription', 'summary', 'questions', 'full_processing')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    ai_provider VARCHAR(50) NOT NULL DEFAULT 'openai',
    processing_config JSONB DEFAULT '{}',
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transcriptions table for Hebrew speech-to-text results
CREATE TABLE transcriptions (
    id SERIAL PRIMARY KEY,
    recording_id INTEGER NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id INTEGER REFERENCES ai_processing_jobs(id) ON DELETE SET NULL,
    transcription_text TEXT NOT NULL,
    confidence_score DECIMAL(3,2) DEFAULT 0.0,
    language_detected VARCHAR(10) DEFAULT 'he',
    processing_duration INTEGER, -- in milliseconds
    ai_provider VARCHAR(50) NOT NULL DEFAULT 'openai',
    model_version VARCHAR(100),
    segments JSONB DEFAULT '[]', -- Array of time-stamped segments
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Content Summaries table for lesson summaries
CREATE TABLE content_summaries (
    id SERIAL PRIMARY KEY,
    recording_id INTEGER NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
    transcription_id INTEGER REFERENCES transcriptions(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id INTEGER REFERENCES ai_processing_jobs(id) ON DELETE SET NULL,
    summary_text TEXT NOT NULL,
    summary_type VARCHAR(50) DEFAULT 'educational' CHECK (summary_type IN ('educational', 'brief', 'detailed', 'key_points')),
    key_topics JSONB DEFAULT '[]', -- Array of main topics
    learning_objectives JSONB DEFAULT '[]', -- Array of learning objectives
    subject_area VARCHAR(100),
    grade_level VARCHAR(20),
    confidence_score DECIMAL(3,2) DEFAULT 0.0,
    ai_provider VARCHAR(50) NOT NULL DEFAULT 'openai',
    model_version VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Generated Questions table for assessment questions
CREATE TABLE generated_questions (
    id SERIAL PRIMARY KEY,
    recording_id INTEGER NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
    transcription_id INTEGER REFERENCES transcriptions(id) ON DELETE CASCADE,
    summary_id INTEGER REFERENCES content_summaries(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id INTEGER REFERENCES ai_processing_jobs(id) ON DELETE SET NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay')),
    correct_answer TEXT NOT NULL,
    answer_options JSONB DEFAULT '[]', -- Array of answer options for multiple choice
    difficulty_level VARCHAR(20) DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    topic_area VARCHAR(200),
    learning_objective TEXT,
    explanation TEXT, -- Explanation for the correct answer
    confidence_score DECIMAL(3,2) DEFAULT 0.0,
    ai_provider VARCHAR(50) NOT NULL DEFAULT 'openai',
    model_version VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Question Sets table to group questions together
CREATE TABLE question_sets (
    id SERIAL PRIMARY KEY,
    recording_id INTEGER NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id INTEGER REFERENCES ai_processing_jobs(id) ON DELETE SET NULL,
    set_name VARCHAR(255) NOT NULL,
    description TEXT,
    total_questions INTEGER DEFAULT 0,
    subject_area VARCHAR(100),
    grade_level VARCHAR(20),
    estimated_duration INTEGER, -- in minutes
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Junction table for questions in sets
CREATE TABLE question_set_items (
    id SERIAL PRIMARY KEY,
    question_set_id INTEGER NOT NULL REFERENCES question_sets(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES generated_questions(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL DEFAULT 0,
    points INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(question_set_id, question_id)
);

-- AI Service Usage Tracking
CREATE TABLE ai_service_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_provider VARCHAR(50) NOT NULL,
    service_type VARCHAR(50) NOT NULL, -- transcription, text_generation, etc.
    tokens_used INTEGER DEFAULT 0,
    cost_usd DECIMAL(10,4) DEFAULT 0.0000,
    processing_time INTEGER, -- in milliseconds
    request_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- Content Quality Ratings (for human feedback)
CREATE TABLE content_quality_ratings (
    id SERIAL PRIMARY KEY,
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('transcription', 'summary', 'question')),
    content_id INTEGER NOT NULL, -- ID of the rated content
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    improvement_suggestions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_ai_processing_jobs_recording_id ON ai_processing_jobs(recording_id);
CREATE INDEX idx_ai_processing_jobs_user_id ON ai_processing_jobs(user_id);
CREATE INDEX idx_ai_processing_jobs_status ON ai_processing_jobs(status);
CREATE INDEX idx_ai_processing_jobs_job_type ON ai_processing_jobs(job_type);
CREATE INDEX idx_ai_processing_jobs_created_at ON ai_processing_jobs(created_at);

CREATE INDEX idx_transcriptions_recording_id ON transcriptions(recording_id);
CREATE INDEX idx_transcriptions_user_id ON transcriptions(user_id);
CREATE INDEX idx_transcriptions_job_id ON transcriptions(job_id);
CREATE INDEX idx_transcriptions_created_at ON transcriptions(created_at);

CREATE INDEX idx_content_summaries_recording_id ON content_summaries(recording_id);
CREATE INDEX idx_content_summaries_transcription_id ON content_summaries(transcription_id);
CREATE INDEX idx_content_summaries_user_id ON content_summaries(user_id);
CREATE INDEX idx_content_summaries_subject_area ON content_summaries(subject_area);
CREATE INDEX idx_content_summaries_created_at ON content_summaries(created_at);

CREATE INDEX idx_generated_questions_recording_id ON generated_questions(recording_id);
CREATE INDEX idx_generated_questions_transcription_id ON generated_questions(transcription_id);
CREATE INDEX idx_generated_questions_summary_id ON generated_questions(summary_id);
CREATE INDEX idx_generated_questions_user_id ON generated_questions(user_id);
CREATE INDEX idx_generated_questions_question_type ON generated_questions(question_type);
CREATE INDEX idx_generated_questions_difficulty_level ON generated_questions(difficulty_level);
CREATE INDEX idx_generated_questions_created_at ON generated_questions(created_at);

CREATE INDEX idx_question_sets_recording_id ON question_sets(recording_id);
CREATE INDEX idx_question_sets_user_id ON question_sets(user_id);
CREATE INDEX idx_question_sets_created_at ON question_sets(created_at);

CREATE INDEX idx_question_set_items_question_set_id ON question_set_items(question_set_id);
CREATE INDEX idx_question_set_items_question_id ON question_set_items(question_id);

CREATE INDEX idx_ai_service_usage_user_id ON ai_service_usage(user_id);
CREATE INDEX idx_ai_service_usage_service_provider ON ai_service_usage(service_provider);
CREATE INDEX idx_ai_service_usage_request_timestamp ON ai_service_usage(request_timestamp);

CREATE INDEX idx_content_quality_ratings_content_type ON content_quality_ratings(content_type);
CREATE INDEX idx_content_quality_ratings_user_id ON content_quality_ratings(user_id);
CREATE INDEX idx_content_quality_ratings_created_at ON content_quality_ratings(created_at);

-- Apply update triggers to new tables
CREATE TRIGGER update_ai_processing_jobs_updated_at BEFORE UPDATE ON ai_processing_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transcriptions_updated_at BEFORE UPDATE ON transcriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_summaries_updated_at BEFORE UPDATE ON content_summaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generated_questions_updated_at BEFORE UPDATE ON generated_questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_question_sets_updated_at BEFORE UPDATE ON question_sets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
