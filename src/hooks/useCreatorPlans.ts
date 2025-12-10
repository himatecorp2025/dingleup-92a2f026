import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CreatorPlan {
  id: string;
  name: string;
  description: string | null;
  video_limit: number;
  monthly_price_huf: number;
  is_active: boolean;
  sort_order: number;
}

export const useCreatorPlans = () => {
  return useQuery({
    queryKey: ['creator-plans'],
    queryFn: async (): Promise<CreatorPlan[]> => {
      const { data, error } = await supabase
        .from('creator_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching creator plans:', error);
        throw error;
      }

      return data as CreatorPlan[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - plans don't change often
  });
};
