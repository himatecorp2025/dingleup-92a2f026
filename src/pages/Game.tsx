import { useEffect } from "react";
import GamePreview from "@/components/GamePreview";
import { useNavigate } from "react-router-dom";
import gameBackground from "@/assets/game-background.png";
import { useAudioStore } from "@/stores/audioStore";
import { GameErrorBoundary } from "@/components/GameErrorBoundary";
import AudioManager from "@/lib/audioManager";
import { useFullscreen } from "@/hooks/useFullscreen";
import { useNativeFullscreen } from "@/hooks/useNativeFullscreen";
import { logger } from "@/lib/logger";

const Game = () => {
  const navigate = useNavigate();
  const { musicEnabled, volume, loaded } = useAudioStore();

  // FULLSCREEN MODE: Hide status bar on mobile devices (Web)
  useFullscreen({
    enabled: true,
    autoReenter: true,
  });

  // NATIVE FULLSCREEN: Hide status bar on iOS/Android Capacitor apps
  useNativeFullscreen();

  // CRITICAL: Game is MOBILE-ONLY - redirect desktop users
  // Only check on mount, not on every resize
  useEffect(() => {
    const isMobile = window.innerWidth < 768 || 
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!isMobile) {
      logger.log('[Game] Desktop detected, redirecting to landing page');
      navigate('/', { replace: true });
    } else {
      logger.log('[Game] Mobile device detected, allowing game access');
    }
  }, [navigate]);

  // Force play game music when Game page mounts (mobile-only)
  useEffect(() => {
    if (!loaded) return;

    logger.log('[Game Page] Mounted - forcing game music to play', {
      musicEnabled,
      volume
    });

    if (musicEnabled && volume > 0) {
      const audioManager = AudioManager.getInstance();
      // Multiple attempts to ensure music starts
      const attemptPlay = async () => {
        await audioManager.forcePlay();
      };

      // Immediate attempt
      attemptPlay();

      // Retry after 200ms
      const timer = setTimeout(attemptPlay, 200);

      return () => clearTimeout(timer);
    }
  }, [musicEnabled, volume, loaded]);

  return (
    <GameErrorBoundary>
      {/* No paddingTop - content flows from top, background covers full screen */}
      <div className="h-dvh overflow-hidden relative">
        {/* Fixed background layer - extends beyond safe-area to cover entire screen including status bar */}
        <div 
          className="fixed bg-cover bg-no-repeat"
          style={{ 
            backgroundImage: `url(${gameBackground})`,
            backgroundPosition: '50% 50%',
            left: 'calc(-1 * env(safe-area-inset-left, 0px))',
            right: 'calc(-1 * env(safe-area-inset-right, 0px))',
            top: 'calc(-1 * env(safe-area-inset-top, 0px))',
            bottom: 'calc(-1 * env(safe-area-inset-bottom, 0px))',
            width: 'calc(100vw + env(safe-area-inset-left, 0px) + env(safe-area-inset-right, 0px))',
            height: 'calc(100vh + env(safe-area-inset-top, 0px) + env(safe-area-inset-bottom, 0px))',
            pointerEvents: 'none',
            zIndex: 0
          }}
        />
        <div className="relative z-10 h-full">
          <GamePreview />
        </div>
      </div>
    </GameErrorBoundary>
  );
};

export default Game;
