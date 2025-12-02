import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';

const corsHeaders = getCorsHeaders('*');

// Tables in STRICT foreign key dependency order
// Tables with NO foreign keys come first, then tables that depend on them
// This ensures CREATE/INSERT order is always valid
const TABLES = [
  // ========== LEVEL 0: No foreign keys (standalone tables) ==========
  'topics',
  'booster_types',
  'legal_documents',
  'translations',
  'daily_prize_table',
  'data_collection_metadata',
  'engagement_analytics',
  'performance_summary',
  'rpc_rate_limits',
  'daily_winner_processing_log',
  'app_download_links',
  
  // ========== LEVEL 1: Depends only on Level 0 or self-referencing ==========
  // profiles has NO FK to auth.users in public schema export
  'profiles',
  
  // questions depends on topics
  'questions',
  
  // ========== LEVEL 2: Depends on Level 1 ==========
  // user_roles depends on profiles (user_id)
  'user_roles',
  
  // password_history depends on profiles
  'password_history',
  
  // pin_reset_tokens depends on profiles
  'pin_reset_tokens',
  
  // login_attempts - no FK, just email key
  'login_attempts',
  'login_attempts_pin',
  
  // question_pools depends on topics
  'question_pools',
  
  // question_translations depends on questions
  'question_translations',
  
  // wallet_ledger depends on profiles
  'wallet_ledger',
  'wallet_ledger_archive',
  
  // lives_ledger depends on profiles
  'lives_ledger',
  'lives_ledger_archive',
  
  // tutorial_progress depends on profiles
  'tutorial_progress',
  
  // user_presence depends on profiles
  'user_presence',
  
  // ========== LEVEL 3: Depends on Level 2 ==========
  // game_results depends on profiles
  'game_results',
  
  // game_sessions depends on profiles
  'game_sessions',
  
  // game_session_pools depends on profiles
  'game_session_pools',
  
  // friendships depends on profiles (user_id_a, user_id_b)
  'friendships',
  
  // invitations depends on profiles (inviter_id, invited_user_id)
  'invitations',
  
  // daily_rankings depends on profiles
  'daily_rankings',
  
  // global_leaderboard depends on profiles
  'global_leaderboard',
  
  // leaderboard_cache - no FK, cache table
  'leaderboard_cache',
  'leaderboard_public_cache',
  
  // daily_leaderboard_snapshot depends on profiles
  'daily_leaderboard_snapshot',
  
  // daily_winner_awarded depends on profiles
  'daily_winner_awarded',
  
  // daily_winners_popup_views depends on profiles
  'daily_winners_popup_views',
  
  // daily_winner_popup_shown depends on profiles
  'daily_winner_popup_shown',
  
  // lootbox_instances depends on profiles
  'lootbox_instances',
  
  // lootbox_daily_plan depends on profiles
  'lootbox_daily_plan',
  
  // purchases depends on profiles
  'purchases',
  
  // booster_purchases depends on profiles AND booster_types
  'booster_purchases',
  
  // question_likes depends on profiles and questions
  'question_likes',
  
  // question_reactions depends on profiles
  'question_reactions',
  
  // like_prompt_tracking depends on profiles
  'like_prompt_tracking',
  
  // friend_request_rate_limit depends on profiles
  'friend_request_rate_limit',
  
  // ========== LEVEL 4: Depends on Level 3 ==========
  // game_question_analytics depends on profiles AND game_results
  'game_question_analytics',
  
  // game_help_usage depends on profiles AND game_results
  'game_help_usage',
  
  // dm_threads depends on profiles (user_id_a, user_id_b)
  'dm_threads',
  
  // conversations depends on profiles
  'conversations',
  
  // ========== LEVEL 5: Depends on Level 4 ==========
  // dm_messages depends on dm_threads
  'dm_messages',
  
  // message_reads depends on dm_threads
  'message_reads',
  
  // conversation_members depends on conversations
  'conversation_members',
  
  // messages depends on conversations
  'messages',
  
  // ========== LEVEL 6: Depends on Level 5 ==========
  // message_media depends on dm_messages
  'message_media',
  
  // message_reactions (chat) depends on dm_messages
  'message_reactions',
  
  // ========== ANALYTICS TABLES (no critical FKs, safe to insert last) ==========
  'app_session_events',
  'navigation_events',
  'feature_usage_events',
  'game_exit_events',
  'bonus_claim_events',
  'chat_interaction_events',
  'conversion_events',
  'error_logs',
  'performance_metrics',
  'device_geo_analytics',
  
  // reports depends on profiles
  'reports',
];

function escapeSqlValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';

  if (typeof value === 'boolean') return value ? 'true' : 'false';

  if (typeof value === 'number') return value.toString();

  // Dates come as strings from Supabase client
  if (typeof value === 'string') {
    return `'${value.replace(/'/g, "''")}'`;
  }

  // JSON / objects
  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }

  return `'${String(value).replace(/'/g, "''")}'`;
}

