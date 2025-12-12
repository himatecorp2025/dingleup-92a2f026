-- Create helper function for counting distinct users in sessions
CREATE OR REPLACE FUNCTION public.count_distinct_users_sessions()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT user_id)::integer FROM app_session_events;
$$;