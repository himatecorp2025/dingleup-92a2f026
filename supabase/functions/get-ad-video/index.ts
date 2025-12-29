import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VideoRequest {
  context: 'daily_gift' | 'game_end' | 'refill';
  exclude_video_ids?: string[];
  exclude_creator_ids?: string[];
}

interface CreatorVideo {
  id: string;
  video_file_path: string;
  channel_url: string;
  platform: string;
  duration_seconds: number | null;
  creator_id: string;
  topics: number[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.sub;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: VideoRequest = await req.json();
    const { context, exclude_video_ids = [], exclude_creator_ids = [] } = body;

    console.log(`[get-ad-video] User ${userId}, context: ${context}`);

    // Get user's country for filtering
    const { data: userProfile } = await supabaseClient
      .from('profiles')
      .select('country_code')
      .eq('id', userId)
      .single();
    
    const userCountry = userProfile?.country_code || null;
    console.log(`[get-ad-video] User country: ${userCountry || 'none'}`);

    // Get user's top 3 topics (if they have 100+ answered questions)
    const { data: topicStats, error: topicError } = await supabaseClient
      .from('user_topic_stats')
      .select('topic_id, correct_count')
      .eq('user_id', userId)
      .order('correct_count', { ascending: false })
      .limit(10);

    let userTopTopics: number[] = [];
    let totalAnswered = 0;

    if (!topicError && topicStats) {
      totalAnswered = topicStats.reduce((sum, t) => sum + (t.correct_count || 0), 0);
      if (totalAnswered >= 100) {
        userTopTopics = topicStats.slice(0, 3).map(t => t.topic_id);
      }
    }

    console.log(`[get-ad-video] User has ${totalAnswered} correct answers, top topics: ${userTopTopics.join(',')}`);

    // Get active creator videos with valid file paths
    const now = new Date().toISOString();
    
    let query = supabaseClient
      .from('creator_videos')
      .select(`
        id,
        video_file_path,
        channel_url,
        platform,
        duration_seconds,
        user_id,
        creator_video_topics(topic_id)
      `)
      .eq('is_active', true)
      .gt('expires_at', now)
      .not('video_file_path', 'is', null);

    // Exclude already shown videos
    if (exclude_video_ids.length > 0) {
      query = query.not('id', 'in', `(${exclude_video_ids.join(',')})`);
    }

    // Exclude creators already shown
    if (exclude_creator_ids.length > 0) {
      query = query.not('user_id', 'in', `(${exclude_creator_ids.join(',')})`);
    }

    const { data: videos, error: videosError } = await query;

    if (videosError) {
      console.error('[get-ad-video] Error fetching videos:', videosError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch videos' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!videos || videos.length === 0) {
      console.log('[get-ad-video] No active videos available');
      return new Response(
        JSON.stringify({ available: false, video: null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter by active creator subscriptions
    const creatorIds = [...new Set(videos.map(v => v.user_id))];
    
    const { data: subscriptions } = await supabaseClient
      .from('creator_subscriptions')
      .select('user_id, status')
      .in('user_id', creatorIds)
      .in('status', ['active', 'trial', 'active_trial', 'cancel_at_period_end']);

    const activeCreatorIds = new Set(subscriptions?.map(s => s.user_id) || []);
    
    // Get country-targeted videos
    let countryTargetedVideoIds: Set<string> | null = null;
    if (userCountry) {
      const { data: countryVideos } = await supabaseClient
        .from('creator_video_countries')
        .select('creator_video_id')
        .eq('country_code', userCountry);
      
      if (countryVideos && countryVideos.length > 0) {
        countryTargetedVideoIds = new Set(countryVideos.map(cv => cv.creator_video_id));
        console.log(`[get-ad-video] Found ${countryVideos.length} videos targeting ${userCountry}`);
      }
    }
    
    // Filter eligible videos
    const eligibleVideos = videos.filter(v => {
      if (!activeCreatorIds.has(v.user_id)) return false;
      if (!v.video_file_path) return false;
      return true;
    });

    // Country filtering with fallback
    let countryFilteredVideos = eligibleVideos;
    let isGlobalFallback = false;
    
    if (countryTargetedVideoIds && countryTargetedVideoIds.size > 0) {
      countryFilteredVideos = eligibleVideos.filter(v => countryTargetedVideoIds!.has(v.id));
      console.log(`[get-ad-video] Country-filtered videos: ${countryFilteredVideos.length}`);
    }
    
    if (countryFilteredVideos.length === 0) {
      console.log('[get-ad-video] No country-specific videos, using global fallback');
      countryFilteredVideos = eligibleVideos;
      isGlobalFallback = true;
    }

    if (countryFilteredVideos.length === 0) {
      console.log('[get-ad-video] No eligible videos');
      return new Response(
        JSON.stringify({ available: false, video: null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prioritize by topic relevance
    let selectedVideo: typeof countryFilteredVideos[0];
    
    if (userTopTopics.length > 0) {
      const relevantVideos = countryFilteredVideos.filter(v => {
        const videoTopics = v.creator_video_topics?.map((t: any) => t.topic_id) || [];
        return videoTopics.some((tid: number) => userTopTopics.includes(tid));
      });

      if (relevantVideos.length > 0) {
        selectedVideo = relevantVideos[Math.floor(Math.random() * relevantVideos.length)];
        console.log(`[get-ad-video] Selected relevant video ${selectedVideo.id}`);
      } else {
        selectedVideo = countryFilteredVideos[Math.floor(Math.random() * countryFilteredVideos.length)];
        console.log(`[get-ad-video] No relevant videos, selected random ${selectedVideo.id}`);
      }
    } else {
      selectedVideo = countryFilteredVideos[Math.floor(Math.random() * countryFilteredVideos.length)];
      console.log(`[get-ad-video] User has no preferences, selected random ${selectedVideo.id}`);
    }

    // Build video URL from storage
    const videoUrl = `${supabaseUrl}/storage/v1/object/public/creator-videos/${selectedVideo.video_file_path}`;

    // Check if video is relevant
    const videoTopics = selectedVideo.creator_video_topics?.map((t: any) => t.topic_id) || [];
    const isRelevant = userTopTopics.length > 0 && videoTopics.some((tid: number) => userTopTopics.includes(tid));

    return new Response(
      JSON.stringify({
        available: true,
        video: {
          id: selectedVideo.id,
          video_url: videoUrl,
          channel_url: selectedVideo.channel_url,
          platform: selectedVideo.platform,
          duration_seconds: selectedVideo.duration_seconds,
          creator_id: selectedVideo.user_id,
          topics: videoTopics,
        },
        is_relevant: isRelevant,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[get-ad-video] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
