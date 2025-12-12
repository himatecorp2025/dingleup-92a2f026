-- =============================================
-- PERFORMANCE OPTIMIZATION: Indexes
-- Target: 1000+ users/minute sustained capacity
-- =============================================

-- 1. COMPOUND INDEXES for critical queries
-- =============================================

-- wallet_ledger: user + created_at for history queries
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user_created 
ON public.wallet_ledger (user_id, created_at DESC);

-- lives_ledger: user + created_at for history queries  
CREATE INDEX IF NOT EXISTS idx_lives_ledger_user_created
ON public.lives_ledger (user_id, created_at DESC);

-- game_results: user + completed + created_at for leaderboard
CREATE INDEX IF NOT EXISTS idx_game_results_user_completed_created
ON public.game_results (user_id, completed, created_at DESC);

-- daily_rankings: day + category + rank for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_daily_rankings_day_category_rank
ON public.daily_rankings (day_date, category, rank ASC);

-- profiles: country + updated for leaderboard grouping
CREATE INDEX IF NOT EXISTS idx_profiles_country_updated
ON public.profiles (country_code, updated_at DESC) WHERE country_code IS NOT NULL;

-- game_sessions: user + expires for cleanup queries
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_expires
ON public.game_sessions (user_id, expires_at) WHERE completed_at IS NULL;

-- creator_videos: active + country targeting
CREATE INDEX IF NOT EXISTS idx_creator_videos_active_status
ON public.creator_videos (is_active, status, expires_at) WHERE is_active = true;

-- reward_sessions: user + status for pending rewards
CREATE INDEX IF NOT EXISTS idx_reward_sessions_user_status
ON public.reward_sessions (user_id, status) WHERE status = 'pending';

-- 2. PARTIAL INDEXES for hot paths
-- =============================================

-- Today's rankings only (static date condition for index)
CREATE INDEX IF NOT EXISTS idx_daily_rankings_mixed_category
ON public.daily_rankings (user_id, total_correct_answers DESC, average_response_time ASC)
WHERE category = 'mixed';

-- 3. BRIN INDEXES for time-series data (very efficient for large tables)
-- =============================================

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_created_brin
ON public.wallet_ledger USING BRIN (created_at);

CREATE INDEX IF NOT EXISTS idx_lives_ledger_created_brin
ON public.lives_ledger USING BRIN (created_at);

CREATE INDEX IF NOT EXISTS idx_game_results_created_brin
ON public.game_results USING BRIN (created_at);

CREATE INDEX IF NOT EXISTS idx_app_session_events_created_brin
ON public.app_session_events USING BRIN (created_at);

-- 4. COVERING INDEXES for common SELECT patterns
-- =============================================

-- Leaderboard query: avoid table lookup
CREATE INDEX IF NOT EXISTS idx_daily_rankings_leaderboard_covering
ON public.daily_rankings (day_date, category, rank)
INCLUDE (user_id, total_correct_answers, average_response_time);

-- Profile lookup for game: avoid full row fetch
CREATE INDEX IF NOT EXISTS idx_profiles_game_covering
ON public.profiles (id)
INCLUDE (username, lives, coins, max_lives, avatar_url, country_code);

-- 5. ANALYZE tables for query planner
-- =============================================

ANALYZE public.profiles;
ANALYZE public.wallet_ledger;
ANALYZE public.lives_ledger;
ANALYZE public.game_results;
ANALYZE public.daily_rankings;
ANALYZE public.game_sessions;
ANALYZE public.creator_videos;
ANALYZE public.reward_sessions;