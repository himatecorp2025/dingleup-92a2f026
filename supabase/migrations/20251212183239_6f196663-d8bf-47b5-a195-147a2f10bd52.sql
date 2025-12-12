-- Allow admins to see ALL creator videos on admin pages
CREATE POLICY "Admins can view all creator videos"
ON public.creator_videos
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
);
