import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Heart, ThumbsDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import AdminLayout from '@/components/admin/AdminLayout';
import { useI18n } from '@/i18n';

interface TopicPopularityRow {
  topicId: number;
  topicName: string;
  totalLikes: number;
  totalDislikes: number;
  netScore: number;
}

type SortField = 'topicName' | 'totalLikes' | 'totalDislikes' | 'netScore';
type SortDirection = 'asc' | 'desc';

const AdminPopularContent = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [data, setData] = useState<TopicPopularityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('netScore');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/admin/login');
        return;
      }

      // Check admin role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        navigate('/admin/login');
        return;
      }

      fetchPopularityData();
    };

    checkAuth();
  }, [navigate]);

  // Realtime subscriptions removed - question_likes/dislikes tables no longer exist

  const fetchPopularityData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired');
        setLoading(false);
        return;
      }
      
      const { data: responseData, error: fetchError } = await supabase.functions.invoke(
        'admin-topic-popularity',
        {
          headers: { Authorization: `Bearer ${session.access_token}` }
        }
      );

      if (fetchError) throw fetchError;

      setData(responseData as TopicPopularityRow[]);
    } catch (err) {
      console.error('[AdminPopularContent] Error:', err);
      setError(t('popular.error_loading'));
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to descending
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    let aValue: number | string = a[sortField];
    let bValue: number | string = b[sortField];

    if (sortField === 'topicName') {
      return sortDirection === 'asc' 
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    }

    // Numeric sorting
    const diff = (Number(bValue) - Number(aValue));
    return sortDirection === 'asc' ? -diff : diff;
  });

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            {t('popular.page_title')}
          </h1>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-destructive/20 border border-destructive rounded-lg p-6 text-center">
            <p className="text-foreground">{error}</p>
            <Button
              onClick={fetchPopularityData}
              className="mt-4"
              variant="outline"
            >
              {t('common.retry')}
            </Button>
          </div>
        ) : (
          <div className="bg-background/80 backdrop-blur-sm rounded-lg border border-primary/20 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-primary/20">
                  <TableHead className="text-foreground font-bold">#</TableHead>
                  <TableHead 
                    className="text-foreground font-bold cursor-pointer hover:text-primary"
                    onClick={() => handleSort('topicName')}
                  >
                    {t('popular.table_topic_name')} {sortField === 'topicName' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="text-foreground font-bold cursor-pointer hover:text-primary text-center"
                    onClick={() => handleSort('totalLikes')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Heart className="w-4 h-4 text-red-500" />
                      {t('popular.table_total_likes')} {sortField === 'totalLikes' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-foreground font-bold cursor-pointer hover:text-primary text-center"
                    onClick={() => handleSort('totalDislikes')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <ThumbsDown className="w-4 h-4 text-orange-500" />
                      Diszlájkok {sortField === 'totalDislikes' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-foreground font-bold cursor-pointer hover:text-primary text-center"
                    onClick={() => handleSort('netScore')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <TrendingUp className="w-4 h-4 text-accent" />
                      Nettó érték {sortField === 'netScore' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((row, index) => (
                  <TableRow 
                    key={row.topicId}
                    className="border-primary/10 hover:bg-primary/5"
                  >
                    <TableCell className="text-foreground font-medium">
                      {index + 1}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {row.topicName}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1 text-red-500 font-bold">
                        {row.totalLikes}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1 text-orange-500 font-bold">
                        {row.totalDislikes}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-bold ${
                        row.netScore > 0 
                          ? 'text-success' 
                          : row.netScore < 0 
                            ? 'text-destructive' 
                            : 'text-muted-foreground'
                      }`}>
                        {row.netScore > 0 ? '+' : ''}{row.netScore}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPopularContent;