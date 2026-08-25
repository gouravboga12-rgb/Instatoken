-- =============================================================================
-- Insta Token PostgreSQL Database Schema for AWS RDS
-- =============================================================================

CREATE TABLE IF NOT EXISTS sync_store (
    key VARCHAR(100) PRIMARY KEY,
    data JSONB NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hospitals (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    cover_image_url TEXT,
    email VARCHAR(255),
    phone VARCHAR(50),
    city VARCHAR(100),
    state VARCHAR(100),
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hospital_profiles (
    hospital_id VARCHAR(100) PRIMARY KEY REFERENCES hospitals(id) ON DELETE CASCADE,
    profile_data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hospital_departments (
    id VARCHAR(100) PRIMARY KEY,
    hospital_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(50),
    head_doctor VARCHAR(255),
    total_doctors INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hospital_doctors (
    id VARCHAR(100) PRIMARY KEY,
    hospital_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    specialization VARCHAR(255),
    department_id VARCHAR(100),
    department_name VARCHAR(255),
    photo_url TEXT,
    qualification VARCHAR(255),
    experience INTEGER DEFAULT 0,
    consultation_fee NUMERIC(10, 2) DEFAULT 0,
    rating NUMERIC(3, 2) DEFAULT 5.0,
    total_patients INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tokens (
    id VARCHAR(100) PRIMARY KEY,
    hospital_id VARCHAR(100),
    doctor_id VARCHAR(100),
    token_number VARCHAR(50),
    patient_name VARCHAR(255),
    patient_phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'waiting', -- waiting, checked-in, in-cabin, completed, cancelled, skipped
    token_type VARCHAR(50) DEFAULT 'online', -- online, offline, walk-in
    session VARCHAR(50) DEFAULT 'Morning',
    token_date DATE DEFAULT CURRENT_DATE,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS appointments (
    id VARCHAR(100) PRIMARY KEY,
    hospital_id VARCHAR(100),
    doctor_id VARCHAR(100),
    patient_name VARCHAR(255),
    patient_phone VARCHAR(50),
    appointment_date DATE,
    appointment_time VARCHAR(50),
    status VARCHAR(50) DEFAULT 'confirmed',
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tokens_hospital_date ON tokens (hospital_id, token_date);
CREATE INDEX IF NOT EXISTS idx_tokens_doctor_date ON tokens (doctor_id, token_date);
CREATE INDEX IF NOT EXISTS idx_doctors_hospital ON hospital_doctors (hospital_id);
CREATE INDEX IF NOT EXISTS idx_departments_hospital ON hospital_departments (hospital_id);
