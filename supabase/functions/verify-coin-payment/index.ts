import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-COIN-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { paymentIntentId } = await req.json();
    if (!paymentIntentId) throw new Error("Missing paymentIntentId");
    logStep("Verifying payment", { paymentIntentId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    logStep("PaymentIntent retrieved", { status: paymentIntent.status });

    if (paymentIntent.status !== "succeeded") {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Payment not completed",
        status: paymentIntent.status 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Verify the payment is for this user
    const metadata = paymentIntent.metadata;
    if (metadata.supabase_user_id !== user.id) {
      throw new Error("Payment does not belong to this user");
    }

    const coins = parseInt(metadata.coins || "0");
    const lives = parseInt(metadata.lives || "0");
    const idempotencyKey = `coin-purchase:${paymentIntentId}`;
    logStep("Crediting rewards", { coins, lives, idempotencyKey });

    // Credit coins using RPC
    if (coins > 0) {
      const { data: walletResult, error: walletError } = await supabaseClient.rpc('credit_wallet', {
        p_user_id: user.id,
        p_delta_coins: coins,
        p_source: 'coin_purchase',
        p_idempotency_key: idempotencyKey + ':coins',
        p_metadata: { paymentIntentId, coins, lives }
      });
      
      if (walletError) {
        logStep("Wallet credit error", { error: walletError.message });
        throw new Error(`Failed to credit coins: ${walletError.message}`);
      }
      logStep("Coins credited", walletResult);
    }

    // Credit lives using RPC
    if (lives > 0) {
      const { data: livesResult, error: livesError } = await supabaseClient.rpc('credit_lives', {
        p_user_id: user.id,
        p_delta_lives: lives,
        p_source: 'coin_purchase',
        p_idempotency_key: idempotencyKey + ':lives',
        p_metadata: { paymentIntentId, coins, lives }
      });
      
      if (livesError) {
        logStep("Lives credit error", { error: livesError.message });
        throw new Error(`Failed to credit lives: ${livesError.message}`);
      }
      logStep("Lives credited", livesResult);
    }

    logStep("Payment verified and rewards credited successfully");

    return new Response(JSON.stringify({
      success: true,
      coins,
      lives,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage, success: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
