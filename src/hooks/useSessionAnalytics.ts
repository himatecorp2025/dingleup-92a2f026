import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SessionEvent {
  id: string;
  user_id: string;
  username: string;
  event_type: string;
  session_id: string;
  session_duration_seconds: number | null;
  device_type: string | null;
  browser: string | null;
  os_version: string | null;
  screen_size: string | null;
  country_code: string | null;
  city: string | null;
  created_at: string;
}

interface EventBreakdown {
  event_type: string;
  count: number;
}

interface DailyTrend {
  date: string;
  count: number;
}

interface SessionAnalyticsData {
  summary: {
    totalEvents: number;
    uniqueUsers: number;
    avgSessionDuration: number;
    pwaInstalls: number;
    archivedEvents: number;
  };
  eventBreakdown: EventBreakdown[];
  dailyTrend: DailyTrend[];
  hourlyHeatmap: number[][];
  events: SessionEvent[];
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

interface UseSessionAnalyticsOptions {
  startDate?: string;
  endDate?: string;
  eventType?: string;
  page?: number;
  limit?: number;
}

export const useSessionAnalytics = (options: UseSessionAnalyticsOptions = {}) => {
  const [data, setData] = useState<SessionAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const params = new URLSearchParams();
      if (options.startDate) params.append('startDate', options.startDate);
      if (options.endDate) params.append('endDate', options.endDate);
      if (options.eventType) params.append('eventType', options.eventType);
      if (options.page) params.append('page', options.page.toString());
      if (options.limit) params.append('limit', options.limit.toString());

      const { data: responseData, error: fnError } = await supabase.functions.invoke(
        'admin-session-analytics',
        {
          body: null,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (fnError) {
        throw fnError;
      }

      // Re-fetch with params using GET-like behavior
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-session-analytics?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Session analytics fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [options.startDate, options.endDate, options.eventType, options.page, options.limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
};
