import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Volume2, VolumeX } from 'lucide-react';
import { useI18n } from '@/i18n';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';

// Platform Icons
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
  </svg>
);

const YouTubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="#FF0000">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
    <path fill="#fff" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="url(#ig-grad-modal)">
    <defs>
      <linearGradient id="ig-grad-modal" x1="0" y1="24" x2="24" y2="0">
        <stop offset="0%" stopColor="#FD5"/>
        <stop offset="50%" stopColor="#FF543E"/>
        <stop offset="100%" stopColor="#C837AB"/>
      </linearGradient>
    </defs>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069z"/>
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

interface VideoAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  videos: VideoData[];
  totalDurationSeconds: number;
  onComplete: () => void;
  onCancel: () => void;
  context: 'daily_gift' | 'game_end' | 'refill';
  doubledAmount?: number;
}

interface VideoData {
  id: string;
  video_file_path?: string | null;
  videoFilePath?: string | null;
  channel_url?: string | null;
  channelUrl?: string | null;
  platform: string;
  duration_seconds?: number | null;
  durationSeconds?: number | null;
  creator_name?: string;
  creatorName?: string;
}

const SEGMENT_DURATION = 15;

const getPlatformIcon = (platform: string) => {
  const p = platform?.toLowerCase() || '';
  switch (p) {
    case 'tiktok': return <TikTokIcon className="w-6 h-6" />;
    case 'youtube': return <YouTubeIcon className="w-6 h-6" />;
    case 'instagram': return <InstagramIcon className="w-6 h-6" />;
    case 'facebook': return <FacebookIcon className="w-6 h-6" />;
    default: return null;
  }
};

