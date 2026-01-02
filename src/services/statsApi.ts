/**
 * 統計 API 服務
 * 
 * 端點：
 * - GET /stats/dashboard - 儀表板統計
 */

import api from './api';
import type { DashboardStats } from '../types/rag';

/**
 * 取得儀表板統計資料
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await api.get<DashboardStats>('/stats/dashboard');
  return response.data;
}
