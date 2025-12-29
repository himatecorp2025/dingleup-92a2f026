import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';

const corsHeaders = getCorsHeaders('*');

// Complete tables list in FK dependency order - updated 2025-12-29 - 99 tables
const TABLES = [
  // Level 0: No foreign keys - base/config tables (17 tables)
  'topics', 'booster_types', 'legal_documents', 'translations', 'daily_prize_table',
  'weekly_prize_table', 'weekly_login_rewards', 'data_collection_metadata', 
  'engagement_analytics', 'performance_summary', 'rpc_rate_limits',
  'daily_winner_processing_log', 'app_download_links', 'retention_analytics', 
  'tips_tricks_videos', 'subscription_promo_events', 'creator_plans',
  
  // Level 1: Depends on Level 0 (3 tables)
  'profiles', 'questions', 'question_pools',
  
  // Level 2: Depends on profiles (user_id references) (32 tables)
  'user_roles', 'password_history', 'pin_reset_tokens', 'login_attempts', 'login_attempts_pin',
  'question_translations', 'wallet_ledger', 'wallet_ledger_archive',
  'lives_ledger', 'lives_ledger_archive', 'tutorial_progress', 'user_presence', 'speed_tokens',
  'user_sessions', 'user_game_settings', 'user_topic_stats', 'user_ad_interest_candidates',
  'user_cohorts', 'user_engagement_scores', 'user_journey_analytics',
  'user_activity_daily', 'user_activity_pings',
  'question_seen_history', 'subscribers', 'welcome_bonus_attempts', 'typing_status',
  'creator_subscriptions', 'creator_channels', 'creator_admin_notes', 'creator_audit_log',
  'reward_sessions',
  
  // Level 3: Depends on Level 2 (20 tables)
  'game_results', 'game_sessions', 'game_session_pools', 'friendships', 'invitations',
  'daily_rankings', 'global_leaderboard', 
  'leaderboard_cache', 'leaderboard_public_cache', 
  'daily_leaderboard_snapshot',
  'daily_winner_awarded', 'weekly_winner_awarded', 'daily_winners_popup_views',
  'daily_winner_popup_shown', 'weekly_login_state',
  'booster_purchases', 'friend_request_rate_limit', 'admin_audit_log',
  'creator_videos', 'video_ad_rewards',
  
  // Level 4: Depends on Level 3 (10 tables)
  'game_question_analytics', 'game_question_analytics_archive', 'game_help_usage', 
  'game_exit_events', 'dm_threads',
  'creator_video_countries', 'creator_video_topics', 'creator_video_impressions',
  'creator_analytics_daily', 'ad_events',
  
  // Level 5: Depends on Level 4 (4 tables)
  'dm_messages', 'message_reads', 'messages', 'thread_participants',
  
  // Level 6: Depends on Level 5 (2 tables)
  'message_media', 'message_reactions',
  
  // Analytics tables - no strict FK dependencies (12 tables)
  'app_session_events', 'app_session_events_archive', 'navigation_events', 
  'feature_usage_events', 'feature_usage_events_archive',
  'bonus_claim_events', 'chat_interaction_events', 'conversion_events', 
  'error_logs', 'performance_metrics', 'device_geo_analytics', 
  'session_details', 'reports',
];

// Sensitive fields to mask (for security)
const SENSITIVE_FIELDS = ['pin_hash', 'password_hash', 'access_token', 'refresh_token'];

const PAGE_SIZE = 1000;

interface TableInfo {
  name: string;
  rowCount: number;
  columns: string[];
}

interface ExportSchema {
  export_version: string;
  created_at: string;
  environment: string;
  supabase_project_id: string;
  tables: TableInfo[];
  total_rows: number;
}

// deno-lint-ignore no-explicit-any
async function createExportBundle(
  supabase: any,
  onProgress?: (progress: number, tableName: string) => void
): Promise<{ schema: ExportSchema; tableData: Record<string, unknown[]> }> {
  const schema: ExportSchema = {
    export_version: '2.0.0',
    created_at: new Date().toISOString(),
    environment: 'production',
    supabase_project_id: 'wdpxmwsxhckazwxufttk',
    tables: [],
    total_rows: 0,
  };

  const tableData: Record<string, unknown[]> = {};
  let totalRows = 0;
  let processedTables = 0;

  for (const tableName of TABLES) {
    console.log(`[ZIP Export] Processing table: ${tableName}`);
    
    try {
      // Fetch all data with pagination
      const allRows: unknown[] = [];
      let offset = 0;
      let columns: string[] = [];

      while (true) {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .range(offset, offset + PAGE_SIZE - 1);

        if (error) {
          console.log(`[ZIP Export] Table ${tableName} error: ${error.message}`);
          break;
        }

        if (!data || data.length === 0) {
          if (offset === 0) {
            // Empty table, just record columns from schema if available
            console.log(`[ZIP Export] Table ${tableName} is empty`);
          }
          break;
        }

        // Get columns from first row
        if (offset === 0 && data.length > 0) {
          columns = Object.keys(data[0] as Record<string, unknown>);
        }

        // Mask sensitive fields
        const maskedData = data.map((row: Record<string, unknown>) => {
          const maskedRow = { ...row };
          for (const field of SENSITIVE_FIELDS) {
            if (field in maskedRow) {
              maskedRow[field] = '[REDACTED]';
            }
          }
          return maskedRow;
        });

        allRows.push(...maskedData);
        offset += data.length;

        if (data.length < PAGE_SIZE) break;
      }

      // Store table info
      schema.tables.push({
        name: tableName,
        rowCount: allRows.length,
        columns: columns,
      });

      tableData[tableName] = allRows;
      totalRows += allRows.length;

      processedTables++;
      if (onProgress) {
        onProgress((processedTables / TABLES.length) * 100, tableName);
      }

    } catch (err) {
      console.error(`[ZIP Export] Error processing ${tableName}:`, err);
      schema.tables.push({
        name: tableName,
        rowCount: 0,
        columns: [],
      });
    }
  }

  schema.total_rows = totalRows;
  return { schema, tableData };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req.headers.get('origin'));
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    let userId: string | null = null;
    try {
      const payloadPart = token.split('.')[1];
      const payloadJson = atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/'));
      userId = JSON.parse(payloadJson).sub ?? null;
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JWT token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Invalid user in token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Admin check
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminRole) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`[ZIP Export] Starting full database export for admin: ${userId}`);
    const startTime = Date.now();

    // Create export bundle
    const { schema, tableData } = await createExportBundle(supabase);

    // Create a JSON bundle that simulates ZIP structure
    // Format: { schema.json content, data/tableName.json for each table }
    const exportBundle = {
      'schema.json': schema,
      data: tableData,
    };

    const jsonOutput = JSON.stringify(exportBundle, null, 2);
    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`[ZIP Export] Complete in ${elapsedSeconds}s - ${schema.tables.length} tables, ${schema.total_rows} total rows`);

    // Return as downloadable JSON (client can parse and create actual ZIP if needed)
    const timestamp = new Date().toISOString().split('T')[0];
    
    return new Response(jsonOutput, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="dingleup_export_${timestamp}.json"`,
        'X-Export-Tables': String(schema.tables.length),
        'X-Export-Rows': String(schema.total_rows),
        'X-Export-Duration': elapsedSeconds,
      },
    });

  } catch (error) {
    console.error('[ZIP Export] Fatal error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
