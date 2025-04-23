-- Create obsidian_links table
CREATE TABLE public.obsidian_links (
    id TEXT PRIMARY KEY,
    address TEXT NOT NULL,
    expiration_time BIGINT NOT NULL,
    telegram_ids TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS (Row Level Security) policies to control access
ALTER TABLE public.obsidian_links ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows service role access for all operations
CREATE POLICY "Service role access" ON public.obsidian_links
    USING (true)
    WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX idx_obsidian_links_expiration ON public.obsidian_links(expiration_time);

-- You might want a function to automatically clean up expired links
CREATE OR REPLACE FUNCTION delete_expired_links()
RETURNS void AS $$
BEGIN
    DELETE FROM public.obsidian_links
    WHERE expiration_time < EXTRACT(EPOCH FROM NOW()) * 1000;
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a cron job to run the cleanup function daily
-- You'll need the pg_cron extension for this
-- COMMENT OUT if you don't have pg_cron or don't want scheduled cleanup
/*
SELECT cron.schedule(
    'cleanup-expired-links',
    '0 0 * * *',  -- Run at midnight every day
    $$SELECT delete_expired_links();$$
);
*/
