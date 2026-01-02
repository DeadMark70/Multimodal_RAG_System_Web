/**
 * useDashboardStats Hook
 * 
 * 使用 React Query 取得儀表板統計資料
 */

import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '../services/statsApi';
import type { DashboardStats } from '../types/rag';

export function useDashboardStats() {
  return useQuery<DashboardStats, Error>({
    queryKey: ['dashboardStats'],
    queryFn: getDashboardStats,
    staleTime: 30000, // 30 秒內不重新取得
    refetchInterval: 60000, // 每分鐘自動刷新
  });
}

export default useDashboardStats;
