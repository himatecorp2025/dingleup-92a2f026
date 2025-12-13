import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';

export type ConnectionQuality = 'offline' | 'slow' | 'good' | 'excellent';

interface NetworkStatus {
  isOnline: boolean;
  connectionQuality: ConnectionQuality;
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
  saveData: boolean;
  wasOffline: boolean;
}

interface NetworkConnection extends EventTarget {
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  addEventListener(type: 'change', listener: () => void): void;
  removeEventListener(type: 'change', listener: () => void): void;
}

declare global {
  interface Navigator {
    connection?: NetworkConnection;
    mozConnection?: NetworkConnection;
    webkitConnection?: NetworkConnection;
  }
}

const getConnection = (): NetworkConnection | null => {
  return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
};

const getConnectionQuality = (connection: NetworkConnection | null, isOnline: boolean): ConnectionQuality => {
  if (!isOnline) return 'offline';
  if (!connection) return 'good'; // Assume good if we can't detect
  
  const { effectiveType, rtt, downlink } = connection;
  
  // Use RTT (round-trip time) as primary indicator
  if (rtt !== undefined) {
    if (rtt > 1000) return 'slow';
    if (rtt > 300) return 'good';
    return 'excellent';
  }
  
  // Fall back to effective type
  if (effectiveType === 'slow-2g' || effectiveType === '2g') return 'slow';
  if (effectiveType === '3g') return 'good';
  if (effectiveType === '4g') return 'excellent';
  
  // Fall back to downlink speed
  if (downlink !== undefined) {
    if (downlink < 0.5) return 'slow';
    if (downlink < 2) return 'good';
    return 'excellent';
  }
  
  return 'good';
};

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() => {
    const connection = getConnection();
    const isOnline = navigator.onLine;
    return {
      isOnline,
      connectionQuality: getConnectionQuality(connection, isOnline),
      effectiveType: connection?.effectiveType || null,
      downlink: connection?.downlink || null,
      rtt: connection?.rtt || null,
      saveData: connection?.saveData || false,
      wasOffline: false,
    };
  });

  const updateNetworkStatus = useCallback(() => {
    const connection = getConnection();
    const isOnline = navigator.onLine;
    const quality = getConnectionQuality(connection, isOnline);
    
    setStatus(prev => {
      const wasOffline = !prev.isOnline && isOnline;
      
      if (wasOffline) {
        logger.log('[Network] Connection restored', { quality });
      } else if (prev.isOnline && !isOnline) {
        logger.log('[Network] Connection lost');
      } else if (prev.connectionQuality !== quality) {
        logger.log('[Network] Quality changed', { from: prev.connectionQuality, to: quality });
      }
      
      return {
        isOnline,
        connectionQuality: quality,
        effectiveType: connection?.effectiveType || null,
        downlink: connection?.downlink || null,
        rtt: connection?.rtt || null,
        saveData: connection?.saveData || false,
        wasOffline,
      };
    });
  }, []);

  useEffect(() => {
    const connection = getConnection();
    
    // Listen for online/offline events
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    
    // Listen for connection quality changes
    if (connection) {
      connection.addEventListener('change', updateNetworkStatus);
    }
    
    // Also check periodically for connection quality changes
    const intervalId = setInterval(updateNetworkStatus, 10000);
    
    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      if (connection) {
        connection.removeEventListener('change', updateNetworkStatus);
      }
      clearInterval(intervalId);
    };
  }, [updateNetworkStatus]);

  return status;
}

// Singleton for global access
let networkStatusListeners: Set<() => void> = new Set();
let currentNetworkStatus: NetworkStatus = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  connectionQuality: 'good',
  effectiveType: null,
  downlink: null,
  rtt: null,
  saveData: false,
  wasOffline: false,
};

export function getNetworkStatus(): NetworkStatus {
  return currentNetworkStatus;
}

export function subscribeToNetworkStatus(listener: () => void): () => void {
  networkStatusListeners.add(listener);
  return () => networkStatusListeners.delete(listener);
}

// Initialize global network monitoring
if (typeof window !== 'undefined') {
  const updateGlobalStatus = () => {
    const connection = getConnection();
    const isOnline = navigator.onLine;
    const wasOffline = !currentNetworkStatus.isOnline && isOnline;
    
    currentNetworkStatus = {
      isOnline,
      connectionQuality: getConnectionQuality(connection, isOnline),
      effectiveType: connection?.effectiveType || null,
      downlink: connection?.downlink || null,
      rtt: connection?.rtt || null,
      saveData: connection?.saveData || false,
      wasOffline,
    };
    
    networkStatusListeners.forEach(listener => listener());
  };
  
  window.addEventListener('online', updateGlobalStatus);
  window.addEventListener('offline', updateGlobalStatus);
  
  const connection = getConnection();
  if (connection) {
    connection.addEventListener('change', updateGlobalStatus);
  }
}
