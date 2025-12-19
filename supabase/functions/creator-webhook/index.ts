import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const endpointSecret = Deno.env.get("STRIPE_CREATOR_WEBHOOK_SECRET");

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;

  try {
    if (endpointSecret && signature) {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } else {
      // For testing without webhook secret
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log(`[CREATOR-WEBHOOK] Processing event: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Handle coin purchase
        if (session.mode === "payment" && session.metadata?.type === "coin_purchase") {
          const userId = session.metadata?.user_id;
          const coins = parseInt(session.metadata?.coins || "0");
          const lives = parseInt(session.metadata?.lives || "0");
          
          console.log(`[CREATOR-WEBHOOK] Coin purchase completed for user: ${userId}, coins: ${coins}, lives: ${lives}`);

          if (userId && coins > 0) {
            const idempotencyKey = `coin-checkout:${session.id}`;
            
            // Credit coins
            const { error: walletError } = await supabase.rpc('credit_wallet', {
              p_user_id: userId,
              p_delta_coins: coins,
              p_source: 'coin_purchase',
              p_idempotency_key: idempotencyKey + ':coins',
              p_metadata: { sessionId: session.id, coins, lives }
            });
            
            if (walletError) {
              console.error("[CREATOR-WEBHOOK] Error crediting coins:", walletError);
            } else {
              console.log(`[CREATOR-WEBHOOK] Coins credited: ${coins}`);
            }
            
            // Credit lives if any
            if (lives > 0) {
              const { error: livesError } = await supabase.rpc('credit_lives', {
                p_user_id: userId,
                p_delta_lives: lives,
                p_source: 'coin_purchase',
                p_idempotency_key: idempotencyKey + ':lives',
                p_metadata: { sessionId: session.id, coins, lives }
              });
              
              if (livesError) {
                console.error("[CREATOR-WEBHOOK] Error crediting lives:", livesError);
              } else {
                console.log(`[CREATOR-WEBHOOK] Lives credited: ${lives}`);
              }
            }
          }
          break;
        }
        
        // Check if this is a creator subscription checkout
        if (session.mode === "subscription" && session.metadata?.type === "creator_subscription") {
          const customerId = session.customer as string;
          const subscriptionId = session.subscription as string;
          const userId = session.metadata?.user_id;
          const userEmail = session.customer_email || session.metadata?.user_email;

          console.log(`[CREATOR-WEBHOOK] Subscription created for customer: ${customerId}, user_id: ${userId}`);

          let profileId = userId;
          
          // If no user_id in metadata, try to find by email
          if (!profileId && userEmail) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("id")
              .eq("email", userEmail)
              .single();
            
            if (profile) {
              profileId = profile.id;
            }
          }

          if (profileId) {
            // Get subscription details from Stripe
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            
            const trialEnd = subscription.trial_end 
              ? new Date(subscription.trial_end * 1000).toISOString() 
              : null;
            const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

            // Update or create creator subscription
            const { error: upsertError } = await supabase
              .from("creator_subscriptions")
              .upsert({
                user_id: profileId,
                stripe_customer_id: customerId,
                stripe_subscription_id: subscriptionId,
                status: subscription.status === "trialing" ? "active_trial" : "active",
                trial_ends_at: trialEnd,
                current_period_ends_at: periodEnd,
                package_type: "creator_basic",
                max_videos: 3,
              }, { onConflict: "user_id" });

            if (upsertError) {
              console.error("[CREATOR-WEBHOOK] Error upserting subscription:", upsertError);
            } else {
              console.log(`[CREATOR-WEBHOOK] Subscription saved for user: ${profileId}`);
            }

            // Update profile
            await supabase
              .from("profiles")
              .update({
                is_creator: true,
                creator_subscription_status: subscription.status === "trialing" ? "active_trial" : "active",
              })
              .eq("id", profileId);
          } else {
            console.error("[CREATOR-WEBHOOK] Could not find user for subscription");
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        console.log(`[CREATOR-WEBHOOK] Subscription updated: ${subscription.id}, status: ${subscription.status}`);

        // Find subscription by Stripe customer ID
        const { data: creatorSub } = await supabase
          .from("creator_subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (creatorSub) {
          let status = "active";
          if (subscription.status === "trialing") {
            status = "active_trial";
          } else if (subscription.cancel_at_period_end) {
            status = "cancel_at_period_end";
          } else if (subscription.status === "canceled" || subscription.status === "unpaid") {
            status = "inactive";
          }

          const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

          await supabase
            .from("creator_subscriptions")
            .update({
              status,
              current_period_ends_at: periodEnd,
            })
            .eq("user_id", creatorSub.user_id);

          await supabase
            .from("profiles")
            .update({ creator_subscription_status: status })
            .eq("id", creatorSub.user_id);

          console.log(`[CREATOR-WEBHOOK] Updated subscription status to: ${status}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        console.log(`[CREATOR-WEBHOOK] Subscription deleted: ${subscription.id}`);

        // Find and update subscription
        const { data: creatorSub } = await supabase
          .from("creator_subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (creatorSub) {
          await supabase
            .from("creator_subscriptions")
            .update({ status: "inactive" })
            .eq("user_id", creatorSub.user_id);

          await supabase
            .from("profiles")
            .update({ creator_subscription_status: "inactive" })
            .eq("id", creatorSub.user_id);

          // Deactivate all videos
          await supabase
            .from("creator_videos")
            .update({ is_active: false })
            .eq("user_id", creatorSub.user_id);

          console.log(`[CREATOR-WEBHOOK] Deactivated all videos for user: ${creatorSub.user_id}`);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Check if this is a reactivation payment
        if (invoice.metadata?.type === "video_reactivation" && invoice.metadata?.video_id) {
          const videoId = invoice.metadata.video_id;
          
          console.log(`[CREATOR-WEBHOOK] Processing video reactivation for: ${videoId}`);

          // Get current video
          const { data: video } = await supabase
            .from("creator_videos")
            .select("expires_at, status")
            .eq("id", videoId)
            .single();

          if (video) {
            const now = new Date();
            let newExpiry: Date;

            if (video.status === "expired" || new Date(video.expires_at!) < now) {
              // Expired video: start from now - 30 days
              newExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            } else {
              // Active video: extend from current expiry - 30 days
              newExpiry = new Date(new Date(video.expires_at!).getTime() + 30 * 24 * 60 * 60 * 1000);
            }

            await supabase
              .from("creator_videos")
              .update({
                expires_at: newExpiry.toISOString(),
                is_active: true,
                status: "active",
              })
              .eq("id", videoId);

            console.log(`[CREATOR-WEBHOOK] Video reactivated until: ${newExpiry.toISOString()}`);
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`[CREATOR-WEBHOOK] Payment failed for invoice: ${invoice.id}`);
        // Could send notification to user here
        break;
      }

      default:
        console.log(`[CREATOR-WEBHOOK] Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error(`[CREATOR-WEBHOOK] Error processing event:`, err);
    return new Response(`Webhook Error: ${err.message}`, { status: 500 });
  }
});
