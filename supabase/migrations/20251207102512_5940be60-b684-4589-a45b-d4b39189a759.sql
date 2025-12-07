-- Drop like-related tables
DROP TABLE IF EXISTS public.question_likes CASCADE;
DROP TABLE IF EXISTS public.question_dislikes CASCADE;
DROP TABLE IF EXISTS public.user_like_prompt_tracking CASCADE;

-- Drop like_count and dislike_count columns from questions table if they exist
ALTER TABLE public.questions DROP COLUMN IF EXISTS like_count;
ALTER TABLE public.questions DROP COLUMN IF EXISTS dislike_count;