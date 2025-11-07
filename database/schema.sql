-- Health Helper App - PostgreSQL Database Schema
-- AWS RDS Deployment Ready
-- Created: 2025-11-07

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SESSIONS
-- ============================================================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP,
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'completed', 'interrupted')),
    user_role VARCHAR(20) CHECK (user_role IN ('patient', 'doctor')), -- NEW: Role selection
    use_case VARCHAR(50), -- 'headache', 'general_checkup', 'eye_health', etc.
    patient_id VARCHAR(100), -- NEW: For doctor reviewing patient data
    reviewed_by UUID REFERENCES sessions(id), -- NEW: Doctor session that reviewed this
    vitals_consent BOOLEAN DEFAULT false, -- NEW: Did user consent to vitals check?
    vitals_check_timestamp TIMESTAMP, -- NEW: When vitals were collected
    session_duration INTEGER, -- seconds
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE sessions IS 'Main session tracking - one record per user session';
COMMENT ON COLUMN sessions.status IS 'active: in progress, completed: finished normally, interrupted: ended early';
COMMENT ON COLUMN sessions.user_role IS 'patient: general user seeking help, doctor: reviewing patient data';
COMMENT ON COLUMN sessions.vitals_consent IS 'TRUE if user agreed to vitals check during conversation';

-- ============================================================================
-- VIDEO ANALYSIS (Silent Collection)
-- ============================================================================
CREATE TABLE video_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    analysis_type VARCHAR(50) NOT NULL CHECK (analysis_type IN ('facial_scan', 'heart_rate')),
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Facial scan vitals
    face_detected BOOLEAN,
    pupil_diameter_left FLOAT,
    pupil_diameter_right FLOAT,
    pupil_asymmetry FLOAT,
    jaundice_score FLOAT,
    pallor_score FLOAT,
    cyanosis_detected BOOLEAN,
    facial_asymmetry FLOAT,
    quality_score FLOAT,

    -- Heart rate vitals
    heart_rate INTEGER,
    heart_rate_quality FLOAT,
    rppg_confidence FLOAT,

    -- Alerts (stored but not displayed until session end)
    alerts JSONB DEFAULT '{"urgent": [], "warnings": []}'::jsonb,

    -- Display settings (what was shown to user)
    display_mode VARCHAR(20) CHECK (display_mode IN ('minimal', 'hidden', 'full')) DEFAULT 'minimal',
    shown_to_user BOOLEAN DEFAULT false, -- NEW: Was this data displayed during session?

    -- Raw data reference
    raw_data_s3_url TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE video_analysis IS 'All video analysis results - collected silently during session';
COMMENT ON COLUMN video_analysis.alerts IS 'JSON: {urgent: [strings], warnings: [strings]}';

-- ============================================================================
-- PAIN/SYMPTOM LOCALIZATION
-- ============================================================================
CREATE TABLE symptom_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    anatomy_part VARCHAR(100) NOT NULL, -- 'frontal_lobe', 'temporal_region', 'neck_base', etc.
    symptom_type VARCHAR(50), -- 'pain', 'pressure', 'numbness', 'tingling', etc.
    intensity INTEGER CHECK (intensity BETWEEN 1 AND 10),
    description TEXT,
    coordinates JSONB, -- {x: 0.5, y: 0.3, z: 0.2} on 3D model
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE symptom_locations IS 'User-reported pain/symptom locations on 3D anatomy model';
COMMENT ON COLUMN symptom_locations.coordinates IS 'JSON: 3D coordinates on anatomy model';

-- ============================================================================
-- CONVERSATION HISTORY
-- ============================================================================
CREATE TABLE conversation_turns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    turn_number INTEGER NOT NULL,
    speaker VARCHAR(20) NOT NULL CHECK (speaker IN ('user', 'agent')),
    message TEXT NOT NULL,
    intent VARCHAR(50), -- 'symptom_report', 'education_request', 'navigation_command', etc.
    confidence FLOAT, -- intent detection confidence
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE conversation_turns IS 'Complete conversation transcript';
COMMENT ON COLUMN conversation_turns.intent IS 'Detected intent from LLM';