export const VideoAdModal = ({
  isOpen,
  onClose,
  videos,
  totalDurationSeconds,
  onComplete,
  onCancel,
  context,
  doubledAmount,
}: VideoAdModalProps) => {
  const { lang } = useI18n();
  const [secondsLeft, setSecondsLeft] = useState<number>(totalDurationSeconds);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const startTsRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rewardShownRef = useRef(false);

  const texts = {
    hu: {
      goToCreator: 'Tovább az alkotóhoz',
    },
    en: {
      goToCreator: 'Go to creator',
    },
  };
  const t = texts[lang as 'hu' | 'en'] || texts.en;

  const totalDuration = totalDurationSeconds > 0 ? totalDurationSeconds : 15;
  const requiredSegments = totalDuration >= 30 ? 2 : 1;

  const playlist = (() => {
    if (videos.length === 0) return [];
    if (requiredSegments === 1) return [videos[0]];
    if (requiredSegments === 2) {
      if (videos.length >= 2) return [videos[0], videos[1]];
      return [videos[0], videos[0]];
    }
    return [videos[0]];
  })();

  const currentVideo = playlist[activeIndex];
  const currentPlatform = currentVideo?.platform?.toLowerCase() || '';
  
  // Get video file URL from Supabase Storage
  const videoFilePath = currentVideo?.video_file_path || currentVideo?.videoFilePath || '';
  const channelUrl = currentVideo?.channel_url || currentVideo?.channelUrl || '';
  
  const getVideoUrl = useCallback((filePath: string) => {
    if (!filePath) return '';
    const { data } = supabase.storage.from('creator-videos').getPublicUrl(filePath);
    return data?.publicUrl || '';
  }, []);

  const videoUrl = videoFilePath ? getVideoUrl(videoFilePath) : '';

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = originalOverflow;
        document.documentElement.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSecondsLeft(totalDuration);
      setActiveIndex(0);
      setIsVideoLoaded(false);
      setIsMuted(false);
      rewardShownRef.current = false;
      startTsRef.current = performance.now();
      
      logger.log('[VideoAdModal] Opened - playlist:', playlist.length, 'videos, duration:', totalDuration);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isOpen, totalDuration, playlist.length]);

  // Main timer
  useEffect(() => {
    if (!isOpen || !isVideoLoaded) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (startTsRef.current === 0) {
      startTsRef.current = performance.now();
    }

    intervalRef.current = setInterval(() => {
      const now = performance.now();
      const elapsedSec = Math.floor((now - startTsRef.current) / 1000);
      const remaining = Math.max(0, totalDuration - elapsedSec);
      
      setSecondsLeft(remaining);

      // Auto-switch video at 15s mark for 2-video playlists
      if (playlist.length >= 2 && totalDuration >= 30) {
        const newIndex = elapsedSec >= SEGMENT_DURATION ? 1 : 0;
        setActiveIndex(newIndex);
      }

      if (remaining <= 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }, 200);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isOpen, isVideoLoaded, totalDuration, playlist.length]);

  // Handle video loaded
  const handleVideoLoaded = useCallback(() => {
    setIsVideoLoaded(true);
    if (videoRef.current) {
      videoRef.current.play().catch(err => {
        logger.log('[VideoAdModal] Autoplay failed:', err);
      });
    }
    startTsRef.current = performance.now();
  }, []);

  // Toggle mute
  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => {
      if (videoRef.current) {
        videoRef.current.muted = !prev;
      }
      return !prev;
    });
  }, []);

  // Handle close
  const handleClose = useCallback(() => {
    if (secondsLeft > 0) return;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (!rewardShownRef.current) {
      rewardShownRef.current = true;
      
      if (context === 'refill') {
        toast.success(
          <div className="flex flex-col items-center gap-2 text-center max-w-[75vw]">
            <div className="text-2xl">🎉</div>
            <div className="font-bold text-lg bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-lg">
              {lang === 'hu' ? 'Gratulálunk!' : 'Congratulations!'}
            </div>
            <div className="text-sm text-foreground/90">
              {lang === 'hu' ? 'Jutalmad jóváíródott!' : 'Reward credited!'}
            </div>
            <div className="flex items-center gap-3 mt-1 px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500/20 via-amber-500/30 to-yellow-500/20 border border-yellow-500/40 shadow-lg shadow-yellow-500/20">
              <span className="font-bold text-yellow-400 text-lg">+500 🪙</span>
              <span className="text-foreground/50">|</span>
              <span className="font-bold text-red-400 text-lg">+5 ❤️</span>
            </div>
          </div>,
          { duration: 4000, position: 'top-center' }
        );
      } else if (doubledAmount) {
        toast.success(
          <div className="flex flex-col items-center gap-2 text-center max-w-[75vw]">
            <div className="text-2xl">🎉</div>
            <div className="font-bold text-lg bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-lg">
              {lang === 'hu' ? 'Gratulálunk!' : 'Congratulations!'}
            </div>
            <div className="text-sm text-foreground/90">
              {lang === 'hu' ? 'Duplázott jutalmad!' : 'Doubled reward!'}
            </div>
            <div className="flex items-center gap-2 mt-1 px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500/20 via-amber-500/30 to-yellow-500/20 border border-yellow-500/40 shadow-lg shadow-yellow-500/20">
              <span className="font-bold text-yellow-400 text-lg">+{doubledAmount} 🪙</span>
            </div>
          </div>,
          { duration: 4000, position: 'top-center' }
        );
      }
    }
    
    onComplete();
  }, [secondsLeft, onComplete, context, lang, doubledAmount]);

  // Handle go to creator
  const handleGoToCreator = useCallback(() => {
    if (channelUrl) {
      window.open(channelUrl, '_blank', 'noopener,noreferrer');
    }
  }, [channelUrl]);

  if (!isOpen || playlist.length === 0) return null;

  const canClose = secondsLeft === 0;

  return (
    <div 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100dvw', 
        height: '100dvh',
        backgroundColor: '#000000',
        zIndex: 9999999,
        overflow: 'hidden',
      }}
    >
      {/* Native video player - 9:16 aspect ratio, fullscreen */}
      {videoUrl ? (
        <video
          ref={videoRef}
          key={`${currentVideo.id}-${activeIndex}`}
          src={videoUrl}
          autoPlay
          loop
          playsInline
          muted={isMuted}
          onLoadedData={handleVideoLoaded}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      ) : (
        <div 
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#000000',
            color: '#fff',
          }}
        >
          <div className="animate-spin w-8 h-8 border-2 border-white/30 border-t-white rounded-full" />
        </div>
      )}

      {/* Platform icon - top right corner */}
      {currentPlatform && isVideoLoaded && (
        <div 
          style={{ 
            position: 'absolute',
            top: '16px',
            right: canClose ? '80px' : '16px',
            zIndex: 100,
            padding: '10px',
            backgroundColor: 'rgba(0,0,0,0.75)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          {getPlatformIcon(currentPlatform)}
        </div>
      )}

      {/* Countdown timer - top left */}
      {isVideoLoaded && (
        <div 
          style={{ 
            position: 'absolute',
            top: '16px',
            left: '16px',
            zIndex: 100,
            width: '48px',
            height: '48px',
            backgroundColor: 'rgba(0,0,0,0.85)',
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: '20px',
            color: '#fff',
            boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
          }}
        >
          {secondsLeft}
        </div>
      )}

      {/* Mute/Unmute button - below timer */}
      {isVideoLoaded && (
        <button
          onClick={handleToggleMute}
          style={{ 
            position: 'absolute',
            top: '76px',
            left: '16px',
            zIndex: 100,
            width: '48px',
            height: '48px',
            backgroundColor: 'rgba(0,0,0,0.75)',
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          {isMuted ? (
            <VolumeX style={{ width: '20px', height: '20px', color: '#fff' }} />
          ) : (
            <Volume2 style={{ width: '20px', height: '20px', color: '#fff' }} />
          )}
        </button>
      )}

      {/* Video progress dots - top center (only if 2 videos) */}
      {playlist.length > 1 && isVideoLoaded && (
        <div 
          style={{ 
            position: 'absolute',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            display: 'flex',
            gap: '8px',
          }}
        >
          {playlist.map((_, idx) => (
            <div
              key={idx}
              style={{
                width: idx === activeIndex ? '20px' : '8px',
                height: '8px',
                borderRadius: '4px',
                backgroundColor: idx <= activeIndex ? '#fff' : 'rgba(255,255,255,0.3)',
                transition: 'all 0.3s',
              }}
            />
          ))}
        </div>
      )}

      {/* Close button - top right, ONLY when timer = 0 */}
      {canClose && (
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 100,
            width: '48px',
            height: '48px',
            backgroundColor: 'rgba(0,0,0,0.85)',
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        >
          <X style={{ width: '20px', height: '20px', color: '#fff' }} />
        </button>
      )}

      {/* Go to creator CTA - bottom left */}
      {isVideoLoaded && channelUrl && (
        <button
          onClick={handleGoToCreator}
          style={{ 
            position: 'absolute',
            bottom: 'max(24px, env(safe-area-inset-bottom))',
            left: '16px',
            zIndex: 100,
            backgroundColor: 'rgba(0,0,0,0.75)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '20px',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          {getPlatformIcon(currentPlatform)}
          <span>{t.goToCreator}</span>
        </button>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
};

export default VideoAdModal;
