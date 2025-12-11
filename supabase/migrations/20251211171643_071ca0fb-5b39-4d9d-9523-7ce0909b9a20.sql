-- Add creator display name column to creator_videos
ALTER TABLE public.creator_videos
ADD COLUMN IF NOT EXISTS creator_name TEXT;

-- Add comment for the column
COMMENT ON COLUMN public.creator_videos.creator_name IS 'Display name of the creator shown during video playback';