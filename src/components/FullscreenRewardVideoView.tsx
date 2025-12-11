import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';

export interface RewardVideo {
  id: string;
  embedUrl: string;
  platform: 'tiktok' | 'youtube' | 'instagram' | 'facebook';
}

interface FullscreenRewardVideoViewProps {
  videos: RewardVideo[];
  durationSecondsPerVideo?: number;
  onCompleted: (watchedVideoIds: string[]) => void;
  onClose: () => void;
}

// Transform embed URL to force autoplay and hide UI elements
const getAutoplayEmbedUrl = (embedUrl: string, platform: string): string => {
  const url = new URL(embedUrl);
  
  if (platform === 'tiktok') {
    // TikTok embed params for autoplay
    url.searchParams.set('autoplay', '1');
    url.searchParams.set('muted', '0');
    url.searchParams.set('controls', '0');
  } else if (platform === 'youtube') {
    // YouTube embed params
    url.searchParams.set('autoplay', '1');
    url.searchParams.set('mute', '0');
    url.searchParams.set('controls', '0');
    url.searchParams.set('modestbranding', '1');
    url.searchParams.set('rel', '0');
    url.searchParams.set('showinfo', '0');
    url.searchParams.set('iv_load_policy', '3');
    url.searchParams.set('disablekb', '1');
    url.searchParams.set('fs', '0');
  } else if (platform === 'instagram' || platform === 'facebook') {
    url.searchParams.set('autoplay', '1');
    url.searchParams.set('muted', '0');
  }
  
  return url.toString();
};

export const FullscreenRewardVideoView: React.FC<FullscreenRewardVideoViewProps> = ({
  videos,
  durationSecondsPerVideo = 15,
  onCompleted,
  onClose,
}) => {
  const { lang } = useI18n();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [countdown, setCountdown] = useState(durationSecondsPerVideo);
  const [canClose, setCanClose] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const watchedIdsRef = useRef<string[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const totalVideos = videos.length;
  const currentVideo = videos[currentVideoIndex];

  // Lock body scroll
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.width = '';
    };
  }, []);

  // Countdown timer logic
  useEffect(() => {
    if (!currentVideo) return;
    
    setCountdown(durationSecondsPerVideo);
    setIsLoading(true);
    
    // Small delay before starting timer to allow iframe to load
    const loadDelay = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Mark current video as watched
          if (!watchedIdsRef.current.includes(currentVideo.id)) {
            watchedIdsRef.current.push(currentVideo.id);
          }
          
          // Move to next video or finish
          if (currentVideoIndex < totalVideos - 1) {
            setCurrentVideoIndex(i => i + 1);
            return durationSecondsPerVideo;
          } else {
            // All videos watched
            clearInterval(timerRef.current!);
            setCanClose(true);
            
            // Show toast notification
            toast.success(
              lang === 'hu' 
                ? 'Most zárd be a videót a jutalom jóváírásához!' 
                : 'Now close the video to claim your reward!',
              { position: 'top-center', duration: 5000 }
            );
            
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(loadDelay);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentVideoIndex, currentVideo?.id, totalVideos, durationSecondsPerVideo, lang]);

  // Handle close - ONLY allowed after all videos watched
  const handleClose = useCallback(() => {
    if (!canClose) return;
    onCompleted(watchedIdsRef.current);
    onClose();
  }, [canClose, onCompleted, onClose]);

  if (!currentVideo) return null;

  const autoplayUrl = getAutoplayEmbedUrl(currentVideo.embedUrl, currentVideo.platform);

  return (
    <div 
      className="fixed inset-0 z-[99999] bg-black"
      style={{ 
        width: '100vw', 
        height: '100dvh',
        top: 0,
        left: 0,
        position: 'fixed'
      }}
    >
      {/* Video container - MASSIVELY scaled to hide all platform UI */}
      <div className="absolute inset-0 overflow-hidden">
        <iframe
          key={currentVideo.id}
          src={autoplayUrl}
          className="absolute border-0"
          style={{ 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)', 
            // Scale to 350% to push all TikTok/Instagram UI completely off screen
            width: '350vw', 
            height: '350dvh',
            pointerEvents: 'none'
          }}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture; accelerometer; gyroscope"
          allowFullScreen
        />
      </div>
      
      {/* BLACK MASKS - Large opaque masks to cover any remaining platform UI */}
      {/* Top mask - covers top bar, username, search */}
      <div 
        className="absolute left-0 right-0 bg-black pointer-events-none" 
        style={{ 
          top: 0,
          height: '22dvh',
          zIndex: 10
        }} 
      />
      
      {/* Bottom mask - covers hashtags, music info, buttons */}
      <div 
        className="absolute left-0 right-0 bg-black pointer-events-none" 
        style={{ 
          bottom: 0,
          height: '22dvh',
          zIndex: 10
        }} 
      />
      
      {/* Left mask */}
      <div 
        className="absolute top-0 bottom-0 bg-black pointer-events-none" 
        style={{ 
          left: 0,
          width: '15vw',
          zIndex: 10
        }} 
      />
      
      {/* Right mask - covers like/comment/share buttons */}
      <div 
        className="absolute top-0 bottom-0 bg-black pointer-events-none" 
        style={{ 
          right: 0,
          width: '18vw',
          zIndex: 10
        }} 
      />

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Countdown timer - top left */}
      <div 
        className="absolute z-30" 
        style={{ 
          top: 'max(env(safe-area-inset-top), 20px)', 
          left: '20px' 
        }}
      >
        <div 
          className="bg-black/80 rounded-full w-16 h-16 flex items-center justify-center font-black text-white text-2xl border-2 border-white/40 shadow-lg"
          style={{
            boxShadow: '0 4px 20px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.1)'
          }}
        >
          {countdown}
        </div>
      </div>

      {/* Progress dots for multi-video sessions */}
      {totalVideos > 1 && (
        <div 
          className="absolute z-30 flex gap-2" 
          style={{ 
            top: 'max(env(safe-area-inset-top), 20px)', 
            left: '50%', 
            transform: 'translateX(-50%)' 
          }}
        >
          {videos.map((_, idx) => (
            <div 
              key={idx} 
              className={`rounded-full transition-all duration-300 ${
                idx <= currentVideoIndex ? 'bg-white' : 'bg-white/30'
              }`}
              style={{ 
                width: idx === currentVideoIndex ? '28px' : '10px', 
                height: '10px' 
              }} 
            />
          ))}
        </div>
      )}

      {/* Close button - ONLY visible after all videos watched */}
      {canClose && (
        <button 
          onClick={handleClose} 
          className="absolute z-30 bg-white/30 hover:bg-white/50 rounded-full p-4 transition-all duration-200 animate-pulse"
          style={{ 
            top: 'max(env(safe-area-inset-top), 20px)', 
            right: '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}
        >
          <X className="text-white w-8 h-8" strokeWidth={3} />
        </button>
      )}
    </div>
  );
};
