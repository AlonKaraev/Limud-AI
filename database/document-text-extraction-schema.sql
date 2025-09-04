-- Document Text Extraction Schema
-- Adds support for document storage and automatic text extraction

-- Documents table for storing uploaded documents
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    document_id VARCHAR(255) NOT NULL UNIQUE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    metadata TEXT DEFAULT '{}', -- JSON metadata
    tags TEXT DEFAULT '[]', -- JSON array of tags
    upload_status VARCHAR(50) DEFAULT 'completed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Document text extractions table
CREATE TABLE IF NOT EXISTS document_text_extractions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    job_id INTEGER,
    extracted_text TEXT,
    extraction_method VARCHAR(50), -- 'direct', 'ocr', 'api', etc.
    confidence_score REAL DEFAULT 0.0,
    language_detected VARCHAR(10),
    processing_duration INTEGER, -- in milliseconds
    extraction_metadata TEXT DEFAULT '{}', -- JSON metadata about extraction
    is_edited BOOLEAN DEFAULT FALSE,
    original_text TEXT, -- Store original before edits
    edited_at DATETIME,
    edited_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (edited_by) REFERENCES users(id)
);

-- Text extraction jobs table for tracking processing status
CREATE TABLE IF NOT EXISTS text_extraction_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    job_type VARCHAR(50) DEFAULT 'text_extraction',
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    extraction_method VARCHAR(50), -- 'direct', 'ocr', 'api'
    processing_config TEXT DEFAULT '{}', -- JSON config
    progress_percent INTEGER DEFAULT 0,
    progress_message TEXT, -- Detailed progress message for user feedback
    error_message TEXT,
    started_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Text extraction edit history
CREATE TABLE IF NOT EXISTS text_extraction_edit_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    extraction_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    original_text TEXT,
    edited_text TEXT,
    edit_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (extraction_id) REFERENCES document_text_extractions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_document_id ON documents(document_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON documents(file_type);

CREATE INDEX IF NOT EXISTS idx_text_extractions_document_id ON document_text_extractions(document_id);
CREATE INDEX IF NOT EXISTS idx_text_extractions_user_id ON document_text_extractions(user_id);
CREATE INDEX IF NOT EXISTS idx_text_extractions_created_at ON document_text_extractions(created_at);

CREATE INDEX IF NOT EXISTS idx_extraction_jobs_document_id ON text_extraction_jobs(document_id);
CREATE INDEX IF NOT EXISTS idx_extraction_jobs_user_id ON text_extraction_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_extraction_jobs_status ON text_extraction_jobs(status);
CREATE INDEX IF NOT EXISTS idx_extraction_jobs_created_at ON text_extraction_jobs(created_at);

CREATE INDEX IF NOT EXISTS idx_extraction_history_extraction_id ON text_extraction_edit_history(extraction_id);
CREATE INDEX IF NOT EXISTS idx_extraction_history_user_id ON text_extraction_edit_history(user_id);

-- Add comments for documentation
-- documents table: Stores uploaded document files and metadata
-- document_text_extractions table: Stores extracted text content from documents
-- text_extraction_jobs table: Tracks the status and progress of text extraction jobs
-- text_extraction_edit_history table: Maintains history of manual edits to extracted text
