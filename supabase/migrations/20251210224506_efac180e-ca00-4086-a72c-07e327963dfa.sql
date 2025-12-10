-- Create creator_plans table
CREATE TABLE IF NOT EXISTS public.creator_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  video_limit INTEGER NOT NULL,
  monthly_price_huf INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creator_plans ENABLE ROW LEVEL SECURITY;

-- Public read access for active plans
CREATE POLICY "Anyone can view active creator plans"
ON public.creator_plans
FOR SELECT
USING (is_active = true);

-- Admin full access
CREATE POLICY "Admins can manage creator plans"
ON public.creator_plans
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed the 4 packages
INSERT INTO public.creator_plans (id, name, description, video_limit, monthly_price_huf, is_active, sort_order)
VALUES
  ('starter', 'Starter', '1 videó egyszerre aktív', 1, 1490, true, 1),
  ('plus', 'Plus', '3 videó egyszerre aktív', 3, 2990, true, 2),
  ('pro', 'Pro', '5 videó egyszerre aktív', 5, 4990, true, 3),
  ('max', 'Max', '10 videó egyszerre aktív', 10, 7990, true, 4)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  video_limit = EXCLUDED.video_limit,
  monthly_price_huf = EXCLUDED.monthly_price_huf,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- Add creator fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_creator BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS creator_plan_id TEXT REFERENCES public.creator_plans(id),
ADD COLUMN IF NOT EXISTS creator_subscription_status TEXT NOT NULL DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS creator_trial_ends_at TIMESTAMP WITH TIME ZONE;

-- Add check constraint for subscription status
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_creator_subscription_status_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_creator_subscription_status_check
CHECK (creator_subscription_status IN ('inactive', 'active_trial', 'active_paid', 'canceled'));