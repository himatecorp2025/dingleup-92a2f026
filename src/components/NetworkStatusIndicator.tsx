import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, Signal, SignalLow, SignalMedium, SignalHigh } from 'lucide-react';
import { useNetworkStatus, ConnectionQuality } from '@/hooks/useNetworkStatus';
import { getOfflineQueueStatus } from '@/lib/resilientFetch';
import { cn } from '@/lib/utils';

interface NetworkStatusIndicatorProps {
  showAlways?: boolean;
  className?: string;
}

export function NetworkStatusIndicator({ showAlways = false, className }: NetworkStatusIndicatorProps) {
  const networkStatus = useNetworkStatus();
  const [queueStatus, setQueueStatus] = useState({ count: 0, isProcessing: false });
  const [showBanner, setShowBanner] = useState(false);
  const [bannerMessage, setBannerMessage] = useState('');
  
  // Update queue status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setQueueStatus(getOfflineQueueStatus());
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Show banner when network status changes
  useEffect(() => {
    if (!networkStatus.isOnline) {
      setBannerMessage('Nincs internet kapcsolat. Az alkalmazás offline módban működik.');
      setShowBanner(true);
    } else if (networkStatus.wasOffline) {
      setBannerMessage('Kapcsolat helyreállt!');
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 3000);
    } else if (networkStatus.connectionQuality === 'slow') {
      setBannerMessage('Gyenge internet kapcsolat. Lassabb működés várható.');
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 5000);
    } else {
      setShowBanner(false);
    }
  }, [networkStatus.isOnline, networkStatus.wasOffline, networkStatus.connectionQuality]);
  
  const getIcon = () => {
    if (!networkStatus.isOnline) {
      return <WifiOff className="h-4 w-4 text-destructive" />;
    }
    
    switch (networkStatus.connectionQuality) {
      case 'slow':
        return <SignalLow className="h-4 w-4 text-yellow-500" />;
      case 'good':
        return <SignalMedium className="h-4 w-4 text-green-500" />;
      case 'excellent':
        return <SignalHigh className="h-4 w-4 text-green-500" />;
      default:
        return <Signal className="h-4 w-4 text-muted-foreground" />;
    }
  };
  
  const getBannerColor = () => {
    if (!networkStatus.isOnline) return 'bg-destructive/90';
    if (networkStatus.wasOffline) return 'bg-green-600/90';
    if (networkStatus.connectionQuality === 'slow') return 'bg-yellow-600/90';
    return 'bg-primary/90';
  };
  
  // Don't render anything if online and showAlways is false
  if (!showBanner && !showAlways && networkStatus.isOnline) {
    return null;
  }
  
  return (
    <>
      {/* Fixed top banner for network issues */}
      {showBanner && (
        <div 
          className={cn(
            'fixed top-0 left-0 right-0 z-[9999] px-4 py-2 text-white text-center text-sm font-medium',
            'animate-in slide-in-from-top duration-300',
            getBannerColor()
          )}
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}
        >
          <div className="flex items-center justify-center gap-2">
            {getIcon()}
            <span>{bannerMessage}</span>
            {queueStatus.count > 0 && (
              <span className="ml-2 text-xs opacity-75">
                ({queueStatus.count} művelet várakozik)
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Small indicator icon (optional, for status bar integration) */}
      {showAlways && (
        <div className={cn('flex items-center gap-1', className)}>
          {getIcon()}
          {queueStatus.count > 0 && (
            <span className="text-xs text-muted-foreground">
              {queueStatus.count}
            </span>
          )}
        </div>
      )}
    </>
  );
}
