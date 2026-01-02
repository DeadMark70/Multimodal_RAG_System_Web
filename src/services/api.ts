/**
 * API 服務層 - Axios 實例與攔截器
 * 
 * 功能：
 * - 自動注入 Supabase JWT Token
 * - 統一錯誤處理
 * - Base URL 設定
 */

import axios from 'axios';
import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 秒逾時 (考慮 LLM 回應時間)
});

// 請求攔截器 - 自動注入 JWT Token
api.interceptors.request.use(
  async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 回應攔截器 - 統一錯誤處理
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 未授權 - 可能需要重新登入
    if (error.response?.status === 401) {
      console.error('認證失敗，請重新登入');
      // 可在此觸發登出邏輯
    }
    
    // 提取錯誤訊息
    const message = error.response?.data?.detail || error.message || '發生未知錯誤';
    
    return Promise.reject(new Error(message));
  }
);

export default api;
