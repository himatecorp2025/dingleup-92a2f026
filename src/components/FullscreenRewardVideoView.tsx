import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Volume2, VolumeX, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';

export interface RewardVideo {
  id: string;
  videoUrl: string;           // Full storage URL for native video playback
  channelUrl: string;         // Redirect URL for "Go to creator"
  platform: 'tiktok' | 'youtube' | 'instagram' | 'facebook';
  durationSeconds?: number;
  creatorName?: string | null;
}

interface FullscreenRewardVideoViewProps {
  videos: RewardVideo[];
  durationSecondsPerVideo?: number;
  onCompleted: (watchedVideoIds: string[]) => void;
  onClose: () => void;
  context?: 'daily_gift' | 'game_end' | 'refill';
  rewardAmount?: number;
}

// Platform icon component
const PlatformIcon: React.FC<{ platform: string; className?: string }> = ({ platform, className = "w-6 h-6" }) => {
  if (platform === 'tiktok') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.001.595.04.88.12V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43V9.45a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.88z"/>
      </svg>
    );
  }
  if (platform === 'youtube') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="#FF0000">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
        <path fill="#fff" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    );
  }
  if (platform === 'instagram') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="url(#ig-grad-view)">
        <defs>
          <linearGradient id="ig-grad-view" x1="0" y1="24" x2="24" y2="0">
            <stop offset="0%" stopColor="#FD5"/>
            <stop offset="50%" stopColor="#FF543E"/>
            <stop offset="100%" stopColor="#C837AB"/>
          </linearGradient>
        </defs>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069z"/>
      </svg>
    );
  }
  if (platform === 'facebook') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="#1877F2">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    );
  }
  return null;
};

export const FullscreenRewardVideoView: React.FC<FullscreenRewardVideoViewProps> = ({
  videos,
  durationSecondsPerVideo = 15,
  onCompleted,
  onClose,
  context,
  rewardAmount,
}) => {
  const { lang } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const startTimeRef = useRef<number>(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const totalDuration = videos.length * durationSecondsPerVideo;
  const [secondsLeft, setSecondsLeft] = useState(totalDuration);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [canClose, setCanClose] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  
  const watchedIdsRef = useRef<Set<string>>(new Set());
  const lastSwitchRef = useRef<number>(Date.now());
  const rewardShownRef = useRef(false);

  const currentVideo = videos[currentVideoIndex];

  // Lock body scroll
  useEffect(() => {
    const original = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
    };
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.documentElement.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = original.overflow;
      document.body.style.position = original.position;
      document.documentElement.style.overflow = '';
    };
  }, []);

  // Timer logic
  useEffect(() => {
    if (!isVideoLoaded) return;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, totalDuration - Math.floor(elapsed));
      setSecondsLeft(remaining);

      // Timer finished
      if (remaining === 0) {
        videos.forEach(v => watchedIdsRef.current.add(v.id));
        setCanClose(true);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }

      // Switch video every 15 seconds for multi-video sessions
      if (videos.length > 1) {
        const elapsedInSegment = (Date.now() - lastSwitchRef.current) / 1000;
        if (elapsedInSegment >= durationSecondsPerVideo && currentVideoIndex < videos.length - 1) {
          if (currentVideo) watchedIdsRef.current.add(currentVideo.id);
          setCurrentVideoIndex(prev => prev + 1);
          lastSwitchRef.current = Date.now();
          setIsVideoLoaded(false); // Reset for new video
        }
      }
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isVideoLoaded, totalDuration, durationSecondsPerVideo, currentVideoIndex, videos, currentVideo]);

  // Handle video loaded
  const handleVideoLoaded = useCallback(() => {
    setIsVideoLoaded(true);
    if (videoRef.current) {
      videoRef.current.play().catch(err => {
        console.log('[FullscreenRewardVideoView] Autoplay failed:', err);
      });
    }
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

  // Handle close - only allowed when timer finishes
  const handleClose = useCallback(() => {
    if (!canClose) return;
    
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
      } else if (rewardAmount) {
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
              <span className="font-bold text-yellow-400 text-lg">+{rewardAmount * 2} 🪙</span>
            </div>
          </div>,
          { duration: 4000, position: 'top-center' }
        );
      }
    }
    
    onCompleted(Array.from(watchedIdsRef.current));
    onClose();
  }, [canClose, onCompleted, onClose, context, lang, rewardAmount]);

  // Handle go to creator
  const handleCreatorClick = useCallback(() => {
    if (currentVideo?.channelUrl) {
      window.open(currentVideo.channelUrl, '_blank', 'noopener,noreferrer');
    }
  }, [currentVideo]);

  if (!currentVideo) return null;

  const currentPlatform = currentVideo.platform?.toLowerCase() || '';

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
      {currentVideo.videoUrl ? (
        <video
          ref={videoRef}
          key={`${currentVideo.id}-${currentVideoIndex}`}
          src={currentVideo.videoUrl}
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
            top: 'max(16px, env(safe-area-inset-top))',
            right: canClose ? '80px' : '16px',
            zIndex: 100,
            padding: '10px',
            backgroundColor: 'rgba(0,0,0,0.75)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          <PlatformIcon platform={currentPlatform} />
        </div>
      )}

      {/* Countdown timer - top left */}
      {isVideoLoaded && (
        <div 
          style={{ 
            position: 'absolute',
            top: 'max(16px, env(safe-area-inset-top))',
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
            top: 'calc(max(16px, env(safe-area-inset-top)) + 60px)',
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

      {/* Video progress dots - top center (only if 2+ videos) */}
      {videos.length > 1 && isVideoLoaded && (
        <div 
          style={{ 
            position: 'absolute',
            top: 'max(16px, env(safe-area-inset-top))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            display: 'flex',
            gap: '8px',
          }}
        >
          {videos.map((_, idx) => (
            <div
              key={idx}
              style={{
                width: idx === currentVideoIndex ? '20px' : '8px',
                height: '8px',
                borderRadius: '4px',
                backgroundColor: idx <= currentVideoIndex ? '#fff' : 'rgba(255,255,255,0.3)',
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
            top: 'max(16px, env(safe-area-inset-top))',
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
      {isVideoLoaded && currentVideo.channelUrl && (
        <button
          onClick={handleCreatorClick}
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
          <PlatformIcon platform={currentPlatform} className="w-5 h-5" />
          <span>{lang === 'hu' ? 'Tovább az alkotóhoz' : 'Go to creator'}</span>
          <ExternalLink style={{ width: '14px', height: '14px', opacity: 0.6 }} />
        </button>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
};

export default FullscreenRewardVideoView;