-- ============================================================================
-- ANATOMY INTERACTIONS
-- ============================================================================
CREATE TABLE anatomy_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    model_id VARCHAR(100) NOT NULL, -- BioDigital model ID
    action VARCHAR(50) NOT NULL, -- 'zoom', 'rotate', 'highlight', 'animation', 'navigate'
    details JSONB, -- {camera: {...}, highlighted: [...], animation_id: "..."}
    triggered_by VARCHAR(20) CHECK (triggered_by IN ('voice', 'agent', 'user_touch')),
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE anatomy_interactions IS 'All 3D anatomy model interactions';
COMMENT ON COLUMN anatomy_interactions.details IS 'JSON: action-specific details';

-- ============================================================================
-- EDUCATIONAL CONTENT DELIVERED
-- ============================================================================
CREATE TABLE education_delivered (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    content_type VARCHAR(50) NOT NULL, -- 'anatomy_navigation', 'animation', 'explanation', 'graph'
    topic VARCHAR(100) NOT NULL, -- 'migraine_pathways', 'blood_circulation', 'brain_anatomy'
    duration INTEGER, -- seconds spent on this content
    user_consented BOOLEAN DEFAULT true, -- for animations that require permission
    engagement_score FLOAT, -- optional: how engaged was user (based on questions asked)
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE education_delivered IS 'Track educational content shown during session';

-- ============================================================================
-- SESSION REPORTS
-- ============================================================================
CREATE TABLE session_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL DEFAULT 'comprehensive',

    -- Vitals summary (aggregated from video_analysis)
    vitals_summary JSONB,
    -- Example: {"heart_rate": {"avg": 72, "min": 65, "max": 82}, "facial_scan": {...}}

    -- Symptoms summary (aggregated from symptom_locations)
    symptoms_summary JSONB,
    -- Example: {"primary": "frontal headache", "intensity": 7, "locations": [...]}

    -- Suggestions (NOT diagnoses)
    suggestions JSONB,
    -- Example: [{"condition": "tension_headache", "confidence": "moderate", "reasoning": "..."}]

    -- Educational summary
    topics_covered TEXT[],
    total_education_time INTEGER, -- seconds

    -- Report files
    pdf_url TEXT, -- S3 URL to PDF report
    dashboard_data JSONB, -- Full dashboard JSON for frontend

    generated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE session_reports IS 'Generated reports for each completed session';
COMMENT ON COLUMN session_reports.suggestions IS 'Possible conditions with confidence levels - NOT medical diagnoses';

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Session lookups
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_started_at ON sessions(started_at DESC);
CREATE INDEX idx_sessions_use_case ON sessions(use_case);

-- Video analysis by session
CREATE INDEX idx_video_analysis_session ON video_analysis(session_id);
CREATE INDEX idx_video_analysis_type ON video_analysis(session_id, analysis_type);

-- Symptom locations
CREATE INDEX idx_symptom_locations_session ON symptom_locations(session_id);
CREATE INDEX idx_symptom_locations_type ON symptom_locations(symptom_type);

-- Conversation
CREATE INDEX idx_conversation_session ON conversation_turns(session_id);
CREATE INDEX idx_conversation_speaker ON conversation_turns(session_id, speaker);

-- Anatomy interactions
CREATE INDEX idx_anatomy_session ON anatomy_interactions(session_id);

-- Education
CREATE INDEX idx_education_session ON education_delivered(session_id);

-- Reports
CREATE INDEX idx_reports_session ON session_reports(session_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Update session duration on end
CREATE OR REPLACE FUNCTION update_session_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL THEN
        NEW.session_duration = EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::INTEGER;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_session_duration
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_session_duration();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Active sessions
CREATE VIEW active_sessions AS
SELECT
    id,
    started_at,
    use_case,
    EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER as duration_seconds
FROM sessions
WHERE status = 'active'
ORDER BY started_at DESC;

-- Session vitals summary
CREATE VIEW session_vitals_summary AS
SELECT
    session_id,
    COUNT(*) FILTER (WHERE analysis_type = 'facial_scan') as facial_scan_count,
    COUNT(*) FILTER (WHERE analysis_type = 'heart_rate') as heart_rate_count,
    AVG(heart_rate) FILTER (WHERE heart_rate IS NOT NULL) as avg_heart_rate,
    MAX(quality_score) as max_quality_score
FROM video_analysis
GROUP BY session_id;

-- ============================================================================
-- SAMPLE DATA (for development/testing)
-- ============================================================================

-- Uncomment for dev environment only
/*
INSERT INTO sessions (id, started_at, status, use_case) VALUES
('550e8400-e29b-41d4-a716-446655440000', NOW() - INTERVAL '1 hour', 'completed', 'headache');

INSERT INTO symptom_locations (session_id, anatomy_part, symptom_type, intensity, description) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'frontal_lobe', 'pain', 7, 'Throbbing pain in forehead');

INSERT INTO video_analysis (session_id, analysis_type, face_detected, heart_rate) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'heart_rate', true, 72);
*/

-- ============================================================================
-- GRANTS (adjust for your AWS RDS setup)
-- ============================================================================

-- Create application user
-- CREATE USER health_app_user WITH PASSWORD 'your-secure-password';

-- Grant permissions
-- GRANT CONNECT ON DATABASE health_helper TO health_app_user;
-- GRANT USAGE ON SCHEMA public TO health_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO health_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO health_app_user;

-- ============================================================================
-- BACKUP & MAINTENANCE
-- ============================================================================

-- Enable point-in-time recovery in AWS RDS console
-- Set up automated backups (retention: 7 days minimum)
-- Enable Multi-AZ for production

-- Example backup command (run from EC2 instance with proper IAM role):
-- pg_dump -h your-rds-endpoint.region.rds.amazonaws.com -U postgres health_helper > backup.sql

COMMENT ON DATABASE health_helper IS 'Health Helper App - Voice-First Health Assistant';

-- ============================================================================
-- VITALS DISPLAYED TO USER (What user saw during session)
-- ============================================================================
CREATE TABLE vitals_displayed (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    metric_name VARCHAR(50) NOT NULL, -- 'heart_rate', 'pupil_left', 'pupil_right', 'symmetry'
    value VARCHAR(50) NOT NULL,
    unit VARCHAR(20), -- 'BPM', 'mm', '%'
    displayed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE vitals_displayed IS 'Tracks exactly what vitals were shown to user during session';

CREATE INDEX idx_vitals_displayed_session ON vitals_displayed(session_id);

-- ============================================================================
-- DOCTOR REVIEWS (For doctor workflow - Phase 2)
-- ============================================================================
CREATE TABLE doctor_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_session_id UUID NOT NULL REFERENCES sessions(id),
    patient_session_id UUID NOT NULL REFERENCES sessions(id),
    review_notes TEXT,
    diagnosis_notes TEXT,
    recommendations TEXT,
    follow_up_required BOOLEAN DEFAULT false,
    reviewed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE doctor_reviews IS 'Doctor review sessions - links doctor to patient sessions';

CREATE INDEX idx_doctor_reviews_doctor ON doctor_reviews(doctor_session_id);
CREATE INDEX idx_doctor_reviews_patient ON doctor_reviews(patient_session_id);

-- ============================================================================
-- UPDATED INDEXES
-- ============================================================================
CREATE INDEX idx_sessions_user_role ON sessions(user_role);
CREATE INDEX idx_sessions_patient_id ON sessions(patient_id);
CREATE INDEX idx_sessions_vitals_consent ON sessions(vitals_consent);
CREATE INDEX idx_video_analysis_shown ON video_analysis(shown_to_user);

-- ============================================================================
-- UPDATED VIEWS
-- ============================================================================

-- Patient sessions with vitals
CREATE VIEW patient_sessions_with_vitals AS
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

-- Doctor dashboard view (for later)
CREATE VIEW doctor_dashboard AS
SELECT
    s.id as patient_session_id,
    s.started_at,
    s.use_case,
    s.session_duration,
    COALESCE(dr.diagnosis_notes, 'Not reviewed') as diagnosis_status,
    dr.reviewed_at
FROM sessions s
LEFT JOIN doctor_reviews dr ON s.id = dr.patient_session_id
WHERE s.user_role = 'patient'
ORDER BY s.started_at DESC;

