import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CreatorStatus {
  is_creator: boolean;
  creator_plan_id: string | null;
  creator_subscription_status: 'inactive' | 'active_trial' | 'active_paid' | 'canceled';
  creator_trial_ends_at: string | null;
}

export const useCreatorStatus = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['creator-status', userId],
    queryFn: async (): Promise<CreatorStatus | null> => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('is_creator, creator_plan_id, creator_subscription_status, creator_trial_ends_at')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching creator status:', error);
        throw error;
      }

      return data as CreatorStatus;
    },
    enabled: !!userId,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
};

// Helper to check if user has active creator access
export const hasActiveCreatorAccess = (status: CreatorStatus | null | undefined): boolean => {
  if (!status) return false;
  return status.is_creator && 
    (status.creator_subscription_status === 'active_trial' || 
     status.creator_subscription_status === 'active_paid');
};
