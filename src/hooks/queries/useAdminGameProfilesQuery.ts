import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface AdminUserGameProfileRow {
  userId: string;
  username: string;
  totalAnswered: number;
  overallCorrectRatio: number;
  totalLikes: number;
  totalDislikes: number;
  aiPersonalizedQuestionsEnabled: boolean;
  personalizationActive: boolean;
  topTopics: {
    topicId: string;
    topicName: string;
    score: number;
  }[];
}

const ADMIN_GAME_PROFILES_KEY = 'admin-game-profiles';

async function fetchAdminGameProfiles(): Promise<AdminUserGameProfileRow[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No session');

  const { data, error } = await supabase.functions.invoke('admin-game-profiles', {
    method: 'GET',
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) throw error;
  return data || [];
}

export function useAdminGameProfilesQuery() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [ADMIN_GAME_PROFILES_KEY],
    queryFn: fetchAdminGameProfiles,
    staleTime: 0, // No cache - always fetch fresh data
    gcTime: 0, // No garbage collection delay
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Refetch on component mount
  });

  // Real-time subscription for instant updates
  useEffect(() => {
    console.log('[useAdminGameProfilesQuery] Setting up realtime subscription');

    const channel = supabase
      .channel('admin-game-profiles-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_results',
        },
        (payload) => {
          console.log('[useAdminGameProfilesQuery] Game results update received:', payload);
          queryClient.refetchQueries({
            queryKey: [ADMIN_GAME_PROFILES_KEY],
            exact: true,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_question_analytics',
        },
        (payload) => {
          console.log('[useAdminGameProfilesQuery] Game question analytics update received:', payload);
          queryClient.refetchQueries({
            queryKey: [ADMIN_GAME_PROFILES_KEY],
            exact: true,
          });
        }
      )
      .subscribe((status) => {
        console.log('[useAdminGameProfilesQuery] Subscription status:', status);
      });

    return () => {
      console.log('[useAdminGameProfilesQuery] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    profiles: query.data || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
  };
}
