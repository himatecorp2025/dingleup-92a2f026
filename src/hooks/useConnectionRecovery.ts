import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNetworkStatus } from './useNetworkStatus';
import { logger } from '@/lib/logger';

/**
 * Hook that handles automatic recovery when network connection is restored
 * - Refetches critical queries
 * - Clears stale cache entries
 * - Handles WiFi ↔ mobile data transitions smoothly
 */
export function useConnectionRecovery() {
  const queryClient = useQueryClient();
  const networkStatus = useNetworkStatus();
  const lastOnlineRef = useRef(networkStatus.isOnline);
  const lastQualityRef = useRef(networkStatus.connectionQuality);
  
  const recoverFromOffline = useCallback(async () => {
    logger.log('[ConnectionRecovery] Recovering from offline state');
    
    // Invalidate all queries to refetch fresh data
    await queryClient.invalidateQueries();
    
    // Force refetch critical queries immediately
    queryClient.refetchQueries({
      predicate: (query) => {
        const queryKey = query.queryKey;
        // Prioritize wallet, profile, and game-related queries
        if (Array.isArray(queryKey)) {
          const key = queryKey[0];
          return ['wallet', 'userGameProfile', 'translations', 'dailyGiftStatus'].includes(key as string);
        }
        return false;
      },
    });
  }, [queryClient]);
  
  const handleQualityChange = useCallback((from: string, to: string) => {
    logger.log('[ConnectionRecovery] Quality changed', { from, to });
    
    // If quality improved significantly, refresh data
    if ((from === 'slow' || from === 'offline') && (to === 'good' || to === 'excellent')) {
      queryClient.invalidateQueries({
        predicate: (query) => {
          // Only refetch queries that haven't been fetched recently
          const state = query.state;
          const staleTime = 30000; // 30 seconds
          return Date.now() - (state.dataUpdatedAt || 0) > staleTime;
        },
      });
    }
  }, [queryClient]);
  
  useEffect(() => {
    const wasOffline = !lastOnlineRef.current;
    const isNowOnline = networkStatus.isOnline;
    
    // Handle offline → online transition
    if (wasOffline && isNowOnline) {
      recoverFromOffline();
    }
    
    // Handle quality changes
    if (lastQualityRef.current !== networkStatus.connectionQuality) {
      handleQualityChange(lastQualityRef.current, networkStatus.connectionQuality);
    }
    
    lastOnlineRef.current = networkStatus.isOnline;
    lastQualityRef.current = networkStatus.connectionQuality;
  }, [networkStatus.isOnline, networkStatus.connectionQuality, recoverFromOffline, handleQualityChange]);
  
  // Also listen for visibility changes (app coming back to foreground)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && networkStatus.isOnline) {
        logger.log('[ConnectionRecovery] App became visible, checking for stale data');
        
        // Refetch queries that might be stale
        queryClient.invalidateQueries({
          predicate: (query) => {
            const state = query.state;
            const staleTime = 60000; // 1 minute
            return Date.now() - (state.dataUpdatedAt || 0) > staleTime;
          },
        });
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [queryClient, networkStatus.isOnline]);
  
  return {
    isOnline: networkStatus.isOnline,
    connectionQuality: networkStatus.connectionQuality,
  };
}
