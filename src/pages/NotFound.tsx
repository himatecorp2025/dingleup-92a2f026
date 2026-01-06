import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useI18n } from "@/i18n";

const NotFound = () => {
  const location = useLocation();
  const { t } = useI18n();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center">
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
      <div className="text-center relative z-10">
        <h1 className="mb-4 text-4xl font-bold text-white">404</h1>
        <p className="mb-4 text-xl text-white/70">{t('error.not_found.message')}</p>
        <a href="/" className="text-yellow-400 underline hover:text-yellow-300">
          {t('error.not_found.return_home')}
        </a>
      </div>
    </div>
  );
};

export default NotFound;