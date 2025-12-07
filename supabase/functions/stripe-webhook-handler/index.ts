import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { startMetrics, measureStage, incDbQuery, logSuccess, logError } from '../_shared/metrics.ts';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// ============= SPEED BOOSTER HANDLER =============
async function handleSpeedBoosterWebhook(sessionId: string, session: Stripe.Checkout.Session, correlationId: string) {
  const ctx = startMetrics({ functionName: 'webhook-speed', userId: session.metadata?.user_id });
  ctx.extra['correlation_id'] = correlationId;
  ctx.extra['session_id'] = sessionId;

  const userId = session.metadata?.user_id;
  
  if (!userId) {
    logError(ctx, new Error('MISSING_USER_ID'), { sessionId });
    return;
  }

  const payload = {
    speed_token_count: session.metadata?.speed_token_count,
    speed_duration_min: session.metadata?.speed_duration_min,
    gold_reward: session.metadata?.gold_reward,
    lives_reward: session.metadata?.lives_reward,
    price_usd_cents: session.amount_total,
    purchase_source: 'speed_boost_shop',
    token_source: 'purchase'
  };

  const { data: result, error } = await measureStage(ctx, 'rpc_apply', async () => {
    incDbQuery(ctx);
    return await supabaseAdmin
      .rpc('apply_booster_purchase_from_stripe', {
        p_user_id: userId,
        p_session_id: sessionId,
        p_booster_code: 'SPEED_BOOST',
        p_payload: payload
      });
  });

  if (error) {
    logError(ctx, error, { sessionId });
    throw error;
  }

  logSuccess(ctx, { 
    sessionId, 
    speed_tokens_granted: result?.speed_tokens_granted,
    already_processed: result?.already_processed || false 
  });
}

// ============= PREMIUM BOOSTER HANDLER =============
async function handlePremiumBoosterWebhook(sessionId: string, session: Stripe.Checkout.Session, correlationId: string) {
  const ctx = startMetrics({ functionName: 'webhook-premium', userId: session.metadata?.user_id });
  ctx.extra['correlation_id'] = correlationId;
  ctx.extra['session_id'] = sessionId;

  const userId = session.metadata?.user_id;
  
  if (!userId) {
    logError(ctx, new Error('MISSING_USER_ID'), { sessionId });
    return;
  }

  // Get booster definition
  const { data: boosterType } = await measureStage(ctx, 'booster_lookup', async () => {
    incDbQuery(ctx);
    return await supabaseAdmin
      .from('booster_types')
      .select('*')
      .eq('code', 'PREMIUM')
      .single();
  });

  if (!boosterType) {
    logError(ctx, new Error('BOOSTER_NOT_FOUND'), { sessionId, code: 'PREMIUM' });
    return;
  }

  const payload = {
    gold_reward: boosterType.reward_gold || 0,
    lives_reward: boosterType.reward_lives || 0,
    speed_token_count: boosterType.reward_speed_count || 0,
    speed_duration_min: boosterType.reward_speed_duration_min || 0,
    price_usd_cents: 249,
    purchase_source: 'stripe_checkout',
    token_source: 'PREMIUM_BOOSTER'
  };

  const { data: result, error } = await measureStage(ctx, 'rpc_apply', async () => {
    incDbQuery(ctx);
    return await supabaseAdmin
      .rpc('apply_booster_purchase_from_stripe', {
        p_user_id: userId,
        p_session_id: sessionId,
        p_booster_code: 'PREMIUM',
        p_payload: payload
      });
  });

  if (error) {
    logError(ctx, error, { sessionId });
    throw error;
  }

  logSuccess(ctx, { 
    sessionId, 
    gold_granted: result?.gold_granted,
    lives_granted: result?.lives_granted,
    already_processed: result?.already_processed || false 
  });
}

// ============= INSTANT RESCUE HANDLER =============
async function handleInstantRescueWebhook(sessionId: string, session: Stripe.Checkout.Session, correlationId: string) {
  const ctx = startMetrics({ functionName: 'webhook-rescue', userId: session.metadata?.user_id });
  ctx.extra['correlation_id'] = correlationId;
  ctx.extra['session_id'] = sessionId;

  const userId = session.metadata?.user_id;
  
  if (!userId) {
    logError(ctx, new Error('MISSING_USER_ID'), { sessionId });
    return;
  }

  const payload = {
    booster_type_id: session.metadata?.booster_type_id,
    gold_reward: session.metadata?.gold_reward,
    lives_reward: session.metadata?.lives_reward,
    price_usd_cents: session.amount_total
  };

  const gameSessionId = session.metadata?.game_session_id || null;

  const { data: result, error } = await measureStage(ctx, 'rpc_apply', async () => {
    incDbQuery(ctx);
    return await supabaseAdmin
      .rpc('apply_instant_rescue_from_stripe', {
        p_user_id: userId,
        p_session_id: sessionId,
        p_game_session_id: gameSessionId,
        p_payload: payload
      });
  });

  if (error) {
    logError(ctx, error, { sessionId, gameSessionId });
    throw error;
  }

  logSuccess(ctx, { 
    sessionId, 
    gameSessionId,
    gold_granted: result?.gold_granted,
    lives_granted: result?.lives_granted,
    already_processed: result?.already_processed || false 
  });
}

// ============= MAIN WEBHOOK HANDLER =============
serve(async (req) => {
  const correlationId = crypto.randomUUID();
  const ctx = startMetrics({ functionName: 'stripe-webhook-handler', userId: null });
  ctx.extra['correlation_id'] = correlationId;

  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  
  if (!webhookSecret) {
    logError(ctx, new Error('WEBHOOK_SECRET_NOT_CONFIGURED'), { correlation_id: correlationId });
    return new Response(JSON.stringify({ error: "Webhook not configured" }), { status: 500 });
  }

  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(body, signature!, webhookSecret);
    ctx.extra['event_type'] = event.type;
    ctx.extra['event_id'] = event.id;
  } catch (err) {
    logError(ctx, err, { correlation_id: correlationId, signature_present: !!signature });
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
  }
  
  // Handle checkout.session.completed
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const sessionId = session.id;
    const paymentStatus = session.payment_status;
    const productType = session.metadata?.product_type;
    
    ctx.extra['session_id'] = sessionId;
    ctx.extra['payment_status'] = paymentStatus;
    ctx.extra['product_type'] = productType;
    
    if (paymentStatus !== "paid") {
      logSuccess(ctx, { correlation_id: correlationId, skipped: true, reason: 'not_paid' });
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }
    
    try {
      await measureStage(ctx, 'handler_execution', async () => {
        switch (productType) {
          case "speed_booster":
            await handleSpeedBoosterWebhook(sessionId, session, correlationId);
            break;
          case "premium_booster":
            await handlePremiumBoosterWebhook(sessionId, session, correlationId);
            break;
          case "instant_rescue":
            await handleInstantRescueWebhook(sessionId, session, correlationId);
            break;
          default:
            logError(ctx, new Error('UNKNOWN_PRODUCT_TYPE'), { correlation_id: correlationId, productType });
        }
      });
    } catch (error) {
      logError(ctx, error, { correlation_id: correlationId, sessionId, productType });
      // Still return 200 to Stripe to prevent retries for handler errors
    }
  }

  logSuccess(ctx, { correlation_id: correlationId, event_type: event.type, event_id: event.id });
  return new Response(JSON.stringify({ received: true, correlation_id: correlationId }), { status: 200 });
});