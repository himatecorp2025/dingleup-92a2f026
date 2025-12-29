import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RewardVideo {
  id: string;
  videoUrl: string;      // Full storage URL
  channelUrl: string;    // Redirect URL
  platform: 'tiktok' | 'youtube' | 'instagram' | 'facebook';
  creatorName: string | null;
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

    // Parse count from query params (default 10)
    const url = new URL(req.url);
    const count = parseInt(url.searchParams.get('count') || '10', 10);
    const requestedCount = Math.min(Math.max(count, 1), 20);

    console.log(`[preload-reward-videos] User ${userId}, requesting ${requestedCount} videos`);

    const now = new Date().toISOString();

    // Parallel fetch user profile and videos
    const [profileResult, videosResult] = await Promise.all([
      supabaseClient
        .from('profiles')
        .select('country_code')
        .eq('id', userId)
        .single(),
      supabaseClient
        .from('creator_videos')
        .select(`
          id,
          video_file_path,
          channel_url,
          platform,
          user_id,
          creator_name
        `)
        .eq('is_active', true)
        .gt('expires_at', now)
        .not('video_file_path', 'is', null)
    ]);

    const userCountry = profileResult.data?.country_code || null;
    console.log(`[preload-reward-videos] User country: ${userCountry || 'none'}`);

    const { data: videos, error: videosError } = videosResult;

    if (videosError) {
      console.error('[preload-reward-videos] Error fetching videos:', videosError);
      return new Response(
        JSON.stringify({ videos: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!videos || videos.length === 0) {
      console.log('[preload-reward-videos] No active videos available');
      return new Response(
        JSON.stringify({ videos: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get active creator subscriptions
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
    
    if (countryTargetedVideoIds && countryTargetedVideoIds.size > 0) {
      countryFilteredVideos = eligibleVideos.filter(v => countryTargetedVideoIds!.has(v.id));
    }
    
    if (countryFilteredVideos.length === 0) {
      countryFilteredVideos = eligibleVideos;
    }

    if (countryFilteredVideos.length === 0) {
      console.log('[preload-reward-videos] No eligible videos after filtering');
      return new Response(
        JSON.stringify({ videos: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Platform mixing: avoid 3+ consecutive videos from same platform
    const mixPlatforms = (videos: typeof countryFilteredVideos): typeof countryFilteredVideos => {
      if (videos.length <= 2) return videos;
      
      const byPlatform: Record<string, typeof videos> = {};
      for (const v of videos) {
        const p = v.platform || 'unknown';
        if (!byPlatform[p]) byPlatform[p] = [];
        byPlatform[p].push(v);
      }
      
      for (const p in byPlatform) {
        byPlatform[p].sort(() => Math.random() - 0.5);
      }
      
      const result: typeof videos = [];
      const platforms = Object.keys(byPlatform).filter(p => byPlatform[p].length > 0);
      
      let lastPlatform = '';
      let consecutiveCount = 0;
      
      while (result.length < videos.length) {
        let added = false;
        
        for (const p of platforms) {
          if (byPlatform[p].length === 0) continue;
          
          if (p === lastPlatform && consecutiveCount >= 2) continue;
          
          if (p !== lastPlatform || platforms.every(pl => pl === lastPlatform || byPlatform[pl].length === 0)) {
            const video = byPlatform[p].shift()!;
            result.push(video);
            
            if (p === lastPlatform) {
              consecutiveCount++;
            } else {
              lastPlatform = p;
              consecutiveCount = 1;
            }
            added = true;
            break;
          }
        }
        
        if (!added) {
          for (const p of platforms) {
            if (byPlatform[p].length > 0) {
              const video = byPlatform[p].shift()!;
              result.push(video);
              if (p === lastPlatform) {
                consecutiveCount++;
              } else {
                lastPlatform = p;
                consecutiveCount = 1;
              }
              break;
            }
          }
        }
        
        for (let i = platforms.length - 1; i >= 0; i--) {
          if (byPlatform[platforms[i]].length === 0) {
            platforms.splice(i, 1);
          }
        }
        
        if (platforms.length === 0) break;
      }
      
      return result;
    };

    const mixedVideos = mixPlatforms(countryFilteredVideos);
    
    // Build result with repetition if needed
    const resultVideos: RewardVideo[] = [];
    for (let i = 0; i < requestedCount; i++) {
      const video = mixedVideos[i % mixedVideos.length];
      resultVideos.push({
        id: video.id,
        videoUrl: `${supabaseUrl}/storage/v1/object/public/creator-videos/${video.video_file_path}`,
        channelUrl: video.channel_url,
        platform: video.platform as RewardVideo['platform'],
        creatorName: video.creator_name || null,
      });
    }

    console.log(`[preload-reward-videos] Returning ${resultVideos.length} videos`);

    return new Response(
      JSON.stringify({ videos: resultVideos }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[preload-reward-videos] Error:', error);
    return new Response(
      JSON.stringify({ videos: [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
