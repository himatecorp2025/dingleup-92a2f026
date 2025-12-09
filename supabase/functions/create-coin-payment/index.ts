import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Coin package price IDs from Stripe
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
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
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

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ 
      limit: 1,
      metadata: { supabase_user_id: user.id }
    });
    
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    } else {
      // Create new customer
      const newCustomer = await stripe.customers.create({
        metadata: { supabase_user_id: user.id }
      });
      customerId = newCustomer.id;
      logStep("Created new customer", { customerId });
    }

    // Create PaymentIntent for native payment sheet
    const paymentIntent = await stripe.paymentIntents.create({
      customer: customerId,
      amount: Math.round(packageInfo.coins === 300 ? 139 : 
               packageInfo.coins === 500 ? 219 :
               packageInfo.coins === 700 ? 299 :
               packageInfo.coins === 900 ? 379 :
               packageInfo.coins === 1000 ? 399 :
               packageInfo.coins === 1500 ? 549 :
               packageInfo.coins === 2500 ? 849 :
               packageInfo.coins === 3000 ? 999 : 1499),
      currency: "usd",
      payment_method_types: ["card"],
      metadata: {
        supabase_user_id: user.id,
        product_type: "coins",
        coins: packageInfo.coins.toString(),
        lives: packageInfo.lives.toString(),
      },
    });
    logStep("PaymentIntent created", { 
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret ? "present" : "missing"
    });

    return new Response(JSON.stringify({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
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
