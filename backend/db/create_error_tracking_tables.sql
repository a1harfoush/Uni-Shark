-- Database schema for error tracking system
-- Run this SQL in your Supabase database

-- Create scraping_errors table to track all scraping errors
CREATE TABLE IF NOT EXISTS scraping_errors (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    additional_details JSONB DEFAULT '{}',
    consecutive_failure_count INTEGER DEFAULT 1,
    should_suspend_scraping BOOLEAN DEFAULT FALSE,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_scraping_errors_user_id (user_id),
    INDEX idx_scraping_errors_occurred_at (occurred_at),
    INDEX idx_scraping_errors_error_type (error_type)
);

-- Add new columns to user_credentials table for suspension tracking
ALTER TABLE user_credentials 
ADD COLUMN IF NOT EXISTS scraping_suspended BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE;

-- Create index for suspension queries
CREATE INDEX IF NOT EXISTS idx_user_credentials_scraping_suspended 
ON user_credentials (scraping_suspended);

-- Create a view for easy error summary per user
CREATE OR REPLACE VIEW user_error_summary AS
SELECT 
    user_id,
    COUNT(*) as total_errors,
    COUNT(CASE WHEN error_type != 'success' THEN 1 END) as actual_errors,
    MAX(CASE WHEN error_type != 'success' THEN consecutive_failure_count ELSE 0 END) as max_consecutive_failures,
    MAX(occurred_at) as last_error_at,
    ARRAY_AGG(DISTINCT error_type) FILTER (WHERE error_type != 'success') as error_types
FROM scraping_errors 
GROUP BY user_id;

-- Create a function to get recent errors for a user
CREATE OR REPLACE FUNCTION get_user_recent_errors(p_user_id TEXT, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    error_type TEXT,
    error_message TEXT,
    occurred_at TIMESTAMP WITH TIME ZONE,
    consecutive_failure_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        se.error_type,
        se.error_message,
        se.occurred_at,
        se.consecutive_failure_count
    FROM scraping_errors se
    WHERE se.user_id = p_user_id
    ORDER BY se.occurred_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Create a function to check if user scraping should be suspended
CREATE OR REPLACE FUNCTION should_suspend_user_scraping(p_user_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    recent_failure_count INTEGER;
BEGIN
    -- Get the consecutive failure count from the most recent entry
    SELECT COALESCE(consecutive_failure_count, 0)
    INTO recent_failure_count
    FROM scraping_errors
    WHERE user_id = p_user_id
    ORDER BY occurred_at DESC
    LIMIT 1;
    
    -- Return true if failure count >= 6 and the latest entry is not a success
    RETURN recent_failure_count >= 6 AND 
           EXISTS (
               SELECT 1 FROM scraping_errors 
               WHERE user_id = p_user_id 
               AND error_type != 'success'
               ORDER BY occurred_at DESC 
               LIMIT 1
           );
END;
$$ LANGUAGE plpgsql;

-- Add RLS (Row Level Security) policies if needed
-- ALTER TABLE scraping_errors ENABLE ROW LEVEL SECURITY;

-- Create policy for users to only see their own errors
-- CREATE POLICY "Users can view own errors" ON scraping_errors
--     FOR SELECT USING (auth.uid()::text = user_id);

-- Create notification deduplication table to prevent duplicate notifications
CREATE TABLE IF NOT EXISTS notification_dedup (
    id BIGSERIAL PRIMARY KEY,
    notification_id TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    notification_type TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    sent_at BIGINT NOT NULL,
    
    -- Indexes for performance
    INDEX idx_notification_dedup_user_id (user_id),
    INDEX idx_notification_dedup_sent_at (sent_at),
    INDEX idx_notification_dedup_notification_id (notification_id)
);

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON scraping_errors TO authenticated;
-- GRANT USAGE ON SEQUENCE scraping_errors_id_seq TO authenticated;
-- GRANT SELECT, INSERT, DELETE ON notification_dedup TO authenticated;
-- GRANT USAGE ON SEQUENCE notification_dedup_id_seq TO authenticated;