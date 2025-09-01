-- Memory Cards Feature Database Schema
-- UTF-8 encoding for Hebrew text support

-- Memory card sets table - for organizing cards into study decks
CREATE TABLE IF NOT EXISTS memory_card_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    user_id INTEGER NOT NULL,
    subject_area TEXT,
    grade_level TEXT,
    is_public BOOLEAN DEFAULT 0,
    total_cards INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Memory cards table - core card storage with front/back text
CREATE TABLE IF NOT EXISTS memory_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    set_id INTEGER NOT NULL,
    front_text TEXT NOT NULL,
    back_text TEXT NOT NULL,
    card_type TEXT DEFAULT 'text' CHECK (card_type IN ('text', 'image', 'audio')),
    difficulty_level TEXT DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    tags TEXT DEFAULT '[]',
    is_active BOOLEAN DEFAULT 1,
    order_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (set_id) REFERENCES memory_card_sets(id) ON DELETE CASCADE
);

-- Memory card progress tracking for students
CREATE TABLE IF NOT EXISTS memory_card_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    card_id INTEGER NOT NULL,
    set_id INTEGER NOT NULL,
    correct_attempts INTEGER DEFAULT 0,
    incorrect_attempts INTEGER DEFAULT 0,
    last_reviewed_at DATETIME,
    mastery_level INTEGER DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 5),
    next_review_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (card_id) REFERENCES memory_cards(id) ON DELETE CASCADE,
    FOREIGN KEY (set_id) REFERENCES memory_card_sets(id) ON DELETE CASCADE,
    UNIQUE(student_id, card_id)
);

-- Memory card study sessions
CREATE TABLE IF NOT EXISTS memory_card_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    set_id INTEGER NOT NULL,
    session_type TEXT DEFAULT 'study' CHECK (session_type IN ('study', 'test', 'review')),
    cards_studied INTEGER DEFAULT 0,
    cards_correct INTEGER DEFAULT 0,
    cards_incorrect INTEGER DEFAULT 0,
    session_duration INTEGER DEFAULT 0,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    metadata TEXT DEFAULT '{}',
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (set_id) REFERENCES memory_card_sets(id) ON DELETE CASCADE
);

-- Memory card set permissions for sharing
CREATE TABLE IF NOT EXISTS memory_card_set_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    set_id INTEGER NOT NULL,
    class_id INTEGER NOT NULL,
    permission_type TEXT DEFAULT 'view' CHECK (permission_type IN ('view', 'study', 'test')),
    granted_by INTEGER NOT NULL,
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (set_id) REFERENCES memory_card_sets(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(set_id, class_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_memory_card_sets_user_id ON memory_card_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_card_sets_subject_area ON memory_card_sets(subject_area);
CREATE INDEX IF NOT EXISTS idx_memory_card_sets_grade_level ON memory_card_sets(grade_level);
CREATE INDEX IF NOT EXISTS idx_memory_card_sets_is_public ON memory_card_sets(is_public);
CREATE INDEX IF NOT EXISTS idx_memory_card_sets_created_at ON memory_card_sets(created_at);

CREATE INDEX IF NOT EXISTS idx_memory_cards_user_id ON memory_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_cards_set_id ON memory_cards(set_id);
CREATE INDEX IF NOT EXISTS idx_memory_cards_card_type ON memory_cards(card_type);
CREATE INDEX IF NOT EXISTS idx_memory_cards_difficulty_level ON memory_cards(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_memory_cards_is_active ON memory_cards(is_active);
CREATE INDEX IF NOT EXISTS idx_memory_cards_order_index ON memory_cards(order_index);

CREATE INDEX IF NOT EXISTS idx_memory_card_progress_student_id ON memory_card_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_memory_card_progress_card_id ON memory_card_progress(card_id);
CREATE INDEX IF NOT EXISTS idx_memory_card_progress_set_id ON memory_card_progress(set_id);
CREATE INDEX IF NOT EXISTS idx_memory_card_progress_mastery_level ON memory_card_progress(mastery_level);
CREATE INDEX IF NOT EXISTS idx_memory_card_progress_next_review_at ON memory_card_progress(next_review_at);

CREATE INDEX IF NOT EXISTS idx_memory_card_sessions_student_id ON memory_card_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_memory_card_sessions_set_id ON memory_card_sessions(set_id);
CREATE INDEX IF NOT EXISTS idx_memory_card_sessions_session_type ON memory_card_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_memory_card_sessions_started_at ON memory_card_sessions(started_at);

CREATE INDEX IF NOT EXISTS idx_memory_card_set_permissions_set_id ON memory_card_set_permissions(set_id);
CREATE INDEX IF NOT EXISTS idx_memory_card_set_permissions_class_id ON memory_card_set_permissions(class_id);
CREATE INDEX IF NOT EXISTS idx_memory_card_set_permissions_granted_by ON memory_card_set_permissions(granted_by);
CREATE INDEX IF NOT EXISTS idx_memory_card_set_permissions_is_active ON memory_card_set_permissions(is_active);
