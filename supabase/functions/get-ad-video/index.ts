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
  video_url: string;
  embed_url: string | null;
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
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

    // Get user's country for country-specific filtering
    const { data: userProfile } = await supabaseClient
      .from('profiles')
      .select('country_code')
      .eq('id', userId)
      .single();
    
    const userCountry = userProfile?.country_code || null;
    console.log(`[get-ad-video] User country: ${userCountry || 'none'}`);

    // Step 1: Get user's top 3 topics (if they have 100+ answered questions)
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

    // Step 2: Get active creator videos with valid subscriptions
    const now = new Date().toISOString();
    
    let query = supabaseClient
      .from('creator_videos')
      .select(`
        id,
        video_url,
        embed_url,
        platform,
        duration_seconds,
        user_id,
        creator_video_topics(topic_id)
      `)
      .eq('is_active', true)
      .gt('expires_at', now);

    // Exclude already shown videos in this sequence
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

    // Step 3: Filter videos by creator subscription status
    const creatorIds = [...new Set(videos.map(v => v.user_id))];
    
    const { data: subscriptions } = await supabaseClient
      .from('creator_subscriptions')
      .select('user_id, status')
      .in('user_id', creatorIds)
      .in('status', ['active', 'trial', 'cancel_at_period_end']);

    const activeCreatorIds = new Set(subscriptions?.map(s => s.user_id) || []);
    
    // Get video IDs that target user's country (if user has country)
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
    
    // Filter by active creators AND valid embed_url (must contain /embed/ to be playable)
    const eligibleVideos = videos.filter(v => {
      if (!activeCreatorIds.has(v.user_id)) return false;
      if (!v.embed_url) return false;
      // Valid embed URLs must contain /embed/ or plugins/video for Facebook
      const hasValidEmbed = v.embed_url.includes('/embed/') || v.embed_url.includes('plugins/video');
      if (!hasValidEmbed) {
        console.log(`[get-ad-video] Skipping video ${v.id} with invalid embed_url: ${v.embed_url}`);
      }
      return hasValidEmbed;
    });

    // First try country-specific videos, then fallback to global pool
    let countryFilteredVideos = eligibleVideos;
    let isGlobalFallback = false;
    
    if (countryTargetedVideoIds && countryTargetedVideoIds.size > 0) {
      countryFilteredVideos = eligibleVideos.filter(v => countryTargetedVideoIds!.has(v.id));
      console.log(`[get-ad-video] Country-filtered videos: ${countryFilteredVideos.length}`);
    }
    
    // Fallback to global pool if no country-specific videos
    if (countryFilteredVideos.length === 0) {
      console.log('[get-ad-video] No country-specific videos, using global fallback');
      countryFilteredVideos = eligibleVideos;
      isGlobalFallback = true;
    }

    if (countryFilteredVideos.length === 0) {
      console.log('[get-ad-video] No videos with valid embed URLs from active creators');
      return new Response(
        JSON.stringify({ available: false, video: null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Prioritize by topic relevance
    let selectedVideo: typeof countryFilteredVideos[0];
    
    if (userTopTopics.length > 0) {
      // Find videos matching user's interests
      const relevantVideos = countryFilteredVideos.filter(v => {
        const videoTopics = v.creator_video_topics?.map((t: any) => t.topic_id) || [];
        return videoTopics.some((tid: number) => userTopTopics.includes(tid));
      });

      if (relevantVideos.length > 0) {
        // Random selection from relevant videos
        selectedVideo = relevantVideos[Math.floor(Math.random() * relevantVideos.length)];
        console.log(`[get-ad-video] Selected relevant video ${selectedVideo.id}${isGlobalFallback ? ' (global fallback)' : ''}`);
      } else {
        // Fallback: random from all eligible
        selectedVideo = countryFilteredVideos[Math.floor(Math.random() * countryFilteredVideos.length)];
        console.log(`[get-ad-video] No relevant videos, selected random ${selectedVideo.id}${isGlobalFallback ? ' (global fallback)' : ''}`);
      }
    } else {
      // No user preferences: random selection
      selectedVideo = countryFilteredVideos[Math.floor(Math.random() * countryFilteredVideos.length)];
      console.log(`[get-ad-video] User has no preferences, selected random ${selectedVideo.id}${isGlobalFallback ? ' (global fallback)' : ''}`);
    }

    // Check if video is relevant to user
    const videoTopics = selectedVideo.creator_video_topics?.map((t: any) => t.topic_id) || [];
    const isRelevant = userTopTopics.length > 0 && videoTopics.some((tid: number) => userTopTopics.includes(tid));

    return new Response(
      JSON.stringify({
        available: true,
        video: {
          id: selectedVideo.id,
          video_url: selectedVideo.video_url,
          embed_url: selectedVideo.embed_url,
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
