import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface VideoCountry {
  country_code: string;
  is_primary: boolean;
  sort_order: number;
}

export interface CreatorVideo {
  id: string;
  user_id: string;
  platform: string;
  video_url: string;
  embed_url: string | null;
  thumbnail_url: string | null;
  title: string | null;
  first_activated_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  status: string;
  created_at: string;
  days_remaining: number;
  topics?: { id: number; name: string }[];
  countries?: VideoCountry[];
}

interface UseCreatorVideosResult {
  videos: CreatorVideo[];
  isLoading: boolean;
  error: Error | null;
  activationsToday: number;
  remainingActivations: number;
  refetch: () => Promise<void>;
}

export const useCreatorVideos = (
  userId: string | undefined,
  platform: string = 'all',
  sortByExpiry: boolean = false
): UseCreatorVideosResult => {
  const [videos, setVideos] = useState<CreatorVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [activationsToday, setActivationsToday] = useState(0);

  const fetchVideos = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      const { data, error: invokeError } = await supabase.functions.invoke('get-creator-videos', {
        body: {
          platform: platform === 'all' ? undefined : platform,
          sort_by_expiry: sortByExpiry,
        },
      });

      if (invokeError) throw invokeError;

      if (data?.videos) {
        setVideos(data.videos);
        setActivationsToday(data.stats?.activations_today || 0);
      } else {
        setVideos([]);
        setActivationsToday(0);
      }
    } catch (err) {
      console.error('Error fetching creator videos:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, platform, sortByExpiry]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const remainingActivations = Math.max(0, 3 - activationsToday);

  return {
    videos,
    isLoading,
    error,
    activationsToday,
    remainingActivations,
    refetch: fetchVideos,
  };
};
