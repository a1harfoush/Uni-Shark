-- Quick migration to fix missing columns
-- Run this immediately in your Supabase SQL editor

-- Add missing columns to user_credentials table
ALTER TABLE user_credentials 
ADD COLUMN IF NOT EXISTS scraping_suspended BOOLEAN DEFAULT FALSE;

ALTER TABLE user_credentials 
ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

ALTER TABLE user_credentials 
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE;

-- Create index for suspension queries
CREATE INDEX IF NOT EXISTS idx_user_credentials_scraping_suspended 
ON user_credentials (scraping_suspended);

-- Create scraping_errors table
CREATE TABLE IF NOT EXISTS scraping_errors (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    additional_details JSONB DEFAULT '{}',
    consecutive_failure_count INTEGER DEFAULT 1,
    should_suspend_scraping BOOLEAN DEFAULT FALSE,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for scraping_errors
CREATE INDEX IF NOT EXISTS idx_scraping_errors_user_id ON scraping_errors (user_id);
CREATE INDEX IF NOT EXISTS idx_scraping_errors_occurred_at ON scraping_errors (occurred_at);
CREATE INDEX IF NOT EXISTS idx_scraping_errors_error_type ON scraping_errors (error_type);

-- Create notification deduplication table
CREATE TABLE IF NOT EXISTS notification_dedup (
    id BIGSERIAL PRIMARY KEY,
    notification_id TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    notification_type TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    sent_at BIGINT NOT NULL
);

-- Create indexes for notification_dedup
CREATE INDEX IF NOT EXISTS idx_notification_dedup_user_id ON notification_dedup (user_id);
CREATE INDEX IF NOT EXISTS idx_notification_dedup_sent_at ON notification_dedup (sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_dedup_notification_id ON notification_dedup (notification_id);

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_credentials' 
AND column_name IN ('scraping_suspended', 'suspension_reason', 'suspended_at');