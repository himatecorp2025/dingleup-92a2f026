import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeAdminOptions {
  onDataChange: () => void;
  enabled?: boolean;
}

/**
 * Optimized realtime hook for admin dashboard
 * Uses single channel with multiple table listeners for better performance
 */
export const useRealtimeAdmin = ({ onDataChange, enabled = true }: UseRealtimeAdminOptions) => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Throttled callback to prevent rapid refetches
  const throttledCallback = useCallback(() => {
    if (throttleTimeoutRef.current) {
      return; // Already pending
    }

    throttleTimeoutRef.current = setTimeout(() => {
      onDataChange();
      throttleTimeoutRef.current = null;
    }, 300); // FAST - 300ms throttle (was 2000ms)
  }, [onDataChange]);

  useEffect(() => {
    if (!enabled) return;

    // Single channel for all admin data - much more efficient
    channelRef.current = supabase
      .channel('admin-dashboard-all')
      // Profiles changes
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles'
      }, (payload) => {
        throttledCallback();
      })
      // Purchases changes
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'purchases'
      }, (payload) => {
        throttledCallback();
      })
      // Invitations changes
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'invitations'
      }, (payload) => {
        throttledCallback();
      })
      // Reports changes
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reports'
      }, (payload) => {
        throttledCallback();
      })
      // Friendships changes
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friendships'
      }, (payload) => {
        throttledCallback();
      })
      // Booster purchases changes
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'booster_purchases'
      }, (payload) => {
        throttledCallback();
      })
      .subscribe();

    return () => {
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [enabled, throttledCallback]);

  return {
    isConnected: channelRef.current?.state === 'joined',
  };
};
