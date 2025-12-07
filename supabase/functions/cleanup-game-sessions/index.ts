// PHASE 2 OPTIMIZATION: Cleanup old game sessions
// Runs every hour to prevent game_sessions table bloat
//
// TODO FUTURE CLEANUP JOBS (NOT IMPLEMENTED YET):
// - Add cron job for cleanup_expired_speed_tokens() (remove expired speed tokens)
// - These cleanup functions exist but are not yet scheduled via Supabase cron
// - Without scheduled cleanup, tables will accumulate expired records over time
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    console.log('[cleanup-game-sessions] Starting cleanup...');
    const startTime = Date.now();

    const { data, error } = await supabase.rpc('cleanup_completed_game_sessions');
    
    if (error) {
      console.error('[cleanup-game-sessions] Error:', error);
      throw error;
    }

    const elapsed = Date.now() - startTime;
    console.log(`[cleanup-game-sessions] ✅ Cleaned up ${data.deleted_completed} sessions in ${elapsed}ms`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        elapsed_ms: elapsed,
        ...data
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[cleanup-game-sessions] Failed:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
