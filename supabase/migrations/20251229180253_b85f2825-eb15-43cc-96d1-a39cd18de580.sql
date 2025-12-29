-- ============================================================================
-- CREATOR VIDEO SYSTEM OVERHAUL: Direct Upload + Multi-Channel Architecture
-- ============================================================================

-- Step 1: Create storage bucket for creator videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'creator-videos',
  'creator-videos',
  true,
  104857600, -- 100MB limit
  ARRAY['video/mp4', 'video/quicktime', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['video/mp4', 'video/quicktime', 'video/webm'];

-- Step 2: Create storage policies for creator videos bucket
CREATE POLICY "Creators can upload their own videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'creator-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Creators can update their own videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'creator-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Creators can delete their own videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'creator-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view creator videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'creator-videos');

-- Step 3: Delete ALL existing creator video data (as requested)
DELETE FROM public.creator_video_impressions;
DELETE FROM public.creator_video_topics;
DELETE FROM public.creator_video_countries;
DELETE FROM public.creator_analytics_daily;
DELETE FROM public.ad_events;
DELETE FROM public.reward_sessions;
DELETE FROM public.creator_videos;

-- Step 4: Modify creator_videos table structure
-- Drop old columns that are no longer needed
ALTER TABLE public.creator_videos DROP COLUMN IF EXISTS embed_url;

-- Rename video_url to channel_url (now stores redirect link, not embed source)
ALTER TABLE public.creator_videos RENAME COLUMN video_url TO channel_url;

-- Add new columns for file-based video system
ALTER TABLE public.creator_videos 
  ADD COLUMN IF NOT EXISTS video_file_path TEXT,
  ADD COLUMN IF NOT EXISTS video_group_id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT DEFAULT 0;

-- Update platform column comment (now represents channel platform for redirect)
COMMENT ON COLUMN public.creator_videos.platform IS 'Channel platform for redirect: youtube, tiktok, instagram, facebook';
COMMENT ON COLUMN public.creator_videos.channel_url IS 'URL to redirect user to creator channel';
COMMENT ON COLUMN public.creator_videos.video_file_path IS 'Path to video file in creator-videos storage bucket';
COMMENT ON COLUMN public.creator_videos.video_group_id IS 'Groups records that share the same physical video file';
COMMENT ON COLUMN public.creator_videos.file_size_bytes IS 'Size of the video file in bytes';

-- Add constraint: video must be at least 15 seconds
ALTER TABLE public.creator_videos 
  DROP CONSTRAINT IF EXISTS creator_videos_min_duration;

-- Use a trigger instead of CHECK constraint for better flexibility
CREATE OR REPLACE FUNCTION public.validate_creator_video_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.duration_seconds IS NOT NULL AND NEW.duration_seconds < 15 THEN
    RAISE EXCEPTION 'Video must be at least 15 seconds long. Current duration: % seconds', NEW.duration_seconds;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS check_creator_video_duration ON public.creator_videos;
CREATE TRIGGER check_creator_video_duration
  BEFORE INSERT OR UPDATE ON public.creator_videos
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_creator_video_duration();

-- Create index for video_group_id for efficient grouping queries
CREATE INDEX IF NOT EXISTS idx_creator_videos_video_group_id 
  ON public.creator_videos(video_group_id);

-- Create index for efficient channel filtering
CREATE INDEX IF NOT EXISTS idx_creator_videos_platform_active 
  ON public.creator_videos(platform, is_active) 
  WHERE is_active = true;