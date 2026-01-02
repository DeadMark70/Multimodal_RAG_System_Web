/**
 * useConversations Hook
 * 
 * 使用 TanStack Query 管理對話列表
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@chakra-ui/react';
import { 
  listConversations, 
  createConversation, 
  getConversation,
  updateConversation,
  deleteConversation,
} from '../services/conversationApi';
import type { 
  Conversation, 
  ConversationDetail,
  CreateConversationRequest,
} from '../types/conversation';

const QUERY_KEY = ['conversations'];

/**
 * 取得對話列表
 */
export function useConversationList() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: listConversations,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * 取得單一對話詳情
 */
export function useConversationDetail(id: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: () => getConversation(id!),
    enabled: !!id,
  });
}

/**
 * 對話 CRUD 操作
 */
export function useConversationMutations() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const createMutation = useMutation({
    mutationFn: (request: CreateConversationRequest) => createConversation(request),
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({
        title: '對話已建立',
        status: 'success',
        duration: 2000,
      });
      return newConversation;
    },
    onError: (error: Error) => {
      toast({
        title: '建立失敗',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => 
      updateConversation(id, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (error: Error) => {
      toast({
        title: '更新失敗',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteConversation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({
        title: '對話已刪除',
        status: 'info',
        duration: 2000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: '刪除失敗',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    },
  });

  return {
    create: createMutation.mutateAsync,
    update: updateMutation.mutate,
    remove: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

/**
 * 組合 Hook - 完整對話管理
 */
export function useConversations() {
  const listQuery = useConversationList();
  const mutations = useConversationMutations();

  return {
    conversations: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    error: listQuery.error,
    refetch: listQuery.refetch,
    ...mutations,
  };
}

export default useConversations;
