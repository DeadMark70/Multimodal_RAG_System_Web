/**
 * API 服務層 - Axios 實例與攔截器
 * 
 * 功能：
 * - 自動注入 Supabase JWT Token
 * - 統一錯誤處理
 * - Base URL 設定
 */

import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import {
  assertAllowedApiTarget,
  resolveApiUrl,
  shouldAttachAuthorizationHeader,
} from './networkPolicy';
import {
  getAccessToken,
  publishSessionExpired,
  refreshAccessToken,
} from './sessionRecovery';

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _sessionRefreshAttempted?: boolean;
  _sessionRetry?: boolean;
};

export class ApiError extends Error {
  readonly status: number | undefined;
  readonly requestId: string | undefined;

  constructor(message: string, status?: number, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.requestId = requestId;
  }
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 150000, // 150 秒逾時 (RAG 回答 + 評估可能需要 60-90 秒)
});

// 請求攔截器 - 自動注入 JWT Token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const retriableConfig = config as RetriableRequestConfig;
    const fullUrl = resolveApiUrl(config.baseURL ?? API_BASE_URL, config.url ?? '/');
    assertAllowedApiTarget(fullUrl);
    const canAttachAuthorization = shouldAttachAuthorizationHeader(fullUrl);

    let accessToken: string | null = null;
    if (canAttachAuthorization) {
      accessToken = await getAccessToken();
      if (!accessToken && retriableConfig._sessionRefreshAttempted !== true) {
        retriableConfig._sessionRefreshAttempted = true;
        accessToken = await refreshAccessToken();
      }
    }

    if (accessToken) {
      config.headers.set('Authorization', `Bearer ${accessToken}`);
    }
    
    return config;
  },
  (error: unknown) => {
    if (error instanceof Error) {
      return Promise.reject(error);
    }
    return Promise.reject(new Error('Request interceptor failed'));
  }
);

// 回應攔截器 - 統一錯誤處理
api.interceptors.response.use(
  (response) => response,
  async (
    error: AxiosError<{
      detail?: string;
      error?: {
        message?: string;
        code?: string;
      };
    }>
  ) => {
    const status = error.response?.status;
    const config = error.config as RetriableRequestConfig | undefined;

    if (status === 401) {
      if (
        config
        && config._sessionRetry !== true
        && config._sessionRefreshAttempted !== true
      ) {
        config._sessionRetry = true;
        config._sessionRefreshAttempted = true;
        const accessToken = await refreshAccessToken();

        if (accessToken) {
          config.headers.set('Authorization', `Bearer ${accessToken}`);
          return api.request(config);
        }
      }

      await publishSessionExpired();
    }

    // 提取錯誤訊息：優先新格式 error.message，向後相容 detail。
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.detail ||
      error.message ||
      '發生未知錯誤';
    const responseHeaders = error.response?.headers as
      | { ['x-request-id']?: unknown }
      | undefined;
    const requestIdValue = responseHeaders?.['x-request-id'];
    const requestId =
      typeof requestIdValue === 'string' && requestIdValue.length > 0
        ? requestIdValue
        : undefined;

    throw new ApiError(message, status, requestId);
  }
);

export default api;
