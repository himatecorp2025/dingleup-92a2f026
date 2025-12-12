import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify admin role
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('User auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check admin role
    const { data: roleData } = await serviceClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      console.error('User is not admin:', user.id);
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const eventType = url.searchParams.get('eventType');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    console.log('Fetching session analytics:', { startDate, endDate, eventType, page, limit });

    // Build date filter
    let dateFilter = {};
    if (startDate) {
      dateFilter = { ...dateFilter, created_at: `gte.${startDate}` };
    }

    // Fetch summary stats
    const { data: totalEvents, error: countError } = await serviceClient
      .from('app_session_events')
      .select('id', { count: 'exact', head: true });

    if (countError) {
      console.error('Count error:', countError);
    }

    // Fetch unique users count
    const { data: uniqueUsersData } = await serviceClient
      .rpc('count_distinct_users_sessions');

    // Fetch event type breakdown
    const { data: eventBreakdown } = await serviceClient
      .from('app_session_events')
      .select('event_type')
      .then(async (result) => {
        if (result.error) return { data: [] };
        const counts: Record<string, number> = {};
        result.data?.forEach((row: { event_type: string }) => {
          counts[row.event_type] = (counts[row.event_type] || 0) + 1;
        });
        return { 
          data: Object.entries(counts).map(([event_type, count]) => ({ event_type, count }))
            .sort((a, b) => b.count - a.count)
        };
      });

    // Fetch average session duration
    const { data: avgDurationData } = await serviceClient
      .from('app_session_events')
      .select('session_duration_seconds')
      .not('session_duration_seconds', 'is', null);

    let avgDuration = 0;
    if (avgDurationData && avgDurationData.length > 0) {
      const validDurations = avgDurationData.filter((d: { session_duration_seconds: number | null }) => d.session_duration_seconds !== null);
      if (validDurations.length > 0) {
        avgDuration = validDurations.reduce((sum: number, d: { session_duration_seconds: number }) => sum + d.session_duration_seconds, 0) / validDurations.length;
      }
    }

    // Fetch PWA installs
    const { data: pwaInstalls } = await serviceClient
      .from('app_session_events')
      .select('id', { count: 'exact', head: true })
      .in('event_type', ['app_installed', 'app_launched_standalone']);

    // Fetch daily trend (last 14 days)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    
    const { data: dailyTrendRaw } = await serviceClient
      .from('app_session_events')
      .select('created_at, event_type')
      .gte('created_at', fourteenDaysAgo.toISOString())
      .eq('event_type', 'app_opened');

    // Group by date
    const dailyTrend: Record<string, number> = {};
    dailyTrendRaw?.forEach((row: { created_at: string }) => {
      const date = row.created_at.split('T')[0];
      dailyTrend[date] = (dailyTrend[date] || 0) + 1;
    });

    const dailyTrendArray = Object.entries(dailyTrend)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Fetch hourly heatmap data
    const { data: hourlyDataRaw } = await serviceClient
      .from('app_session_events')
      .select('created_at')
      .eq('event_type', 'app_opened');

    const hourlyHeatmap: number[][] = Array(7).fill(null).map(() => Array(24).fill(0));
    hourlyDataRaw?.forEach((row: { created_at: string }) => {
      const date = new Date(row.created_at);
      const day = date.getDay();
      const hour = date.getHours();
      hourlyHeatmap[day][hour]++;
    });

    // Fetch detailed events with pagination
    let query = serviceClient
      .from('app_session_events')
      .select(`
        id,
        user_id,
        event_type,
        session_id,
        session_duration_seconds,
        device_type,
        browser,
        os_version,
        screen_size,
        country_code,
        city,
        created_at
      `)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (eventType && eventType !== 'all') {
      query = query.eq('event_type', eventType);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: events, error: eventsError } = await query;

    if (eventsError) {
      console.error('Events fetch error:', eventsError);
    }

    // Fetch usernames for the events
    const userIds = [...new Set(events?.map((e: { user_id: string }) => e.user_id) || [])];
    const { data: profiles } = await serviceClient
      .from('profiles')
      .select('id, username')
      .in('id', userIds);

    const usernameMap: Record<string, string> = {};
    profiles?.forEach((p: { id: string; username: string }) => {
      usernameMap[p.id] = p.username;
    });

    // Enrich events with usernames
    const enrichedEvents = events?.map((e: { user_id: string }) => ({
      ...e,
      username: usernameMap[e.user_id] || 'Unknown'
    }));

    // Fetch archive stats
    const { count: archiveCount } = await serviceClient
      .from('app_session_events_archive')
      .select('id', { count: 'exact', head: true });

    const response = {
      summary: {
        totalEvents: totalEvents || 0,
        uniqueUsers: uniqueUsersData || 0,
        avgSessionDuration: Math.round(avgDuration),
        pwaInstalls: pwaInstalls || 0,
        archivedEvents: archiveCount || 0,
      },
      eventBreakdown: eventBreakdown || [],
      dailyTrend: dailyTrendArray,
      hourlyHeatmap,
      events: enrichedEvents || [],
      pagination: {
        page,
        limit,
        hasMore: (events?.length || 0) === limit,
      },
    };

    console.log('Session analytics fetched successfully');

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Session analytics error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
