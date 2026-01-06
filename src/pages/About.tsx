import { useEffect, useState } from 'react';
import { usePlatformDetection } from '@/hooks/usePlatformDetection';
import { Building2, Shield } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { ReportDialog } from '@/components/ReportDialog';
import { useI18n } from '@/i18n';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useNativeFullscreen } from '@/hooks/useNativeFullscreen';

const About = () => {
  const { isHandheld, isStandalone } = usePlatformDetection();
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { t } = useI18n();
  const navigate = useNavigate();

  // FULLSCREEN MODE: Hide status bar on mobile devices (Web)
  useFullscreen({
    enabled: true,
    autoReenter: true,
  });

  // NATIVE FULLSCREEN: Hide status bar on iOS/Android Capacitor apps
  useNativeFullscreen();

  // Check if current user has admin role
  useEffect(() => {
    const checkAdminRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setIsAdmin(false);
          return;
        }

        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'admin')
          .maybeSingle();

        setIsAdmin(!!roleData);
      } catch (error) {
        console.error('Admin role check error:', error);
        setIsAdmin(false);
      }
    };

    checkAdminRole();
  }, []);

  // Only show on mobile/tablet
  if (!isHandheld) {
    return (
      <div className="min-h-dvh min-h-svh flex items-center justify-center bg-gradient-to-br from-[#0a0a2e] via-[#16213e] to-[#0f0f3d]">
        <div className="text-center px-6 max-w-md">
          <h1 className="text-3xl font-black text-foreground mb-4">{t('about.mobile_only.title')}</h1>
          <p className="text-muted-foreground mb-6">
            {t('about.mobile_only.description')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh w-screen overflow-hidden fixed inset-0 flex flex-col" style={{
      paddingTop: 'max(calc(env(safe-area-inset-top) + 2%), env(safe-area-inset-top) + 8px)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      maxWidth: '100vw',
      maxHeight: '100dvh'
    }}>
      {/* Full-screen background that covers status bar */}
      <div 
        className="fixed bg-gradient-to-b from-[#0a0a2e] via-[#16213e] to-[#0f0f3d]"
        style={{
          left: 'calc(-1 * env(safe-area-inset-left, 0px))',
          right: 'calc(-1 * env(safe-area-inset-right, 0px))',
          top: 'calc(-1 * env(safe-area-inset-top, 0px))',
          bottom: 'calc(-1 * env(safe-area-inset-bottom, 0px))',
          width: 'calc(100vw + env(safe-area-inset-left, 0px) + env(safe-area-inset-right, 0px))',
          height: 'calc(100dvh + env(safe-area-inset-top, 0px) + env(safe-area-inset-bottom, 0px))',
          pointerEvents: 'none'
        }}
      />
      
      <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden relative z-10" style={{ 
        width: '90vw',
        maxWidth: '90vw',
        margin: '0 auto',
        padding: 'clamp(12px, 2.5vh, 24px)',
        paddingBottom: 'calc(var(--bottom-nav-h) + env(safe-area-inset-bottom) + 16px)' 
      }}>
      {/* Header */}
      <div className="text-center mb-4">
        {/* Admin Access Button - Top Left (only for DingleUP! admin) */}
        {isAdmin && (
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="absolute top-4 left-4 p-2 bg-accent/80 hover:bg-accent rounded-lg transition-colors border border-accent/50 shadow-lg z-10"
            title={t('about.admin_button')}
          >
            <Shield className="w-5 h-5 text-accent-foreground" />
          </button>
        )}
        
        {/* Report Button - Top Right */}
        <button
          onClick={() => setShowReportDialog(true)}
          className="absolute top-4 right-4 p-2 bg-destructive/80 hover:bg-destructive rounded-lg transition-colors border border-destructive/50 shadow-lg z-10"
          title={t('about.report_button')}
        >
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-accent to-accent/80 rounded-2xl mb-3 border-4 border-accent/50 shadow-xl">
            <Building2 className="w-8 h-8 text-accent-foreground" />
          </div>
          <h1 className="text-3xl font-black text-center mb-2 bg-gradient-to-r from-accent via-foreground to-accent bg-clip-text text-transparent">
            {t('about.title')}
          </h1>
          <p className="text-lg text-foreground/90 font-bold">
            {t('about.subtitle')}
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-4">
          {/* Mission Section */}
          <div className="bg-background/60 border-2 border-accent/30 rounded-2xl p-4 backdrop-blur-sm">
            <h2 className="text-xl font-black text-accent mb-2">{t('about.mission.title')}</h2>
            <p className="text-foreground/90 leading-relaxed">
              {t('about.mission.description')}
            </p>
          </div>

          {/* Features Section */}
          <div className="bg-background/60 border-2 border-primary/30 rounded-2xl p-4 backdrop-blur-sm">
            <h2 className="text-xl font-black text-primary-glow mb-2">{t('about.features.title')}</h2>
            <ul className="space-y-3 text-foreground/90">
              <li className="flex items-start gap-3">
                <span className="text-accent text-xl">✓</span>
                <span><strong className="text-foreground">{t('about.features.topics.title')}</strong> {t('about.features.topics.description')}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent text-xl">✓</span>
                <span><strong className="text-foreground">{t('about.features.leaderboards.title')}</strong> {t('about.features.leaderboards.description')}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent text-xl">✓</span>
                <span><strong className="text-foreground">{t('about.features.boosters.title')}</strong> {t('about.features.boosters.description')}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent text-xl">✓</span>
                <span><strong className="text-foreground">{t('about.features.community.title')}</strong> {t('about.features.community.description')}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent text-xl">✓</span>
                <span><strong className="text-foreground">{t('about.features.rewards.title')}</strong> {t('about.features.rewards.description')}</span>
              </li>
            </ul>
          </div>

          {/* Team Section */}
          <div className="bg-background/60 border-2 border-success/30 rounded-2xl p-4 backdrop-blur-sm">
            <h2 className="text-xl font-black text-success mb-2">{t('about.team.title')}</h2>
            <p className="text-foreground/90 leading-relaxed">
              {t('about.team.description')}
            </p>
          </div>

          {/* Contact Section */}
          <div className="bg-background/60 border-2 border-primary-glow/30 rounded-2xl p-4 backdrop-blur-sm">
            <h2 className="text-xl font-black text-primary-glow mb-2">{t('about.contact.title')}</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              {t('about.contact.description')}
            </p>
            <div className="space-y-2 text-foreground/80">
              <p>{t('about.contact.email')}</p>
              <p>{t('about.contact.website')}</p>
            </div>
          </div>

          {/* Footer/Impressum */}
          <div className="text-center text-muted-foreground text-sm space-y-2 pt-6 border-t border-border">
            <p>{t('about.footer.copyright')}</p>
            <p>{t('about.footer.version')}</p>
            <p className="text-xs">
              {t('about.footer.disclaimer')}
            </p>
          </div>
        </div>
      </div>

      <BottomNav />
      
      {/* Report Dialog */}
      <ReportDialog 
        open={showReportDialog} 
        onOpenChange={setShowReportDialog}
      />
    </div>
  );
};

export default About;