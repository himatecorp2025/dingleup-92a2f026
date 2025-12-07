import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';

export interface AdInterestTopicSummary {
  topicId: string;
  topicName: string;
  avgInterestScore: number;
  userCount: number;
}

export interface TopicBasic {
  topicId: string;
  topicName: string;
}

export interface AdUserInterestRow {
  userIdHash: string;
  topTopics: {
    topicId: string;
    topicName: string;
    interestScore: number;
  }[];
  totalTopicsWithInterest: number;
}

export const useAdInterests = () => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);

  const recalculateInterests = async () => {
    setRecalculating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(t('errors.not_logged_in'));
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('admin-ad-interests-recalculate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;

      toast.success(t('admin.success_recalculated').replace('{count}', String(data.processedUserTopicPairs)));
      return data;
    } catch (error) {
      console.error('Error recalculating ad interests:', error);
      toast.error(t('admin.error_recalculating_ad_interests'));
      throw error;
    } finally {
      setRecalculating(false);
    }
  };

  const fetchAllTopics = async (): Promise<TopicBasic[]> => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return [];
      }
      
      const { data, error } = await supabase.functions.invoke('admin-ad-interests-all-topics', {
        method: 'GET',
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;

      return data.topics || [];
    } catch (error) {
      console.error('Error fetching all topics:', error);
      toast.error(t('admin.error_loading_all_topics'));
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchTopicSummary = async (): Promise<AdInterestTopicSummary[]> => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return [];
      }
      
      const { data, error } = await supabase.functions.invoke('admin-ad-interests-summary', {
        method: 'GET',
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;

      return data.topics || [];
    } catch (error) {
      console.error('Error fetching topic summary:', error);
      toast.error(t('admin.error_loading_topic_summary'));
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchUserInterests = async (page = 1, pageSize = 50, topicId?: string) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return { users: [], total: 0, page: 1, pageSize: 50 };
      }
      
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (topicId) {
        params.append('topicId', topicId);
      }

      const { data, error } = await supabase.functions.invoke(
        `admin-ad-interests-users?${params.toString()}`,
        { 
          method: 'GET',
          headers: { Authorization: `Bearer ${session.access_token}` }
        }
      );

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching user interests:', error);
      toast.error(t('admin.error_loading_user_interests'));
      return { items: [], page, pageSize, totalItems: 0, totalPages: 0 };
    } finally {
      setLoading(false);
    }
  };

  const enableRealtime = (onUpdate: () => void) => {
    if (realtimeEnabled) return;


    const analyticsChannel = supabase
      .channel('admin-ad-interests-analytics')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_question_analytics'
      }, onUpdate)
      .subscribe();

    setRealtimeEnabled(true);

    return () => {
      supabase.removeChannel(analyticsChannel);
    };
  };

  return {
    loading,
    recalculating,
    recalculateInterests,
    fetchAllTopics,
    fetchTopicSummary,
    fetchUserInterests,
    enableRealtime,
  };
};