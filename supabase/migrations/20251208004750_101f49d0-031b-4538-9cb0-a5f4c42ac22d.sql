
-- Remove like/dislike columns from user_topic_stats
ALTER TABLE public.user_topic_stats DROP COLUMN IF EXISTS like_count;
ALTER TABLE public.user_topic_stats DROP COLUMN IF EXISTS dislike_count;

-- Drop like/dislike related functions
DROP FUNCTION IF EXISTS public.sync_question_like_count() CASCADE;
DROP FUNCTION IF EXISTS public.sync_question_dislike_count() CASCADE;
DROP FUNCTION IF EXISTS public.update_like_prompt_tracking_updated_at() CASCADE;

-- Drop like_prompt_tracking table if exists
DROP TABLE IF EXISTS public.like_prompt_tracking CASCADE;

-- Drop question_likes and question_dislikes tables if they exist
DROP TABLE IF EXISTS public.question_likes CASCADE;
DROP TABLE IF EXISTS public.question_dislikes CASCADE;

-- Remove like_count from questions table if exists
ALTER TABLE public.questions DROP COLUMN IF EXISTS like_count;
ALTER TABLE public.questions DROP COLUMN IF EXISTS dislike_count;
