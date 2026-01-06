import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LogOut } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useI18n } from '@/i18n';
import { useLeaderboardQuery } from '@/hooks/queries/useLeaderboardQuery';
import { useProfileQuery } from '@/hooks/useProfileQuery';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useNativeFullscreen } from '@/hooks/useNativeFullscreen';

import DailyRewards from '@/components/DailyRewards';
import { DailyRankingsCountdown } from '@/components/DailyRankingsCountdown';
import { LeaderboardSkeleton } from '@/components/LeaderboardSkeleton';
import BottomNav from '@/components/BottomNav';

const Leaderboard = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [userId, setUserId] = useState<string | undefined>();
  const { profile } = useProfileQuery(userId);
  const { leaderboard, dailyRewards, loading, refetch } = useLeaderboardQuery(profile?.country_code);
  
  // FULLSCREEN MODE: Hide status bar on mobile devices (Web)
  useFullscreen({
    enabled: true,
    autoReenter: true,
  });

  // NATIVE FULLSCREEN: Hide status bar on iOS/Android Capacitor apps
  useNativeFullscreen();
  
  // Pull-to-refresh functionality
  const { isPulling, pullProgress } = usePullToRefresh({
    onRefresh: async () => {
      await refetch();
    },
    threshold: 80,
    disabled: false
  });

  // Platform detection for conditional padding
  const [isStandalone, setIsStandalone] = useState(false);
  
  useEffect(() => {
    const checkStandalone = () => {
      const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                    (window.navigator as any).standalone === true ||
                    document.referrer.includes('android-app://');
      setIsStandalone(isPWA);
    };
    checkStandalone();
  }, []);

  // Get user session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
      } else {
        navigate('/auth/login');
      }
    });
  }, [navigate]);

  // Calculate user's rank and stats from leaderboard data
  const userRank = userId && leaderboard.length > 0
    ? leaderboard.findIndex(entry => entry.user_id === userId) + 1 || null
    : null;

  const userCorrectAnswers = profile?.total_correct_answers || 0;
  const userUsername = profile?.username || null;

  return (
    <div className="h-dvh w-screen overflow-hidden flex flex-col relative">
      {/* Pull-to-refresh indicator */}
      {isPulling && (
        <div 
          className="fixed top-0 left-0 right-0 z-50 flex justify-center items-center pointer-events-none"
          style={{ 
            height: `${pullProgress * 60}px`,
            opacity: pullProgress,
            paddingTop: 'env(safe-area-inset-top, 0px)'
          }}
        >
          <div className="animate-spin rounded-full border-b-2 border-yellow-400" style={{ width: 'clamp(24px, 5vw, 32px)', height: 'clamp(24px, 5vw, 32px)' }} />
        </div>
      )}
      {/* Dynamic Island Safe Area - matches Hero component */}
      <div 
        className="absolute top-0 left-0 right-0 pointer-events-none z-50"
        style={{ 
          height: 'env(safe-area-inset-top, 0px)',
        }}
      />
      
      {/* Background Gradient - EXTENDS BEYOND ALL SAFE AREAS */}
      <div 
        className="fixed pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, hsl(280 90% 8%) 0%, hsl(280 80% 12%) 25%, hsl(280 70% 18%) 50%, hsl(280 60% 15%) 75%, hsl(280 80% 10%) 100%)',
          top: 'calc(-1 * env(safe-area-inset-top, 0px))',
          left: 'calc(-1 * env(safe-area-inset-left, 0px))',
          right: 'calc(-1 * env(safe-area-inset-right, 0px))',
          bottom: 'calc(-1 * env(safe-area-inset-bottom, 0px))',
          width: 'calc(100vw + env(safe-area-inset-left, 0px) + env(safe-area-inset-right, 0px))',
          height: 'calc(100dvh + env(safe-area-inset-top, 0px) + env(safe-area-inset-bottom, 0px))',
        }}
      />
      
      {/* Back Button - Fixed position like Invitation page */}
      <div className="fixed left-4 z-50 pt-safe" style={{ top: 'calc(env(safe-area-inset-top, 0px) + clamp(12px, 2vh, 16px))' }}>
        <button
          onClick={() => navigate('/dashboard')}
          className="relative rounded-full hover:scale-110 transition-all"
          style={{
            padding: 'clamp(8px, 2vw, 12px)',
            minWidth: 'clamp(40px, 10vw, 56px)',
            minHeight: 'clamp(40px, 10vw, 56px)'
          }}
          title={t('leaderboard.back_aria')}
          aria-label={t('leaderboard.back_aria')}
        >
              {/* BASE SHADOW */}
              <div className="absolute inset-0 bg-black/40 rounded-full" style={{ transform: 'translate(3px, 3px)', filter: 'blur(4px)' }} aria-hidden />
              
              {/* OUTER FRAME */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-700 via-red-600 to-red-900 border-2 border-red-400/50 shadow-lg" aria-hidden />
              
              {/* MIDDLE FRAME */}
              <div className="absolute inset-[3px] rounded-full bg-gradient-to-b from-red-600 via-red-500 to-red-800" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)' }} aria-hidden />
              
              {/* INNER LAYER */}
              <div className="absolute inset-[5px] rounded-full bg-gradient-to-b from-red-500 via-red-600 to-red-700" style={{ boxShadow: 'inset 0 8px 16px rgba(255,255,255,0.2), inset 0 -8px 16px rgba(0,0,0,0.3)' }} aria-hidden />
              
              {/* SPECULAR HIGHLIGHT */}
              <div className="absolute inset-[5px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse 100% 60% at 30% 0%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 30%, transparent 60%)' }} aria-hidden />
              
          {/* Icon */}
          <LogOut 
            className="text-white relative z-10 -scale-x-100" 
            style={{ width: 'clamp(20px, 5vw, 24px)', height: 'clamp(20px, 5vw, 24px)' }}
          />
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden relative z-10" style={{ 
        width: 'clamp(320px, 90vw, 90vw)',
        maxWidth: 'clamp(320px, 90vw, 672px)',
        margin: '0 auto',
        paddingTop: 'clamp(60px, 10vh, 80px)',
        paddingBottom: 'calc(var(--bottom-nav-h) + env(safe-area-inset-bottom) + clamp(80px, 15vh, 100px))'
      }}>
        <div className="w-full flex flex-col">

        {/* Title */}
        <h1 
          className="font-black text-center"
          style={{
            fontSize: 'clamp(1.125rem, 4vh, 1.875rem)',
            marginBottom: 'clamp(8px, 1.5vh, 12px)',
            background: 'linear-gradient(135deg, hsl(45 100% 70%), hsl(45 100% 60%), hsl(45 95% 55%))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 16px hsla(45, 100%, 65%, 0.8)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6))'
          }}
        >
          🏆 {t('leaderboard.title')} 🏆
        </h1>

        {/* Countdown Timer - below title */}
        <div className="flex justify-center" style={{ marginBottom: 'clamp(8px, 1.5vh, 12px)' }}>
          <DailyRankingsCountdown compact={false} userTimezone={profile?.user_timezone || 'Europe/Budapest'} />
        </div>

        {/* Daily Rewards Section with Top 10 */}
        {loading ? (
          <LeaderboardSkeleton />
        ) : (
          <DailyRewards 
            topPlayers={leaderboard.slice(0, 10).map(p => ({
              username: p.username,
              total_correct_answers: p.total_correct_answers,
              avatar_url: p.avatar_url
            }))}
            userRank={userRank}
            userUsername={userUsername}
            userCorrectAnswers={userCorrectAnswers}
            dailyRewards={dailyRewards}
          />
        )}

        </div>
      </div>

    <BottomNav />
  </div>
);
};

export default Leaderboard;
