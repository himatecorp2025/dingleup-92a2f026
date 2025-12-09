import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BoosterPurchaseRequest {
  boosterCode: 'FREE' | 'GOLD_SAVER';
}

interface BoosterPurchaseResponse {
  success: boolean;
  error?: string;
  balanceAfter?: {
    gold: number;
    lives: number;
    speedTokensAvailable: number;
  };
  grantedRewards?: {
    gold: number;
    lives: number;
    speedCount: number;
    speedDurationMinutes: number;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;
    const body: BoosterPurchaseRequest = await req.json();
    const { boosterCode } = body;

    console.log(`[purchase-booster] User ${userId} purchasing ${boosterCode}`);

    // Get booster definition
    const { data: boosterType, error: boosterError } = await supabaseAdmin
      .from("booster_types")
      .select("*")
      .eq("code", boosterCode)
      .eq("is_active", true)
      .single();

    if (boosterError || !boosterType) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid booster type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (boosterCode === 'FREE') {
      return await handleFreeBoosterPurchase(supabaseAdmin, userId, boosterType);
    } else if (boosterCode === 'GOLD_SAVER') {
      return await handleGoldSaverPurchase(supabaseAdmin, userId, boosterType);
    }

    return new Response(
      JSON.stringify({ success: false, error: "Unknown booster code" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[purchase-booster] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Server error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// FREE BOOSTER: Pay 900 gold → Net -600 gold, grant +300 gold, +15 lives, 4× 30min speed tokens
async function handleFreeBoosterPurchase(supabaseAdmin: any, userId: string, boosterType: any) {
  const priceGold = boosterType.price_gold || 0;
  const rewardGold = boosterType.reward_gold || 0;
  const rewardLives = boosterType.reward_lives || 0;
  const rewardSpeedCount = boosterType.reward_speed_count || 0;
  const rewardSpeedDuration = boosterType.reward_speed_duration_min || 0;

  console.log(`[FREE] Price: ${priceGold}, Rewards: gold=${rewardGold}, lives=${rewardLives}, speed=${rewardSpeedCount}x${rewardSpeedDuration}min`);

  // Get current user balance for validation only
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("coins, lives")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return new Response(
      JSON.stringify({ success: false, error: "Profile not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const currentGold = profile.coins || 0;
  const currentLives = profile.lives || 0;

  if (currentGold < priceGold) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "NOT_ENOUGH_GOLD",
        balanceAfter: { gold: currentGold, lives: currentLives }
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const idempotencyKey = `free_booster:${userId}:${Date.now()}`;
  
  const { data: creditResult, error: creditError } = await supabaseAdmin.rpc('credit_wallet', {
    p_user_id: userId,
    p_delta_coins: rewardGold - priceGold,
    p_delta_lives: rewardLives,
    p_source: 'booster_purchase',
    p_idempotency_key: idempotencyKey,
    p_metadata: {
      booster_type_id: boosterType.id,
      booster_code: 'FREE',
      price_gold: priceGold,
      reward_gold: rewardGold,
      reward_lives: rewardLives,
      reward_speed_count: rewardSpeedCount,
      reward_speed_duration_min: rewardSpeedDuration,
      purchase_context: 'PROFILE'
    }
  });

  if (creditError) {
    console.error("[FREE] credit_wallet RPC error:", creditError);
    return new Response(
      JSON.stringify({ success: false, error: "Wallet transaction failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!creditResult || !creditResult.success) {
    console.error("[FREE] credit_wallet returned failure:", creditResult);
    return new Response(
      JSON.stringify({ success: false, error: creditResult?.error || "Insufficient funds" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const newGold = creditResult.new_coins;
  const newLives = creditResult.new_lives;

  // Log purchase
  await supabaseAdmin
    .from("booster_purchases")
    .insert({
      user_id: userId,
      booster_type_id: boosterType.id,
      purchase_source: "GOLD",
      gold_spent: priceGold,
      usd_cents_spent: 0,
      purchase_context: "PROFILE"
    });

  // Track purchase completion
  await supabaseAdmin
    .from("conversion_events")
    .insert({
      user_id: userId,
      event_type: "purchase_complete",
      product_type: "booster",
      product_id: boosterType.code,
      session_id: `session_${userId}_${Date.now()}`,
      metadata: {
        booster_code: boosterType.code,
        price_gold: priceGold,
        reward_gold: rewardGold,
        reward_lives: rewardLives
      }
    });

  // Create Speed tokens (pending activation)
  if (rewardSpeedCount > 0) {
    const speedTokens = [];
    for (let i = 0; i < rewardSpeedCount; i++) {
      speedTokens.push({
        user_id: userId,
        duration_minutes: rewardSpeedDuration,
        source: 'FREE_BOOSTER'
      });
    }

    await supabaseAdmin.from("speed_tokens").insert(speedTokens);
    console.log(`[FREE] Created ${rewardSpeedCount} speed tokens`);
  }

  const response: BoosterPurchaseResponse = {
    success: true,
    balanceAfter: {
      gold: newGold,
      lives: newLives,
      speedTokensAvailable: rewardSpeedCount
    },
    grantedRewards: {
      gold: rewardGold,
      lives: rewardLives,
      speedCount: rewardSpeedCount,
      speedDurationMinutes: rewardSpeedDuration
    }
  };

  return new Response(
    JSON.stringify(response),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// GOLD_SAVER BOOSTER: Pay 500 gold → Net -250 gold, grant +250 gold, +15 lives
async function handleGoldSaverPurchase(supabaseAdmin: any, userId: string, boosterType: any) {
  const priceGold = boosterType.price_gold || 0;
  const rewardGold = boosterType.reward_gold || 0;
  const rewardLives = boosterType.reward_lives || 0;

  console.log(`[GOLD_SAVER] Price: ${priceGold}, Rewards: gold=${rewardGold}, lives=${rewardLives}`);

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("coins, lives")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return new Response(
      JSON.stringify({ success: false, error: "Profile not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const currentGold = profile.coins || 0;
  const currentLives = profile.lives || 0;

  if (currentGold < priceGold) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "NOT_ENOUGH_GOLD",
        balanceAfter: { gold: currentGold, lives: currentLives, speedTokensAvailable: 0 }
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const idempotencyKey = `gold_saver:${userId}:${Date.now()}`;
  
  const { data: creditResult, error: creditError } = await supabaseAdmin.rpc('credit_wallet', {
    p_user_id: userId,
    p_delta_coins: rewardGold - priceGold,
    p_delta_lives: rewardLives,
    p_source: 'booster_purchase',
    p_idempotency_key: idempotencyKey,
    p_metadata: {
      booster_type_id: boosterType.id,
      booster_code: 'GOLD_SAVER',
      price_gold: priceGold,
      reward_gold: rewardGold,
      reward_lives: rewardLives,
      purchase_context: 'INGAME'
    }
  });

  if (creditError) {
    console.error("[GOLD_SAVER] credit_wallet RPC error:", creditError);
    return new Response(
      JSON.stringify({ success: false, error: "Wallet transaction failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!creditResult || !creditResult.success) {
    return new Response(
      JSON.stringify({ success: false, error: creditResult?.error || "Insufficient funds" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const newGold = creditResult.new_coins;
  const newLives = creditResult.new_lives;

  // Log purchase
  await supabaseAdmin
    .from("booster_purchases")
    .insert({
      user_id: userId,
      booster_type_id: boosterType.id,
      purchase_source: "GOLD",
      gold_spent: priceGold,
      usd_cents_spent: 0,
      purchase_context: "INGAME"
    });

  // Track purchase completion
  await supabaseAdmin
    .from("conversion_events")
    .insert({
      user_id: userId,
      event_type: "purchase_complete",
      product_type: "booster",
      product_id: boosterType.code,
      session_id: `session_${userId}_${Date.now()}`,
      metadata: {
        booster_code: boosterType.code,
        price_gold: priceGold,
        reward_gold: rewardGold,
        reward_lives: rewardLives
      }
    });

  console.log(`[GOLD_SAVER] Purchase successful`);

  const response: BoosterPurchaseResponse = {
    success: true,
    balanceAfter: {
      gold: newGold,
      lives: newLives,
      speedTokensAvailable: 0
    },
    grantedRewards: {
      gold: rewardGold,
      lives: rewardLives,
      speedCount: 0,
      speedDurationMinutes: 0
    }
  };

  return new Response(
    JSON.stringify(response),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
