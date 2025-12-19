import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Coin package price IDs from Stripe (one-time prices)
const COIN_PACKAGES: Record<number, { priceId: string; coins: number; lives: number }> = {
  300: { priceId: "price_1ScYcsKKw7HPC0ZDnFUoZWCI", coins: 300, lives: 0 },
  500: { priceId: "price_1ScYd8KKw7HPC0ZDkc2WexS9", coins: 500, lives: 0 },
  700: { priceId: "price_1ScYdJKKw7HPC0ZDXYwCHYEm", coins: 700, lives: 0 },
  900: { priceId: "price_1ScYdYKKw7HPC0ZDTithxuu1", coins: 900, lives: 10 },
  1000: { priceId: "price_1ScYdjKKw7HPC0ZDDN7eDyGw", coins: 1000, lives: 15 },
  1500: { priceId: "price_1ScYdtKKw7HPC0ZDOYhltuRu", coins: 1500, lives: 25 },
  2500: { priceId: "price_1ScYe4KKw7HPC0ZDsdthXEtc", coins: 2500, lives: 40 },
  3000: { priceId: "price_1ScYeGKKw7HPC0ZDV4Z7R1H0", coins: 3000, lives: 60 },
  5000: { priceId: "price_1ScYeTKKw7HPC0ZDCKQjONXH", coins: 5000, lives: 100 },
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-COIN-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { coins } = await req.json();
    logStep("Request body parsed", { coins });

    const packageInfo = COIN_PACKAGES[coins];
    if (!packageInfo) {
      throw new Error(`Invalid coin package: ${coins}`);
    }
    logStep("Package found", packageInfo);

    // Get user profile for email
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    const userEmail = profile?.email || `${user.id}@dingleup.app`;
    logStep("User email", { email: userEmail });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check for existing Stripe customer by email
    const customers = await stripe.customers.list({ 
      email: userEmail,
      limit: 1,
    });
    
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    }

    // Get origin for redirect URLs
    const origin = req.headers.get("origin") || "https://dingleup.app";

    // Create Checkout Session for one-time payment
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price: packageInfo.priceId,
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        type: "coin_purchase",
        coins: packageInfo.coins.toString(),
        lives: packageInfo.lives.toString(),
      },
      success_url: `${origin}/coin-shop?checkout=success&coins=${packageInfo.coins}`,
      cancel_url: `${origin}/coin-shop?checkout=cancelled`,
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({
      url: session.url,
      sessionId: session.id,
      coins: packageInfo.coins,
      lives: packageInfo.lives,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
