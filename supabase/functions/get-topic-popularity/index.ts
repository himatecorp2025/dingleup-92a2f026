import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Authenticate user (admin only)
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: userRole, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !userRole) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all topics
    const { data: topics, error: topicsError } = await supabaseClient
      .from('topics')
      .select('id, name, description');

    if (topicsError) {
      throw topicsError;
    }

    // Get game results to count plays by category
    const { data: gameResults, error: gamesError } = await supabaseClient
      .from('game_results')
      .select('category')
      .eq('completed', true);

    if (gamesError) {
      throw gamesError;
    }

    // Aggregate play counts by category/topic
    const topicPlayCounts = new Map<string, number>();
    gameResults?.forEach((g) => {
      if (g.category) {
        topicPlayCounts.set(g.category, (topicPlayCounts.get(g.category) || 0) + 1);
      }
    });

    // Build response
    const popularityData = topics?.map((topic) => {
      return {
        topic_id: topic.id,
        topic_name: topic.name,
        topic_description: topic.description,
        play_count: topicPlayCounts.get(topic.name) || 0,
        question_count: 0, // Will be populated if needed
      };
    }) || [];

    // Sort by play count descending
    popularityData.sort((a, b) => b.play_count - a.play_count);

    return new Response(
      JSON.stringify({
        success: true,
        topics: popularityData,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
