import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fixed Creator subscription price (2990 HUF/month with 30-day trial)
const CREATOR_SUBSCRIPTION_PRICE_ID = "price_1ScxKoKKw7HPC0ZD0yWfksGE";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[CREATE-CREATOR-SUB] Function started");

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
      console.error("[CREATE-CREATOR-SUB] Auth error:", userError?.message);
      throw new Error("User not authenticated");
    }

    const user = userData.user;
    console.log("[CREATE-CREATOR-SUB] User authenticated:", user.id);

    // Check if user is admin (admins get free subscription)
    const { data: adminRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    const isAdmin = !!adminRole;
    console.log("[CREATE-CREATOR-SUB] Is admin:", isAdmin);

    // Get user profile for email
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('email, username')
      .eq('id', user.id)
      .single();

    const userEmail = profile?.email || user.email || `${user.id}@dingleup.app`;
    console.log("[CREATE-CREATOR-SUB] User email:", userEmail);

    // If admin, create subscription directly without Stripe
    if (isAdmin) {
      console.log("[CREATE-CREATOR-SUB] Admin bypass - creating free subscription");
      
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year

      // Upsert creator subscription
      const { error: upsertError } = await supabaseClient
        .from("creator_subscriptions")
        .upsert({
          user_id: user.id,
          stripe_customer_id: null,
          stripe_subscription_id: null,
          status: "active",
          trial_ends_at: null,
          current_period_ends_at: periodEnd.toISOString(),
          package_type: "admin_free",
          max_videos: 999,
        }, { onConflict: "user_id" });

      if (upsertError) {
        console.error("[CREATE-CREATOR-SUB] Admin subscription error:", upsertError);
        throw new Error("Failed to create admin subscription");
      }

      // Update profile
      await supabaseClient
        .from("profiles")
        .update({
          is_creator: true,
          creator_subscription_status: "active",
        })
        .eq("id", user.id);

      console.log("[CREATE-CREATOR-SUB] Admin subscription created successfully");

      // Return success without redirect (frontend handles this)
      const origin = req.headers.get("origin") || "https://dingleup.app";
      return new Response(
        JSON.stringify({ 
          success: true, 
          admin_bypass: true,
          url: `${origin}/creators?checkout=success` 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe not configured");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("[CREATE-CREATOR-SUB] Found existing customer:", customerId);
    }

    // Get origin for redirect URLs
    const origin = req.headers.get("origin") || "https://dingleup.app";

    // Create checkout session with 30-day trial
    // Card required upfront for automatic billing after trial
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: CREATOR_SUBSCRIPTION_PRICE_ID,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 30,
        metadata: {
          user_id: user.id,
          package_type: "creator_basic",
          type: "creator_subscription",
        },
      },
      metadata: {
        user_id: user.id,
        user_email: userEmail,
        package_type: "creator_basic",
        type: "creator_subscription",
      },
      success_url: `${origin}/creators?checkout=success`,
      cancel_url: `${origin}/creators?checkout=cancelled`,
      allow_promotion_codes: true,
    });

    console.log("[CREATE-CREATOR-SUB] Checkout session created:", session.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[CREATE-CREATOR-SUB] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
