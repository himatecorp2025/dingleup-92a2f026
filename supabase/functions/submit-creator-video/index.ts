import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Platform detection from channel URLs
const PLATFORM_PATTERNS: Record<string, RegExp[]> = {
  tiktok: [/tiktok\.com/i, /vm\.tiktok\.com/i],
  youtube: [/youtube\.com/i, /youtu\.be/i],
  instagram: [/instagram\.com/i, /instagr\.am/i],
  facebook: [/facebook\.com/i, /fb\.watch/i],
};

function detectPlatform(url: string): string | null {
  for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(url)) {
        return platform;
      }
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[SUBMIT-VIDEO] Function started - NEW FILE UPLOAD SYSTEM");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      console.error("[SUBMIT-VIDEO] Auth error:", userError?.message);
      return new Response(
        JSON.stringify({ success: false, error: "NOT_AUTHENTICATED" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const userId = userData.user.id;
    console.log("[SUBMIT-VIDEO] User authenticated:", userId);

    // Parse request body
    const body = await req.json();
    const { 
      video_file_path,    // Path in creator-videos bucket
      channel_links,      // Array of { url: string, platform?: string }
      topic_ids,          // Array of topic IDs
      title,              // Optional video title
      duration_seconds,   // Video duration (must be >= 15)
      file_size_bytes,    // File size
      custom_thumbnail_url,
    } = body;

    // Validate required fields
    if (!video_file_path) {
      return new Response(
        JSON.stringify({ success: false, error: "VIDEO_FILE_PATH_REQUIRED" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (!channel_links || !Array.isArray(channel_links) || channel_links.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "CHANNEL_LINKS_REQUIRED" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Validate duration (minimum 15 seconds)
    if (!duration_seconds || duration_seconds < 15) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "VIDEO_TOO_SHORT",
          message: "A videónak minimum 15 másodpercesnek kell lennie."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check if user is admin (admins bypass subscription check)
    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    
    const isAdmin = !!userRole;
    
    // Check subscription status (skip for admins)
    if (!isAdmin) {
      const { data: subscription } = await supabaseClient
        .from('creator_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!subscription || !['active', 'active_trial', 'cancel_at_period_end'].includes(subscription.status)) {
        console.log("[SUBMIT-VIDEO] No active subscription for user:", userId);
        return new Response(
          JSON.stringify({ success: false, error: "NO_ACTIVE_SUBSCRIPTION" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
        );
      }
    }

    // Get creator's country from profile
    const { data: creatorProfile } = await supabaseClient
      .from('profiles')
      .select('country_code, username')
      .eq('id', userId)
      .single();
    
    const creatorCountry = creatorProfile?.country_code || 'HU';
    const creatorName = creatorProfile?.username || null;
    console.log("[SUBMIT-VIDEO] Creator:", creatorName, "Country:", creatorCountry);

    // Generate video_group_id for all channels of this video
    const videoGroupId = crypto.randomUUID();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    const createdVideos: any[] = [];

    // Create one record for each channel link
    for (const channelLink of channel_links) {
      const channelUrl = channelLink.url;
      const platform = channelLink.platform || detectPlatform(channelUrl);

      if (!platform) {
        console.log("[SUBMIT-VIDEO] Unknown platform for channel:", channelUrl);
        continue; // Skip unknown platforms
      }

      console.log("[SUBMIT-VIDEO] Creating record for channel:", platform, channelUrl);

      const videoData = {
        user_id: userId,
        platform,
        channel_url: channelUrl,
        video_file_path,
        video_group_id: videoGroupId,
        thumbnail_url: custom_thumbnail_url || null,
        title: title || null,
        duration_seconds,
        file_size_bytes: file_size_bytes || 0,
        creator_name: creatorName,
        status: 'active',
        is_active: true,
        first_activated_at: now,
        expires_at: expiresAt,
      };

      const { data: newVideo, error: insertError } = await supabaseClient
        .from('creator_videos')
        .insert(videoData)
        .select()
        .single();

      if (insertError) {
        console.error("[SUBMIT-VIDEO] Insert error for channel:", platform, insertError);
        continue;
      }

      console.log("[SUBMIT-VIDEO] Video record created:", newVideo.id, "for channel:", platform);

      // Add country targeting
      await supabaseClient
        .from('creator_video_countries')
        .insert({
          creator_video_id: newVideo.id,
          country_code: creatorCountry,
          is_primary: true,
          sort_order: 1,
        });

      // Add topic associations
      if (topic_ids && Array.isArray(topic_ids) && topic_ids.length > 0) {
        const limitedTopics = topic_ids.slice(0, 10);
        const topicInserts = limitedTopics.map((topicId: number) => ({
          creator_video_id: newVideo.id,
          topic_id: topicId,
        }));

        await supabaseClient
          .from('creator_video_topics')
          .insert(topicInserts);
      }

      createdVideos.push({
        id: newVideo.id,
        platform,
        channel_url: channelUrl,
      });
    }

    if (createdVideos.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "NO_VALID_CHANNELS",
          message: "Nem sikerült érvényes csatorna linkeket feldolgozni."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log("[SUBMIT-VIDEO] Successfully created", createdVideos.length, "video records");

    return new Response(
      JSON.stringify({ 
        success: true, 
        video_group_id: videoGroupId,
        videos: createdVideos,
        channels_created: createdVideos.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("[SUBMIT-VIDEO] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "SERVER_ERROR", details: String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
