import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Download, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';

const InstallApp = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsInstallable(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  return (
    <div className="min-h-screen p-4 relative">
      {/* Full-screen background that extends behind safe areas */}
      <div 
        className="fixed z-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, #0a0a2e 0%, #16213e 50%, #0f0f3d 100%)',
          left: 'calc(-1 * env(safe-area-inset-left, 0px))',
          right: 'calc(-1 * env(safe-area-inset-right, 0px))',
          top: 'calc(-1 * env(safe-area-inset-top, 0px))',
          bottom: 'calc(-1 * env(safe-area-inset-bottom, 0px))',
          width: 'calc(100vw + env(safe-area-inset-left, 0px) + env(safe-area-inset-right, 0px))',
          height: 'calc(100dvh + env(safe-area-inset-top, 0px) + env(safe-area-inset-bottom, 0px))',
        }}
      />
      <button
        onClick={() => navigate('/dashboard')}
        className="absolute top-4 left-4 p-3 rounded-full hover:scale-110 transition-all"
        title={t('install.back_to_dashboard')}
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
        <LogOut className="w-6 h-6 text-white relative z-10 -scale-x-100" />
      </button>

      <div className="max-w-md mx-auto pt-20 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="128"
          height="128"
          viewBox="0 0 1024 1024"
          className="mx-auto mb-6"
        >
          <image
            href="/logo.png"
            x="0"
            y="0"
            width="1024"
            height="1024"
            preserveAspectRatio="xMidYMid meet"
          />
        </svg>
        
        <h1 className="text-3xl font-black text-white mb-4">
          {t('install.title')}
        </h1>

        {isInstalled ? (
          <div className="bg-green-600/20 border-2 border-green-500/50 rounded-xl p-6 mb-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-white text-lg">
              {t('install.already_installed')}
            </p>
          </div>
        ) : (
          <>
            {isInstallable && !isIOS && (
              <Button
                onClick={handleInstall}
                className="w-full py-6 bg-gradient-to-r from-green-600 to-green-800 hover:from-green-700 hover:to-green-900 text-white font-black text-lg rounded-xl mb-6"
              >
                <Download className="w-6 h-6 mr-2" />
                {t('install.install_now')}
              </Button>
            )}

            {isIOS && (
              <div className="bg-blue-600/20 border-2 border-blue-500/50 rounded-xl p-6 mb-6 text-left">
                <h3 className="text-white font-bold text-lg mb-3">{t('install.ios.title')}</h3>
                <ol className="text-white/80 space-y-2 text-sm">
                  <li>{t('install.ios.step1')}</li>
                  <li>{t('install.ios.step2')}</li>
                  <li>{t('install.ios.step3')}</li>
                </ol>
              </div>
            )}

            {isAndroid && !isInstallable && (
              <div className="bg-green-600/20 border-2 border-green-500/50 rounded-xl p-6 mb-6 text-left">
                <h3 className="text-white font-bold text-lg mb-3">{t('install.android.title')}</h3>
                <ol className="text-white/80 space-y-2 text-sm">
                  <li>{t('install.android.step1')}</li>
                  <li>{t('install.android.step2')}</li>
                  <li>{t('install.android.step3')}</li>
                </ol>
              </div>
            )}

            {!isIOS && !isAndroid && (
              <div className="bg-purple-600/20 border-2 border-purple-500/50 rounded-xl p-6 mb-6">
                <p className="text-white">
                  {t('install.other_platform')}
                </p>
              </div>
            )}
          </>
        )}

        <div className="space-y-3 text-white/70 text-sm">
          <p>{t('install.benefits.offline')}</p>
          <p>{t('install.benefits.fast')}</p>
          <p>{t('install.benefits.app_like')}</p>
          <p>{t('install.benefits.home_icon')}</p>
        </div>
      </div>
    </div>
  );
};

export default InstallApp;