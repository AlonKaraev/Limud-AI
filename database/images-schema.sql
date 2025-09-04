-- Images table for storing image metadata
CREATE TABLE IF NOT EXISTS images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    image_id VARCHAR(255) UNIQUE NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    file_type VARCHAR(50),
    mime_type VARCHAR(100) NOT NULL,
    dimensions TEXT, -- JSON object with width/height
    compression_quality INTEGER DEFAULT 80,
    is_compressed BOOLEAN DEFAULT FALSE,
    tags TEXT, -- JSON array of tags
    description TEXT,
    metadata TEXT, -- JSON metadata
    upload_status VARCHAR(50) DEFAULT 'completed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Image text extraction jobs table for tracking OCR processing
CREATE TABLE IF NOT EXISTS image_text_extraction_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    job_type VARCHAR(50) NOT NULL DEFAULT 'text_extraction',
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
    extraction_method VARCHAR(100) NOT NULL DEFAULT 'ocr',
    progress_percent INTEGER DEFAULT 0,
    progress_message TEXT,
    error_message TEXT,
    processing_config TEXT, -- JSON config
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME,
    FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Image text extractions table for OCR results (updated with editing support)
CREATE TABLE IF NOT EXISTS image_text_extractions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    job_id INTEGER,
    extracted_text TEXT,
    original_text TEXT, -- Store original before edits
    extraction_method VARCHAR(100) NOT NULL,
    confidence_score REAL DEFAULT 0.0,
    language_detected VARCHAR(50),
    processing_duration INTEGER, -- in milliseconds
    extraction_metadata TEXT, -- JSON metadata
    is_edited BOOLEAN DEFAULT FALSE,
    edited_by INTEGER,
    edited_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES image_text_extraction_jobs(id) ON DELETE SET NULL,
    FOREIGN KEY (edited_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Image text extraction edit history
CREATE TABLE IF NOT EXISTS image_text_extraction_edit_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    extraction_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    original_text TEXT,
    edited_text TEXT,
    edit_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (extraction_id) REFERENCES image_text_extractions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_images_user_id ON images(user_id);
CREATE INDEX IF NOT EXISTS idx_images_image_id ON images(image_id);
CREATE INDEX IF NOT EXISTS idx_images_created_at ON images(created_at);
CREATE INDEX IF NOT EXISTS idx_images_tags ON images(tags);
CREATE INDEX IF NOT EXISTS idx_image_text_extractions_image_id ON image_text_extractions(image_id);
CREATE INDEX IF NOT EXISTS idx_image_text_extractions_user_id ON image_text_extractions(user_id);
CREATE INDEX IF NOT EXISTS idx_image_text_extraction_jobs_image_id ON image_text_extraction_jobs(image_id);
CREATE INDEX IF NOT EXISTS idx_image_text_extraction_jobs_status ON image_text_extraction_jobs(status);
CREATE INDEX IF NOT EXISTS idx_image_text_extraction_edit_history_extraction_id ON image_text_extraction_edit_history(extraction_id);
