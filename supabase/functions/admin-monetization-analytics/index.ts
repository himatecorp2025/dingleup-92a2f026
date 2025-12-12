import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCorsHeaders } from '../_shared/cors.ts';

const corsHeaders = getCorsHeaders();

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // CoinShop packages for reference
    const COIN_PACKAGES = [
      { coins: 300, price: 1.39 },
      { coins: 500, price: 2.19 },
      { coins: 700, price: 2.99 },
      { coins: 900, price: 3.79 },
      { coins: 1000, price: 3.99 },
      { coins: 1500, price: 5.49 },
      { coins: 2500, price: 8.49 },
      { coins: 3000, price: 9.99 },
      { coins: 5000, price: 14.99 },
    ];

    // Fetch CoinShop purchase events from conversion_events
    const { data: conversionEvents, error: convError } = await supabase
      .from('conversion_events')
      .select('*')
      .eq('product_type', 'coins')
      .order('created_at', { ascending: false });

    if (convError) throw convError;

    // Fetch total users
    const { count: totalUsers, error: usersError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (usersError) throw usersError;

    // Calculate metrics from CoinShop purchases
    // product_view = visited shop, add_to_cart = clicked buy, purchase_complete = completed purchase
    const shopViews = (conversionEvents || []).filter(e => e.event_type === 'product_view');
    const clickedBuy = (conversionEvents || []).filter(e => e.event_type === 'add_to_cart');
    const completedPurchases = (conversionEvents || []).filter(e => e.event_type === 'purchase_complete');

    // Calculate revenue from completed purchases (product_id contains coins amount)
    let totalRevenue = 0;
    const packageStats: Record<string, { count: number; revenue: number }> = {};

    completedPurchases.forEach(p => {
      const coinsAmount = parseInt(p.product_id || '0', 10);
      const pkg = COIN_PACKAGES.find(pk => pk.coins === coinsAmount);
      if (pkg) {
        totalRevenue += pkg.price;
        const key = `${coinsAmount} ${coinsAmount === 1 ? 'coin' : 'coins'}`;
        if (!packageStats[key]) {
          packageStats[key] = { count: 0, revenue: 0 };
        }
        packageStats[key].count += 1;
        packageStats[key].revenue += pkg.price;
      }
    });

    // Paying users (unique users who completed purchases)
    const payingUsersSet = new Set(completedPurchases.map(p => p.user_id));
    const payingUsers = payingUsersSet.size;
    
    const arpu = totalUsers ? totalRevenue / totalUsers : 0;
    const arppu = payingUsers ? totalRevenue / payingUsers : 0;
    const conversionRate = totalUsers ? (payingUsers / totalUsers) * 100 : 0;

    // Revenue over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const revenueByDay: Record<string, number> = {};
    
    completedPurchases
      .filter(p => new Date(p.created_at) >= thirtyDaysAgo)
      .forEach(p => {
        const coinsAmount = parseInt(p.product_id || '0', 10);
        const pkg = COIN_PACKAGES.find(pk => pk.coins === coinsAmount);
        if (pkg) {
          const date = new Date(p.created_at).toISOString().split('T')[0];
          if (!revenueByDay[date]) revenueByDay[date] = 0;
          revenueByDay[date] += pkg.price;
        }
      });

    const revenueOverTime = Object.entries(revenueByDay)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Funnel data for CoinShop
    const shopViewers = new Set(shopViews.map(e => e.user_id)).size;
    const buyClickers = new Set(clickedBuy.map(e => e.user_id)).size;
    const purchaseCompleters = payingUsers;

    const funnelData = {
      shopVisits: shopViewers,
      clickedBuy: buyClickers,
      completedPurchase: purchaseCompleters,
      viewToClickRate: shopViewers > 0 ? (buyClickers / shopViewers) * 100 : 0,
      clickToCompleteRate: buyClickers > 0 ? (purchaseCompleters / buyClickers) * 100 : 0,
      overallConversionRate: shopViewers > 0 ? (purchaseCompleters / shopViewers) * 100 : 0,
    };

    console.log('[admin-monetization-analytics] CoinShop metrics:', {
      totalRevenue,
      payingUsers,
      totalUsers,
      shopVisits: shopViewers,
      completedPurchases: completedPurchases.length
    });

    return new Response(JSON.stringify({
      totalRevenue,
      arpu,
      arppu,
      conversionRate,
      totalUsers: totalUsers || 0,
      payingUsers,
      revenueOverTime,
      funnelData,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in admin-monetization-analytics:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});