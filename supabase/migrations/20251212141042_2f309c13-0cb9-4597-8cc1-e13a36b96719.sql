-- Create table for video country targeting (max 5 countries per video)
CREATE TABLE public.creator_video_countries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_video_id UUID NOT NULL REFERENCES public.creator_videos(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Each video can only have one entry per country
  CONSTRAINT creator_video_countries_unique UNIQUE (creator_video_id, country_code),
  -- Sort order must be 1-5
  CONSTRAINT creator_video_countries_sort_order_check CHECK (sort_order >= 1 AND sort_order <= 5)
);

-- Index for fast lookups by country
CREATE INDEX idx_creator_video_countries_country ON public.creator_video_countries(country_code);
CREATE INDEX idx_creator_video_countries_video ON public.creator_video_countries(creator_video_id);

-- Enable RLS
ALTER TABLE public.creator_video_countries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view countries for their own videos
CREATE POLICY "Users can view countries for their videos"
ON public.creator_video_countries
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.creator_videos
    WHERE creator_videos.id = creator_video_countries.creator_video_id
    AND creator_videos.user_id = auth.uid()
  )
);

-- Policy: Users can add countries to their videos
CREATE POLICY "Users can add countries to their videos"
ON public.creator_video_countries
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.creator_videos
    WHERE creator_videos.id = creator_video_countries.creator_video_id
    AND creator_videos.user_id = auth.uid()
  )
);

-- Policy: Users can remove countries from their videos
CREATE POLICY "Users can remove countries from their videos"
ON public.creator_video_countries
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.creator_videos
    WHERE creator_videos.id = creator_video_countries.creator_video_id
    AND creator_videos.user_id = auth.uid()
  )
);

-- Policy: Admins can view all
CREATE POLICY "Admins can view all video countries"
ON public.creator_video_countries
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy: Service role full access for edge functions
CREATE POLICY "Service role full access video countries"
ON public.creator_video_countries
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');