function generateInsert(tableName: string, row: Record<string, unknown>, columns: string[]): string {
  const values = columns.map((col) => escapeSqlValue(row[col])).join(', ');
  return `INSERT INTO public.${tableName} (${columns.join(', ')}) VALUES (${values});`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req.headers.get('origin'));
  }

  try {
    // Get JWT token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Decode JWT to get user id (sub)
    let userId: string | null = null;
    try {
      const payloadPart = token.split('.')[1];
      const payloadJson = atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(payloadJson);
      userId = payload.sub ?? null;
    } catch (e) {
      console.error('Failed to decode JWT payload:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid JWT token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Invalid user in token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Backend admin check using user_roles table
    const { data: adminRole, error: adminError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (adminError) {
      console.error('Admin role check error:', adminError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify admin role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log('Starting full database export for admin user:', userId);

    let output = '';

    output += `-- ============================================\n`;
    output += `-- DingleUP! Full Database Export\n`;
    output += `-- ============================================\n`;
    output += `-- Generated: ${new Date().toISOString()}\n`;
    output += `-- Source: Lovable Cloud\n`;
    output += `-- Tables are ordered by foreign key dependencies\n`;
    output += `-- ============================================\n\n`;

    output += `-- ============================================\n`;
    output += `-- INSTRUCTIONS FOR IMPORT\n`;
    output += `-- ============================================\n`;
    output += `-- 1. Create a fresh PostgreSQL database\n`;
    output += `-- 2. Apply the schema first:\n`;
    output += `--    psql -U postgres -d dingleup -f db/schema_latest.sql\n`;
    output += `-- 3. Then import this data file:\n`;
    output += `--    psql -U postgres -d dingleup -f this_file.sql\n`;
    output += `-- 4. Verify import:\n`;
    output += `--    psql -U postgres -d dingleup -c "SELECT COUNT(*) FROM profiles;"\n`;
    output += `--\n`;
    output += `-- NOTE: This export is FULLY STANDALONE.\n`;
    output += `-- - NO auth.users dependency (profiles.id are plain UUIDs)\n`;
    output += `-- - Foreign key checks DISABLED during import\n`;
    output += `-- - Triggers DISABLED during import for performance\n`;
    output += `-- - Tables ordered by FK dependencies (no constraint violations)\n`;
    output += `-- ============================================\n\n`;

    // Start transaction
    output += `BEGIN;\n\n`;

    // CRITICAL: Disable all foreign key checks and triggers for the session
    output += `-- ============================================\n`;
    output += `-- DISABLE FK CHECKS AND TRIGGERS FOR IMPORT\n`;
    output += `-- ============================================\n`;
    output += `-- This allows importing in any order without FK violations\n`;
    output += `SET session_replication_role = 'replica';\n`;
    output += `SET CONSTRAINTS ALL DEFERRED;\n\n`;

    const PAGE_SIZE = 1000;
    const exportedTables: string[] = [];

    for (const table of TABLES) {
      console.log(`Exporting table: ${table}`);

      let offset = 0;
      let totalRows = 0;
      let columns: string[] | null = null;

      while (true) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .range(offset, offset + PAGE_SIZE - 1);

        if (error) {
          console.error(`Error exporting ${table} (offset ${offset}):`, error);
          // Include error as SQL comment so export remains usable
          if (totalRows === 0) {
            output += `-- SKIPPED table ${table}: ${error.message}\n\n`;
          } else {
            output += `-- ERROR exporting additional rows for table ${table} at offset ${offset}: ${error.message}\n`;
          }
          break;
        }

        if (!data || data.length === 0) {
          if (totalRows === 0) {
            output += `-- Table ${table} is empty\n\n`;
          }
          break;
        }

        if (!columns) {
          // First non-empty page: initialize columns
          columns = Object.keys(data[0]);

          output += `-- ============================================\n`;
          output += `-- Table: ${table}\n`;
          output += `-- ============================================\n`;
          
          // Truncate existing data to allow re-import
          output += `TRUNCATE TABLE public.${table} CASCADE;\n`;
          
          exportedTables.push(table);
        }

        for (const row of data as Record<string, unknown>[]) {
          output += generateInsert(table, row, columns) + '\n';
        }

        totalRows += data.length;
        offset += data.length;

        if (data.length < PAGE_SIZE) {
          // Last page for this table
          break;
        }
      }

      if (totalRows > 0) {
        output += `-- Exported ${totalRows} rows\n\n`;
      }
    }

    // Re-enable FK checks and triggers
    output += `-- ============================================\n`;
    output += `-- RE-ENABLE FK CHECKS AND TRIGGERS\n`;
    output += `-- ============================================\n`;
    output += `SET session_replication_role = 'origin';\n\n`;

    // Commit transaction
    output += `COMMIT;\n\n`;

    // Summary
    output += `-- ============================================\n`;
    output += `-- EXPORT SUMMARY\n`;
    output += `-- ============================================\n`;
    output += `-- Tables with data: ${exportedTables.length}\n`;
    output += `-- Exported tables: ${exportedTables.join(', ')}\n`;
    output += `-- Export completed successfully!\n`;

    console.log('Export completed, size (chars):', output.length);

    return new Response(output, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="dingleup_full_export_${new Date()
          .toISOString()
          .split('T')[0]}.sql"`,
      },
    });
  } catch (error) {
    console.error('Unexpected error in export-full-database function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
