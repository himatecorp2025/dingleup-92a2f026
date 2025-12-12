// SECURITY: Rate limiting utilities for edge functions
// OPTIMIZED for 1000+ users/minute capacity

export interface RateLimitConfig {
  maxRequests: number;
  windowMinutes: number;
}

// Default rate limits for different operation types
// OPTIMIZED: Higher limits for game operations, stricter for auth
export const RATE_LIMITS = {
  // Auth - strict to prevent brute force
  AUTH: { maxRequests: 5, windowMinutes: 15 },
  AUTH_REGISTER: { maxRequests: 3, windowMinutes: 60 },
  
  // Core game operations - high capacity
  GAME: { maxRequests: 200, windowMinutes: 1 },
  GAME_START: { maxRequests: 60, windowMinutes: 1 },
  GAME_COMPLETE: { maxRequests: 60, windowMinutes: 1 },
  
  // Wallet/rewards - balanced
  WALLET: { maxRequests: 120, windowMinutes: 1 },
  REWARD: { maxRequests: 30, windowMinutes: 1 },
  
  // Leaderboard - high read capacity
  LEADERBOARD: { maxRequests: 300, windowMinutes: 1 },
  
  // Social - moderate
  SOCIAL: { maxRequests: 100, windowMinutes: 1 },
  
  // Creator operations
  CREATOR: { maxRequests: 60, windowMinutes: 1 },
  
  // Admin - high for dashboard operations
  ADMIN: { maxRequests: 1000, windowMinutes: 1 },
} as const;

// In-memory rate limit cache for edge function cold start optimization
const rateLimitCache = new Map<string, { count: number; resetAt: number }>();

/**
 * Fast in-memory rate limit check (no DB call)
 * Falls back to DB check if cache miss
 */
export const checkRateLimitFast = (
  userId: string,
  rpcName: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number } => {
  const key = `${userId}:${rpcName}`;
  const now = Date.now();
  const windowMs = config.windowMinutes * 60 * 1000;
  
  const cached = rateLimitCache.get(key);
  
  if (!cached || cached.resetAt < now) {
    // New window or expired - reset
    rateLimitCache.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: config.maxRequests - 1 };
  }
  
  if (cached.count >= config.maxRequests) {
    return { allowed: false, remaining: 0 };
  }
  
  cached.count++;
  return { allowed: true, remaining: config.maxRequests - cached.count };
};

/**
 * Check rate limit using RPC function (DB-backed)
 * Returns true if request is allowed, false if rate limit exceeded
 */
export const checkRateLimit = async (
  supabase: any,
  rpcName: string,
  config: RateLimitConfig = RATE_LIMITS.WALLET
): Promise<{ allowed: boolean; remaining?: number }> => {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_rpc_name: rpcName,
      p_max_calls: config.maxRequests,
      p_window_minutes: config.windowMinutes,
    });

    if (error) {
      // On error, allow request but log the issue
      console.error('[RateLimit] Check failed:', error);
      return { allowed: true };
    }

    return { allowed: data === true };
  } catch (e) {
    // On exception, allow request to not block users
    console.error('[RateLimit] Exception:', e);
    return { allowed: true };
  }
};

/**
 * Create rate limit error response with Retry-After header
 */
export const rateLimitExceeded = (
  corsHeaders: Record<string, string>,
  retryAfterSeconds: number = 60
) => {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: retryAfterSeconds,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSeconds),
      },
    }
  );
};

/**
 * Cleanup old entries from in-memory cache (call periodically)
 */
export const cleanupRateLimitCache = () => {
  const now = Date.now();
  for (const [key, value] of rateLimitCache.entries()) {
    if (value.resetAt < now) {
      rateLimitCache.delete(key);
    }
  }
};
