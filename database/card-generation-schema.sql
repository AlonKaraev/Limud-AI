-- Card Generation Feature Database Schema
-- UTF-8 encoding for Hebrew text support

-- Card generation jobs table - tracks AI card generation requests
CREATE TABLE IF NOT EXISTS card_generation_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    recording_id INTEGER,
    text_length INTEGER NOT NULL,
    generation_config TEXT DEFAULT '{}',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    result_metadata TEXT DEFAULT '{}',
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE
);

-- Card generation logs table - analytics and tracking
CREATE TABLE IF NOT EXISTS card_generation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    recording_id INTEGER,
    cards_generated INTEGER DEFAULT 0,
    ai_provider TEXT NOT NULL,
    generation_config TEXT DEFAULT '{}',
    tokens_used INTEGER DEFAULT 0,
    cost_usd DECIMAL(10, 4) DEFAULT 0.0000,
    processing_time INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES card_generation_jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE
);

-- Generated cards temporary storage - before approval
CREATE TABLE IF NOT EXISTS generated_cards_temp (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    recording_id INTEGER,
    front_text TEXT NOT NULL,
    back_text TEXT NOT NULL,
    card_type TEXT DEFAULT 'text' CHECK (card_type IN ('text', 'image', 'audio')),
    difficulty_level TEXT DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    tags TEXT DEFAULT '[]',
    order_index INTEGER DEFAULT 0,
    confidence_score DECIMAL(3, 2) DEFAULT 0.0,
    generation_metadata TEXT DEFAULT '{}',
    is_approved BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES card_generation_jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE
);

-- Card generation feedback - teacher ratings and improvements
CREATE TABLE IF NOT EXISTS card_generation_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    relevance_rating INTEGER CHECK (relevance_rating >= 1 AND relevance_rating <= 5),
    difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
    feedback_text TEXT,
    improvement_suggestions TEXT,
    cards_approved INTEGER DEFAULT 0,
    cards_rejected INTEGER DEFAULT 0,
    cards_modified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES card_generation_jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- AI service usage tracking for card generation
CREATE TABLE IF NOT EXISTS ai_card_generation_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    job_id INTEGER NOT NULL,
    service_provider TEXT NOT NULL,
    model_name TEXT,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    cost_usd DECIMAL(10, 4) DEFAULT 0.0000,
    processing_time INTEGER DEFAULT 0,
    request_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    response_status TEXT DEFAULT 'success',
    error_details TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES card_generation_jobs(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_card_generation_jobs_user_id ON card_generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_card_generation_jobs_recording_id ON card_generation_jobs(recording_id);
CREATE INDEX IF NOT EXISTS idx_card_generation_jobs_status ON card_generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_card_generation_jobs_created_at ON card_generation_jobs(created_at);

CREATE INDEX IF NOT EXISTS idx_card_generation_logs_job_id ON card_generation_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_card_generation_logs_user_id ON card_generation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_card_generation_logs_recording_id ON card_generation_logs(recording_id);
CREATE INDEX IF NOT EXISTS idx_card_generation_logs_ai_provider ON card_generation_logs(ai_provider);
CREATE INDEX IF NOT EXISTS idx_card_generation_logs_created_at ON card_generation_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_generated_cards_temp_job_id ON generated_cards_temp(job_id);
CREATE INDEX IF NOT EXISTS idx_generated_cards_temp_user_id ON generated_cards_temp(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_cards_temp_recording_id ON generated_cards_temp(recording_id);
CREATE INDEX IF NOT EXISTS idx_generated_cards_temp_is_approved ON generated_cards_temp(is_approved);
CREATE INDEX IF NOT EXISTS idx_generated_cards_temp_order_index ON generated_cards_temp(order_index);

CREATE INDEX IF NOT EXISTS idx_card_generation_feedback_job_id ON card_generation_feedback(job_id);
CREATE INDEX IF NOT EXISTS idx_card_generation_feedback_user_id ON card_generation_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_card_generation_feedback_overall_rating ON card_generation_feedback(overall_rating);
CREATE INDEX IF NOT EXISTS idx_card_generation_feedback_created_at ON card_generation_feedback(created_at);

CREATE INDEX IF NOT EXISTS idx_ai_card_generation_usage_user_id ON ai_card_generation_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_card_generation_usage_job_id ON ai_card_generation_usage(job_id);
CREATE INDEX IF NOT EXISTS idx_ai_card_generation_usage_service_provider ON ai_card_generation_usage(service_provider);
CREATE INDEX IF NOT EXISTS idx_ai_card_generation_usage_request_timestamp ON ai_card_generation_usage(request_timestamp);

-- Create triggers to update timestamps
CREATE TRIGGER IF NOT EXISTS update_card_generation_jobs_timestamp 
    AFTER UPDATE ON card_generation_jobs
    FOR EACH ROW
    BEGIN
        UPDATE card_generation_jobs SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Create trigger to clean up temporary cards after 24 hours
CREATE TRIGGER IF NOT EXISTS cleanup_old_generated_cards_temp
    AFTER INSERT ON generated_cards_temp
    FOR EACH ROW
    BEGIN
        DELETE FROM generated_cards_temp 
        WHERE created_at < datetime('now', '-1 day') 
        AND is_approved = 0;
    END;
