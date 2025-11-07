-- Health Helper App - SQLite Database Schema (Local Development)
-- AWS PostgreSQL Ready - Just change DB connection string
-- Created: 2025-11-07

-- ============================================================================
-- SESSIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'interrupted')),
    user_role TEXT CHECK (user_role IN ('patient', 'doctor')),
    use_case TEXT,
    patient_id TEXT,
    reviewed_by TEXT REFERENCES sessions(id),
    vitals_consent INTEGER DEFAULT 0,
    vitals_check_timestamp DATETIME,
    session_duration INTEGER,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- VIDEO ANALYSIS (Silent Collection)
-- ============================================================================
CREATE TABLE IF NOT EXISTS video_analysis (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    analysis_type TEXT NOT NULL CHECK (analysis_type IN ('facial_scan', 'heart_rate')),
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Facial scan vitals
    face_detected INTEGER,
    pupil_diameter_left REAL,
    pupil_diameter_right REAL,
    pupil_asymmetry REAL,
    jaundice_score REAL,
    pallor_score REAL,
    cyanosis_detected INTEGER,
    facial_asymmetry REAL,
    quality_score REAL,

    -- Heart rate vitals
    heart_rate INTEGER,
    heart_rate_quality REAL,
    rppg_confidence REAL,

    -- Alerts (stored but not displayed until session end)
    alerts TEXT DEFAULT '{"urgent": [], "warnings": []}',

    -- Display settings
    display_mode TEXT CHECK (display_mode IN ('minimal', 'hidden', 'full')) DEFAULT 'minimal',
    shown_to_user INTEGER DEFAULT 0,

    -- Raw data reference
    raw_data_s3_url TEXT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PAIN/SYMPTOM LOCALIZATION
-- ============================================================================
CREATE TABLE IF NOT EXISTS symptom_locations (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    anatomy_part TEXT NOT NULL,
    symptom_type TEXT,
    intensity INTEGER CHECK (intensity BETWEEN 1 AND 10),
    description TEXT,
    coordinates TEXT,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- CONVERSATION HISTORY
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversation_turns (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    turn_number INTEGER NOT NULL,
    speaker TEXT NOT NULL CHECK (speaker IN ('user', 'agent')),
    message TEXT NOT NULL,
    intent TEXT,
    confidence REAL,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- ANATOMY INTERACTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS anatomy_interactions (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    model_id TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    triggered_by TEXT CHECK (triggered_by IN ('voice', 'agent', 'user_touch')),
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- EDUCATIONAL CONTENT DELIVERED
-- ============================================================================
CREATE TABLE IF NOT EXISTS education_delivered (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL,
    topic TEXT NOT NULL,
    duration INTEGER,
    user_consented INTEGER DEFAULT 1,
    engagement_score REAL,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SESSION REPORTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS session_reports (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL DEFAULT 'comprehensive',

    vitals_summary TEXT,
    symptoms_summary TEXT,
    suggestions TEXT,

    topics_covered TEXT,
    total_education_time INTEGER,

    pdf_url TEXT,
    dashboard_data TEXT,

    generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- VITALS DISPLAYED TO USER
-- ============================================================================
CREATE TABLE IF NOT EXISTS vitals_displayed (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    metric_name TEXT NOT NULL,
    value TEXT NOT NULL,
    unit TEXT,
    displayed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- DOCTOR REVIEWS (Phase 2)
-- ============================================================================
CREATE TABLE IF NOT EXISTS doctor_reviews (
    id TEXT PRIMARY KEY,
    doctor_session_id TEXT NOT NULL REFERENCES sessions(id),
    patient_session_id TEXT NOT NULL REFERENCES sessions(id),
    review_notes TEXT,
    diagnosis_notes TEXT,
    recommendations TEXT,
    follow_up_required INTEGER DEFAULT 0,
    reviewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_use_case ON sessions(use_case);
CREATE INDEX IF NOT EXISTS idx_sessions_user_role ON sessions(user_role);
CREATE INDEX IF NOT EXISTS idx_sessions_patient_id ON sessions(patient_id);

CREATE INDEX IF NOT EXISTS idx_video_analysis_session ON video_analysis(session_id);
CREATE INDEX IF NOT EXISTS idx_video_analysis_type ON video_analysis(session_id, analysis_type);

CREATE INDEX IF NOT EXISTS idx_symptom_locations_session ON symptom_locations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_session ON conversation_turns(session_id);
CREATE INDEX IF NOT EXISTS idx_anatomy_session ON anatomy_interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_education_session ON education_delivered(session_id);
CREATE INDEX IF NOT EXISTS idx_reports_session ON session_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_vitals_displayed_session ON vitals_displayed(session_id);

CREATE INDEX IF NOT EXISTS idx_doctor_reviews_doctor ON doctor_reviews(doctor_session_id);
CREATE INDEX IF NOT EXISTS idx_doctor_reviews_patient ON doctor_reviews(patient_session_id);

-- ============================================================================
-- TRIGGERS (SQLite compatible)
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS trigger_sessions_updated_at
    AFTER UPDATE ON sessions
    FOR EACH ROW
BEGIN
    UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update session duration on end
CREATE TRIGGER IF NOT EXISTS trigger_update_session_duration
    AFTER UPDATE ON sessions
    FOR EACH ROW
    WHEN NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL
BEGIN
    UPDATE sessions
    SET session_duration = CAST((julianday(NEW.ended_at) - julianday(NEW.started_at)) * 86400 AS INTEGER)
    WHERE id = NEW.id;
END;

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Active sessions
CREATE VIEW IF NOT EXISTS active_sessions AS
SELECT
    id,
    started_at,
    use_case,
    CAST((julianday('now') - julianday(started_at)) * 86400 AS INTEGER) as duration_seconds
FROM sessions
WHERE status = 'active'
ORDER BY started_at DESC;

-- Patient sessions with vitals
CREATE VIEW IF NOT EXISTS patient_sessions_with_vitals AS
SELECT
    s.id,
    s.started_at,
    s.use_case,
    s.vitals_consent,
    s.vitals_check_timestamp,
    COUNT(DISTINCT va.id) as vitals_count,
    COUNT(DISTINCT vd.id) as vitals_displayed_count,
    COUNT(DISTINCT sl.id) as symptoms_count
FROM sessions s
LEFT JOIN video_analysis va ON s.id = va.session_id
LEFT JOIN vitals_displayed vd ON s.id = vd.session_id
LEFT JOIN symptom_locations sl ON s.id = sl.session_id
WHERE s.user_role = 'patient'
GROUP BY s.id, s.started_at, s.use_case, s.vitals_consent, s.vitals_check_timestamp;
