import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import BottomNav from '@/components/BottomNav';
import { useI18n } from '@/i18n';

interface InvitedFriend {
  id: string;
  invited_email: string | null;
  invited_user_id: string | null;
  invited_user?: {
    username: string;
    avatar_url: string | null;
  };
  accepted: boolean;
  created_at: string;
  accepted_at: string | null;
}

const Invitation = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [userId, setUserId] = useState<string>('');
  const [invitationCode, setInvitationCode] = useState('');
  const [invitationLink, setInvitationLink] = useState('');
  const [invitedCount, setInvitedCount] = useState(0);
  const [invitedFriends, setInvitedFriends] = useState<InvitedFriend[]>([]);
  const [currentLives, setCurrentLives] = useState<number>(0);
  
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        fetchInvitationData(session.user.id);
      } else {
        navigate('/auth/login');
      }
    });
  }, [navigate]);

  const fetchInvitationData = async (uid: string) => {
    try {
      // Get user's invitation code and lives
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('invitation_code, lives')
        .eq('id', uid)
        .single();

      if (profileError) throw profileError;

      setInvitationCode(profile.invitation_code);
      setCurrentLives(profile.lives || 0);
      setInvitationLink(`${window.location.origin}/auth/register?code=${profile.invitation_code}`);

      // Get all invitations with user details (accepted and pending)
      const { data: invitations, error: invitationsError } = await supabase
        .from('invitations')
        .select(`
          *,
          invited_user:profiles!invited_user_id (
            username,
            avatar_url
          )
        `)
        .eq('inviter_id', uid)
        .order('created_at', { ascending: false });

      if (invitationsError) throw invitationsError;
      
      setInvitedFriends(invitations || []);
      setInvitedCount(invitations?.filter(i => i.accepted).length || 0);
    } catch (error) {
      console.error('Error fetching invitation data:', error);
      toast.error(t('invitation.error_loading_data'));
    }
  };

  const copyToClipboard = async (text: string, type: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(type === 'code' ? t('invitation.code_copied') : t('invitation.link_copied'));
    } catch (error) {
      console.error('Error copying:', error);
      toast.error(t('invitation.error_copying'));
    }
  };

  const getRewardForCount = (count: number) => {
    // 1-2 friends: 200 coins + 3 lives each
    if (count === 1 || count === 2) return { coins: 200, lives: 3 };
    // 3-9 friends: 1000 coins + 5 lives each
    if (count >= 3 && count <= 9) return { coins: 1000, lives: 5 };
    // 10+ friends: 6000 coins + 20 lives each
    if (count >= 10) return { coins: 6000, lives: 20 };
    return { coins: 0, lives: 0 };
  };
  
  const getTotalRewards = () => {
    const accepted = invitedFriends.filter(i => i.accepted).length;
    let totalCoins = 0;
    let totalLives = 0;
    
    for (let i = 1; i <= accepted; i++) {
      const reward = getRewardForCount(i);
      totalCoins += reward.coins;
      totalLives += reward.lives;
    }
    
    return { totalCoins, totalLives };
  };
  
  const { totalCoins, totalLives } = getTotalRewards();

  return (
    <div className="h-dvh h-svh w-screen bg-gradient-to-b from-[#0a0a2e] via-[#16213e] to-[#0f0f3d] overflow-hidden fixed inset-0" style={{
      paddingTop: 'max(calc(env(safe-area-inset-top) + 2%), env(safe-area-inset-top) + 8px)',
      paddingBottom: 'env(safe-area-inset-bottom)'
    }}>
      {/* Back Button - 3D Round Style */}
      <div className="fixed left-4 z-50 pt-safe" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}>
        <button
          onClick={() => navigate('/dashboard')}
          className="relative rounded-full hover:scale-110 transition-all"
          style={{
            padding: 'clamp(8px, 2vw, 12px)',
            minWidth: 'clamp(40px, 10vw, 56px)',
            minHeight: 'clamp(40px, 10vw, 56px)'
          }}
          title={t('invitation.back_to_dashboard')}
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

      <div className="h-full w-full overflow-y-auto overflow-x-hidden relative z-10" style={{ paddingBottom: 'calc(var(--bottom-nav-h, 80px) + env(safe-area-inset-bottom) + 40px)' }}>
        <div className="mx-auto" style={{ width: 'clamp(320px, 90vw, 672px)', paddingTop: 'clamp(3rem, 8vh, 5rem)' }}>
        {/* Header */}
        <div className="text-center mb-[2vh]">
          <div className="flex items-center justify-center gap-[1.5vh] mb-[1vh]">
            <svg className="text-purple-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 'clamp(1.5rem, 4vh, 2rem)', height: 'clamp(1.5rem, 4vh, 2rem)' }}>
              <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h1 className="font-black text-white" style={{ fontSize: 'clamp(1.25rem, 4vh, 1.875rem)' }}>{t('invitation.header_title')}</h1>
          </div>
          <p className="text-white/70" style={{ fontSize: 'clamp(0.875rem, 2vh, 1rem)' }}>{t('invitation.header_subtitle')}</p>
        </div>

        {/* Current Lives Display with 3D Heart */}
        <div className="flex items-center justify-center gap-[2vh] mb-[3vh] mt-[2vh]">
          {/* 3D Heart SVG */}
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ width: 'clamp(3rem, 8vh, 4rem)', height: 'clamp(3rem, 8vh, 4rem)' }}>
            {/* Shadow Layer */}
            <path 
              d="M50 85 C30 70, 10 55, 10 35 C10 20, 20 10, 30 10 C40 10, 45 15, 50 25 C55 15, 60 10, 70 10 C80 10, 90 20, 90 35 C90 55, 70 70, 50 85 Z"
              fill="rgba(0,0,0,0.3)"
              transform="translate(2,2)"
              filter="blur(3px)"
            />
            
            {/* Base Heart */}
            <path 
              d="M50 85 C30 70, 10 55, 10 35 C10 20, 20 10, 30 10 C40 10, 45 15, 50 25 C55 15, 60 10, 70 10 C80 10, 90 20, 90 35 C90 55, 70 70, 50 85 Z"
              fill="url(#heartGradient)"
              stroke="#c0392b"
              strokeWidth="2"
            />
            
            {/* Top Highlight */}
            <path 
              d="M50 85 C30 70, 10 55, 10 35 C10 20, 20 10, 30 10 C40 10, 45 15, 50 25 C55 15, 60 10, 70 10 C80 10, 90 20, 90 35 C90 55, 70 70, 50 85 Z"
              fill="url(#heartHighlight)"
              opacity="0.7"
            />
            
            {/* Specular Shine */}
            <ellipse 
              cx="35" 
              cy="30" 
              rx="15" 
              ry="12" 
              fill="rgba(255,255,255,0.5)"
              filter="blur(4px)"
            />
            
            {/* Inner Shadow */}
            <path 
              d="M50 85 C30 70, 10 55, 10 35 C10 20, 20 10, 30 10 C40 10, 45 15, 50 25 C55 15, 60 10, 70 10 C80 10, 90 20, 90 35 C90 55, 70 70, 50 85 Z"
              fill="none"
              stroke="rgba(0,0,0,0.3)"
              strokeWidth="1"
              style={{ mixBlendMode: 'multiply' }}
            />
            
            {/* Gradients */}
            <defs>
              <linearGradient id="heartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#e74c3c" />
                <stop offset="40%" stopColor="#c0392b" />
                <stop offset="100%" stopColor="#922b21" />
              </linearGradient>
              
              <linearGradient id="heartHighlight" x1="0%" y1="0%" x2="0%" y2="50%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Lives Text */}
          <div className="text-white">
            <span className="font-black uppercase" style={{ 
              fontSize: 'clamp(1rem, 3vh, 1.5rem)',
              textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000'
            }}>
              {t('invitation.current_lives')}: <span className="text-red-400" style={{ fontSize: 'clamp(1.25rem, 4vh, 1.875rem)' }}>{currentLives}</span>
            </span>
          </div>
        </div>

        <div className="space-y-[2vh]">
          {/* Invitation Code - 3D Box Style */}
          <div className="relative rounded-xl overflow-hidden" style={{ padding: 'clamp(0.75rem, 2vh, 1rem)' }}>
            {/* BASE SHADOW */}
            <div className="absolute inset-0 bg-black/40 rounded-xl" style={{ transform: 'translate(4px, 4px)', filter: 'blur(6px)' }} aria-hidden />
            
            {/* OUTER FRAME */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-700 via-purple-600 to-purple-900 border-2 border-purple-400/50 shadow-lg" aria-hidden />
            
            {/* MIDDLE FRAME */}
            <div className="absolute inset-[3px] rounded-xl bg-gradient-to-b from-purple-600 via-purple-500 to-purple-800" style={{ boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.3)' }} aria-hidden />
            
            {/* INNER LAYER */}
            <div className="absolute inset-[5px] rounded-xl bg-gradient-to-b from-purple-500/40 via-purple-600/40 to-purple-700/40" style={{ boxShadow: 'inset 0 8px 20px rgba(255,255,255,0.15), inset 0 -8px 20px rgba(0,0,0,0.4)' }} aria-hidden />
            
            {/* SPECULAR HIGHLIGHT */}
            <div className="absolute inset-[5px] rounded-xl pointer-events-none" style={{ background: 'radial-gradient(ellipse 120% 80% at 30% 10%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.15) 40%, transparent 70%)' }} aria-hidden />
            
            <div className="relative z-10">
              <label className="font-bold block text-white drop-shadow-lg" style={{ fontSize: 'clamp(0.75rem, 1.8vh, 0.875rem)', marginBottom: 'clamp(0.25rem, 1vh, 0.5rem)' }}>{t('invitation.code_label')}</label>
              <div className="flex gap-[1vh]">
                <input
                  type="text"
                  value={invitationCode}
                  readOnly
                  className="flex-1 bg-black/40 border-2 border-purple-500/50 rounded-lg font-mono text-center text-white"
                  style={{ 
                    padding: 'clamp(0.5rem, 1.5vh, 0.75rem)',
                    fontSize: 'clamp(0.875rem, 2.2vh, 1.125rem)'
                  }}
                />
                <Button
                  onClick={() => copyToClipboard(invitationCode, 'code')}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  style={{ padding: 'clamp(0.5rem, 1.5vh, 1rem)' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 'clamp(1rem, 2.5vh, 1.25rem)', height: 'clamp(1rem, 2.5vh, 1.25rem)' }}>
                    <path d="M20 9H11C9.89543 9 9 9.89543 9 11V20C9 21.1046 9.89543 22 11 22H20C21.1046 22 22 21.1046 22 20V11C22 9.89543 21.1046 9 20 9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5 15H4C3.46957 15 2.96086 14.7893 2.58579 14.4142C2.21071 14.0391 2 13.5304 2 13V4C2 3.46957 2.21071 2.96086 2.58579 2.58579C2.96086 2.21071 3.46957 2 4 2H13C13.5304 2 14.0391 2.21071 14.4142 2.58579C14.7893 2.96086 15 3.46957 15 4V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Button>
              </div>
            </div>
          </div>

          {/* Invitation Link - 3D Box Style */}
          <div className="relative rounded-xl overflow-hidden" style={{ padding: 'clamp(0.75rem, 2vh, 1rem)' }}>
            {/* BASE SHADOW */}
            <div className="absolute inset-0 bg-black/40 rounded-xl" style={{ transform: 'translate(4px, 4px)', filter: 'blur(6px)' }} aria-hidden />
            
            {/* OUTER FRAME */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-700 via-purple-600 to-purple-900 border-2 border-purple-400/50 shadow-lg" aria-hidden />
            
            {/* MIDDLE FRAME */}
            <div className="absolute inset-[3px] rounded-xl bg-gradient-to-b from-purple-600 via-purple-500 to-purple-800" style={{ boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.3)' }} aria-hidden />
            
            {/* INNER LAYER */}
            <div className="absolute inset-[5px] rounded-xl bg-gradient-to-b from-purple-500/40 via-purple-600/40 to-purple-700/40" style={{ boxShadow: 'inset 0 8px 20px rgba(255,255,255,0.15), inset 0 -8px 20px rgba(0,0,0,0.4)' }} aria-hidden />
            
            {/* SPECULAR HIGHLIGHT */}
            <div className="absolute inset-[5px] rounded-xl pointer-events-none" style={{ background: 'radial-gradient(ellipse 120% 80% at 30% 10%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.15) 40%, transparent 70%)' }} aria-hidden />
            
            <div className="relative z-10">
              <label className="font-bold block text-white drop-shadow-lg" style={{ fontSize: 'clamp(0.75rem, 1.8vh, 0.875rem)', marginBottom: 'clamp(0.25rem, 1vh, 0.5rem)' }}>{t('invitation.link_label')}</label>
              <div className="flex gap-[1vh]">
                <input
                  type="text"
                  value={invitationLink}
                  readOnly
                  className="flex-1 bg-black/40 border-2 border-purple-500/50 rounded-lg text-white overflow-hidden text-ellipsis"
                  style={{ 
                    padding: 'clamp(0.5rem, 1.5vh, 0.75rem)',
                    fontSize: 'clamp(0.75rem, 1.8vh, 0.875rem)'
                  }}
                />
                <Button
                  onClick={() => copyToClipboard(invitationLink, 'link')}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  style={{ padding: 'clamp(0.5rem, 1.5vh, 1rem)' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 'clamp(1rem, 2.5vh, 1.25rem)', height: 'clamp(1rem, 2.5vh, 1.25rem)' }}>
                    <path d="M20 9H11C9.89543 9 9 9.89543 9 11V20C9 21.1046 9.89543 22 11 22H20C21.1046 22 22 21.1046 22 20V11C22 9.89543 21.1046 9 20 9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5 15H4C3.46957 15 2.96086 14.7893 2.58579 14.4142C2.21071 14.0391 2 13.5304 2 13V4C2 3.46957 2.21071 2.96086 2.58579 2.58579C2.96086 2.21071 3.46957 2 4 2H13C13.5304 2 14.0391 2.21071 14.4142 2.58579C14.7893 2.96086 15 3.46957 15 4V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Button>
              </div>
            </div>
          </div>

          {/* Total Rewards Summary - 3D Box Style */}
          <div className="relative rounded-xl overflow-hidden" style={{ padding: 'clamp(0.75rem, 2vh, 1rem)', marginBottom: 'clamp(0.75rem, 2vh, 1rem)' }}>
            {/* BASE SHADOW */}
            <div className="absolute inset-0 bg-black/40 rounded-xl" style={{ transform: 'translate(4px, 4px)', filter: 'blur(6px)' }} aria-hidden />
            
            {/* OUTER FRAME */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-yellow-700 via-yellow-600 to-orange-900 border-2 border-yellow-400/50 shadow-lg shadow-yellow-500/20" aria-hidden />
            
            {/* MIDDLE FRAME */}
            <div className="absolute inset-[3px] rounded-xl bg-gradient-to-b from-yellow-600 via-orange-500 to-orange-800" style={{ boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.3)' }} aria-hidden />
            
            {/* INNER LAYER */}
            <div className="absolute inset-[5px] rounded-xl bg-gradient-to-b from-yellow-500/40 via-orange-600/40 to-orange-700/40" style={{ boxShadow: 'inset 0 8px 20px rgba(255,255,255,0.15), inset 0 -8px 20px rgba(0,0,0,0.4)' }} aria-hidden />
            
            {/* SPECULAR HIGHLIGHT */}
            <div className="absolute inset-[5px] rounded-xl pointer-events-none" style={{ background: 'radial-gradient(ellipse 120% 80% at 30% 10%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.18) 40%, transparent 70%)' }} aria-hidden />
            
            
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-[1vh]" style={{ marginBottom: 'clamp(0.5rem, 1.5vh, 0.75rem)' }}>
                <svg className="text-yellow-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 'clamp(1rem, 3vh, 1.5rem)', height: 'clamp(1rem, 3vh, 1.5rem)' }}>
                  <path d="M20 12V22H4V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 7H2V12H22V7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 22V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 7H7.5C6.83696 7 6.20107 6.73661 5.73223 6.26777C5.26339 5.79893 5 5.16304 5 4.5C5 3.83696 5.26339 3.20107 5.73223 2.73223C6.20107 2.26339 6.83696 2 7.5 2C11 2 12 7 12 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 7H16.5C17.163 7 17.7989 6.73661 18.2678 6.26777C18.7366 5.79893 19 5.16304 19 4.5C19 3.83696 18.7366 3.20107 18.2678 2.73223C17.7989 2.26339 17.163 2 16.5 2C13 2 12 7 12 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <h2 className="font-black text-white" style={{ fontSize: 'clamp(1rem, 2.5vh, 1.25rem)' }}>{t('invitation.total_rewards')}</h2>
              </div>
              <div className="flex justify-center gap-[3vh]">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-[0.5vh] text-yellow-400 font-black" style={{ fontSize: 'clamp(1rem, 3vh, 1.5rem)' }}>
                    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ width: 'clamp(1rem, 3vh, 1.5rem)', height: 'clamp(1rem, 3vh, 1.5rem)' }}>
                      <circle cx="12" cy="12" r="9" fill="currentColor" stroke="#d97706" strokeWidth="2"/>
                      <circle cx="12" cy="12" r="6" fill="none" stroke="#d97706" strokeWidth="1.5" opacity="0.5"/>
                      <text x="12" y="16" textAnchor="middle" fill="#d97706" fontSize="10" fontWeight="bold">$</text>
                    </svg>
                    {totalCoins}
                  </div>
                  <p className="text-white/70" style={{ fontSize: 'clamp(0.625rem, 1.5vh, 0.75rem)' }}>{t('invitation.gold_coins')}</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-[0.5vh] text-red-400 font-black" style={{ fontSize: 'clamp(1rem, 3vh, 1.5rem)' }}>
                    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ width: 'clamp(1rem, 3vh, 1.5rem)', height: 'clamp(1rem, 3vh, 1.5rem)' }}>
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="#dc2626" strokeWidth="1.5"/>
                    </svg>
                    {totalLives}
                  </div>
                  <p className="text-white/70" style={{ fontSize: 'clamp(0.625rem, 1.5vh, 0.75rem)' }}>{t('invitation.lives')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Rewards Section - Tier based - 3D Box Style */}
          <div className="relative rounded-xl overflow-hidden" style={{ padding: 'clamp(0.75rem, 2.5vh, 1.25rem)' }}>
            {/* BASE SHADOW */}
            <div className="absolute inset-0 bg-black/40 rounded-xl" style={{ transform: 'translate(4px, 4px)', filter: 'blur(6px)' }} aria-hidden />
            
            {/* OUTER FRAME */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-yellow-700 via-purple-600 to-purple-900 border-2 border-yellow-400/40 shadow-lg" aria-hidden />
            
            {/* MIDDLE FRAME */}
            <div className="absolute inset-[3px] rounded-xl bg-gradient-to-b from-yellow-600 via-purple-500 to-purple-800" style={{ boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.25)' }} aria-hidden />
            
            {/* INNER LAYER */}
            <div className="absolute inset-[5px] rounded-xl bg-gradient-to-b from-yellow-500/30 via-purple-600/30 to-purple-700/30" style={{ boxShadow: 'inset 0 8px 20px rgba(255,255,255,0.12), inset 0 -8px 20px rgba(0,0,0,0.4)' }} aria-hidden />
            
            {/* SPECULAR HIGHLIGHT */}
            <div className="absolute inset-[5px] rounded-xl pointer-events-none" style={{ background: 'radial-gradient(ellipse 120% 80% at 30% 10%, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.12) 40%, transparent 70%)' }} aria-hidden />
            
            
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-[1vh]" style={{ marginBottom: 'clamp(0.75rem, 2vh, 1rem)' }}>
                <svg className="text-yellow-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 'clamp(1rem, 3vh, 1.5rem)', height: 'clamp(1rem, 3vh, 1.5rem)' }}>
                  <path d="M6 9H4.5C4.10218 9 3.72064 9.15804 3.43934 9.43934C3.15804 9.72064 3 10.1022 3 10.5V19.5C3 19.8978 3.15804 20.2794 3.43934 20.5607C3.72064 20.842 4.10218 21 4.5 21H19.5C19.8978 21 20.2794 20.842 20.5607 20.5607C20.842 20.2794 21 19.8978 21 19.5V10.5C21 10.1022 20.842 9.72064 20.5607 9.43934C20.2794 9.15804 19.8978 9 19.5 9H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 3L6 9H18L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 9V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <h2 className="font-black text-white" style={{ fontSize: 'clamp(1rem, 2.5vh, 1.25rem)' }}>{t('invitation.reward_levels')}</h2>
              </div>
              
              <div className="space-y-[1vh]">
                <div className={`flex items-center justify-between rounded-lg border-2 ${
                  invitedCount >= 1 ? 'bg-purple-600/30 border-purple-400' : 'bg-black/40 border-purple-500/30'
                }`} style={{ padding: 'clamp(0.5rem, 1.5vh, 0.75rem)' }}>
                  <span className="text-white font-bold" style={{ fontSize: 'clamp(0.75rem, 1.8vh, 0.875rem)' }}>{t('invitation.tier_1_2')} {invitedCount >= 1 && '✓'}</span>
                  <div className="flex gap-[1vh]" style={{ fontSize: 'clamp(0.625rem, 1.5vh, 0.75rem)' }}>
                    <span className="flex items-center gap-[0.5vh] text-white">
                      <svg className="text-yellow-500" viewBox="0 0 24 24" fill="currentColor" style={{ width: 'clamp(0.625rem, 1.5vh, 0.75rem)', height: 'clamp(0.625rem, 1.5vh, 0.75rem)' }}>
                        <circle cx="12" cy="12" r="9" fill="currentColor" stroke="#d97706" strokeWidth="2"/>
                        <circle cx="12" cy="12" r="6" fill="none" stroke="#d97706" strokeWidth="1.5" opacity="0.5"/>
                        <text x="12" y="16" textAnchor="middle" fill="#d97706" fontSize="10" fontWeight="bold">$</text>
                      </svg>
                      {t('invitation.per_person')}
                    </span>
                    <span className="flex items-center gap-[0.5vh] text-white">
                      <svg className="text-red-500" viewBox="0 0 24 24" fill="currentColor" style={{ width: 'clamp(0.625rem, 1.5vh, 0.75rem)', height: 'clamp(0.625rem, 1.5vh, 0.75rem)' }}>
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="#dc2626" strokeWidth="1.5"/>
                      </svg>
                      {t('invitation.per_person_lives')}
                    </span>
                  </div>
                </div>

                <div className={`flex items-center justify-between rounded-lg border-2 ${
                  invitedCount >= 3 ? 'bg-purple-600/30 border-purple-400' : 'bg-black/40 border-purple-500/30'
                }`} style={{ padding: 'clamp(0.5rem, 1.5vh, 0.75rem)' }}>
                  <span className="text-white font-bold" style={{ fontSize: 'clamp(0.75rem, 1.8vh, 0.875rem)' }}>{t('invitation.tier_3_9')} {invitedCount >= 3 && '✓'}</span>
                  <div className="flex gap-[1vh]" style={{ fontSize: 'clamp(0.625rem, 1.5vh, 0.75rem)' }}>
                    <span className="flex items-center gap-[0.5vh] text-white">
                      <svg className="text-yellow-500" viewBox="0 0 24 24" fill="currentColor" style={{ width: 'clamp(0.625rem, 1.5vh, 0.75rem)', height: 'clamp(0.625rem, 1.5vh, 0.75rem)' }}>
                        <circle cx="12" cy="12" r="9" fill="currentColor" stroke="#d97706" strokeWidth="2"/>
                        <circle cx="12" cy="12" r="6" fill="none" stroke="#d97706" strokeWidth="1.5" opacity="0.5"/>
                        <text x="12" y="16" textAnchor="middle" fill="#d97706" fontSize="10" fontWeight="bold">$</text>
                      </svg>
                      {t('invitation.tier_3_9_coins')}
                    </span>
                    <span className="flex items-center gap-[0.5vh] text-white">
                      <svg className="text-red-500" viewBox="0 0 24 24" fill="currentColor" style={{ width: 'clamp(0.625rem, 1.5vh, 0.75rem)', height: 'clamp(0.625rem, 1.5vh, 0.75rem)' }}>
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="#dc2626" strokeWidth="1.5"/>
                      </svg>
                      {t('invitation.tier_3_9_lives')}
                    </span>
                  </div>
                </div>

                <div className={`flex items-center justify-between rounded-lg border-2 ${
                  invitedCount >= 10 ? 'bg-purple-600/30 border-purple-400' : 'bg-black/40 border-purple-500/30'
                }`} style={{ padding: 'clamp(0.5rem, 1.5vh, 0.75rem)' }}>
                  <span className="text-white font-bold" style={{ fontSize: 'clamp(0.75rem, 1.8vh, 0.875rem)' }}>{t('invitation.tier_10_plus')} {invitedCount >= 10 && '✓'}</span>
                  <div className="flex gap-[1vh]" style={{ fontSize: 'clamp(0.625rem, 1.5vh, 0.75rem)' }}>
                    <span className="flex items-center gap-[0.5vh] text-white">
                      <svg className="text-yellow-500" viewBox="0 0 24 24" fill="currentColor" style={{ width: 'clamp(0.625rem, 1.5vh, 0.75rem)', height: 'clamp(0.625rem, 1.5vh, 0.75rem)' }}>
                        <circle cx="12" cy="12" r="9" fill="currentColor" stroke="#d97706" strokeWidth="2"/>
                        <circle cx="12" cy="12" r="6" fill="none" stroke="#d97706" strokeWidth="1.5" opacity="0.5"/>
                        <text x="12" y="16" textAnchor="middle" fill="#d97706" fontSize="10" fontWeight="bold">$</text>
                      </svg>
                      {t('invitation.tier_10_plus_coins')}
                    </span>
                    <span className="flex items-center gap-[0.5vh] text-white">
                      <svg className="text-red-500" viewBox="0 0 24 24" fill="currentColor" style={{ width: 'clamp(0.625rem, 1.5vh, 0.75rem)', height: 'clamp(0.625rem, 1.5vh, 0.75rem)' }}>
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="#dc2626" strokeWidth="1.5"/>
                      </svg>
                      {t('invitation.tier_10_plus_lives')}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-white/60 text-center" style={{ fontSize: 'clamp(0.625rem, 1.5vh, 0.75rem)', marginTop: 'clamp(0.75rem, 2vh, 1rem)' }}>
                {t('invitation.reset_notice')}
              </p>
            </div>
          </div>

          {/* Invited Friends List - 3D Box Style */}
          <div className="relative rounded-xl overflow-hidden" style={{ padding: 'clamp(0.75rem, 2.5vh, 1.25rem)' }}>
            {/* BASE SHADOW */}
            <div className="absolute inset-0 bg-black/40 rounded-xl" style={{ transform: 'translate(4px, 4px)', filter: 'blur(6px)' }} aria-hidden />
            
            {/* OUTER FRAME */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-700 via-purple-600 to-purple-900 border-2 border-purple-400/40 shadow-lg shadow-purple-500/20" aria-hidden />
            
            {/* MIDDLE FRAME */}
            <div className="absolute inset-[3px] rounded-xl bg-gradient-to-b from-purple-600 via-purple-500 to-purple-800" style={{ boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.25)' }} aria-hidden />
            
            {/* INNER LAYER */}
            <div className="absolute inset-[5px] rounded-xl bg-gradient-to-b from-purple-500/30 via-purple-600/30 to-purple-700/30" style={{ boxShadow: 'inset 0 8px 20px rgba(255,255,255,0.12), inset 0 -8px 20px rgba(0,0,0,0.4)' }} aria-hidden />
            
            {/* SPECULAR HIGHLIGHT */}
            <div className="absolute inset-[5px] rounded-xl pointer-events-none" style={{ background: 'radial-gradient(ellipse 120% 80% at 30% 10%, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.12) 40%, transparent 70%)' }} aria-hidden />
            
            
            <div className="relative z-10">
              <h2 className="font-black text-white flex items-center gap-[1vh]" style={{ fontSize: 'clamp(0.875rem, 2.2vh, 1.125rem)', marginBottom: 'clamp(0.75rem, 2vh, 1rem)' }}>
                <svg className="text-purple-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 'clamp(1rem, 2.5vh, 1.25rem)', height: 'clamp(1rem, 2.5vh, 1.25rem)' }}>
                  <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {t('invitation.invited_friends')} ({invitedFriends.length})
              </h2>
              
              {invitedFriends.length === 0 ? (
                <p className="text-white/60 text-center" style={{ padding: 'clamp(0.75rem, 2vh, 1rem)', fontSize: 'clamp(0.75rem, 1.8vh, 0.875rem)' }}>{t('invitation.no_invitations')}</p>
              ) : (
                <div className="space-y-[1vh] overflow-y-auto" style={{ maxHeight: 'clamp(20rem, 40vh, 24rem)' }}>
                  {invitedFriends.map((friend) => (
                    <div
                      key={friend.id}
                      className={`flex items-center justify-between rounded-lg border ${
                        friend.accepted
                          ? 'bg-green-900/20 border-green-500/30'
                          : 'bg-black/40 border-purple-500/20'
                      }`}
                      style={{ padding: 'clamp(0.5rem, 1.5vh, 0.75rem)' }}
                    >
                      <div className="flex items-center gap-[1.5vh]">
                        {friend.accepted ? (
                          <svg className="text-green-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 'clamp(1rem, 2.5vh, 1.25rem)', height: 'clamp(1rem, 2.5vh, 1.25rem)' }}>
                            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : (
                          <svg className="text-gray-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 'clamp(1rem, 2.5vh, 1.25rem)', height: 'clamp(1rem, 2.5vh, 1.25rem)' }}>
                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        <div>
                          <p className="text-white font-medium" style={{ fontSize: 'clamp(0.75rem, 1.8vh, 0.875rem)' }}>
                            {friend.invited_user?.username || friend.invited_email || t('invitation.pending')}
                          </p>
                          <p className="text-white/60" style={{ fontSize: 'clamp(0.625rem, 1.5vh, 0.75rem)' }}>
                            {friend.accepted 
                              ? `${t('invitation.joined_at')}: ${new Date(friend.accepted_at!).toLocaleDateString()}`
                              : t('invitation.waiting_registration')}
                          </p>
                        </div>
                      </div>
                      {friend.accepted && (
                        <div className="flex gap-[1vh]" style={{ fontSize: 'clamp(0.625rem, 1.5vh, 0.75rem)' }}>
                          <span className="flex items-center gap-[0.5vh] text-yellow-400">
                            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 'clamp(0.625rem, 1.5vh, 0.75rem)', height: 'clamp(0.625rem, 1.5vh, 0.75rem)' }}>
                              <circle cx="12" cy="12" r="9" fill="currentColor" stroke="#d97706" strokeWidth="2"/>
                              <circle cx="12" cy="12" r="6" fill="none" stroke="#d97706" strokeWidth="1.5" opacity="0.5"/>
                              <text x="12" y="16" textAnchor="middle" fill="#d97706" fontSize="10" fontWeight="bold">$</text>
                            </svg>
                            {getRewardForCount(invitedCount).coins}
                          </span>
                          <span className="flex items-center gap-[0.5vh] text-red-400">
                            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 'clamp(0.625rem, 1.5vh, 0.75rem)', height: 'clamp(0.625rem, 1.5vh, 0.75rem)' }}>
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="#dc2626" strokeWidth="1.5"/>
                            </svg>
                            {getRewardForCount(invitedCount).lives}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Invitation;