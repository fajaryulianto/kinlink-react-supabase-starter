import React from 'react';
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { treeService } from '../services/tree.service';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import type { Tree, CreateTreeInput, UpdateTreeInput } from '../types/database';

// Query keys
export const treeKeys = {
  all: ['trees'] as const,
  lists: () => [...treeKeys.all, 'list'] as const,
  list: (filters: string) => [...treeKeys.lists(), { filters }] as const,
  details: () => [...treeKeys.all, 'detail'] as const,
  detail: (id: string) => [...treeKeys.details(), id] as const,
  user: (userId: string) => [...treeKeys.all, 'user', userId] as const,
  accessible: (userId: string) => [...treeKeys.all, 'accessible', userId] as const,
  search: (query: string, userId?: string) => [...treeKeys.all, 'search', query, userId] as const,
  stats: (id: string) => [...treeKeys.detail(id), 'stats'] as const,
  activity: (id: string) => [...treeKeys.detail(id), 'activity'] as const,
};

// Hooks for tree queries
export const useTree = (treeId: string, options?: UseQueryOptions<Tree | null, Error>) => {
  return useQuery({
    queryKey: treeKeys.detail(treeId),
    queryFn: () => treeService.findById(treeId),
    enabled: !!treeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

export const useTreeWithStats = (treeId: string, options?: UseQueryOptions<any, Error>) => {
  return useQuery({
    queryKey: treeKeys.stats(treeId),
    queryFn: () => treeService.getTreeWithStats(treeId),
    enabled: !!treeId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

export const useUserTrees = (userId: string, options?: UseQueryOptions<Tree[], Error>) => {
  return useQuery({
    queryKey: treeKeys.user(userId),
    queryFn: () => treeService.getUserTrees(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

export const useAccessibleTrees = (userId: string, options?: UseQueryOptions<Tree[], Error>) => {
  return useQuery({
    queryKey: treeKeys.accessible(userId),
    queryFn: () => treeService.getAccessibleTrees(userId),
    enabled: !!userId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    ...options,
  });
};

export const useTreeSearch = (query: string, userId?: string, options?: UseQueryOptions<Tree[], Error>) => {
  return useQuery({
    queryKey: treeKeys.search(query, userId),
    queryFn: () => treeService.searchTrees(query, userId),
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

export const usePublicTrees = (limit: number = 20, options?: UseQueryOptions<Tree[], Error>) => {
  return useQuery({
    queryKey: [...treeKeys.all, 'public', limit],
    queryFn: () => treeService.getPublicTrees(limit),
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
};

export const useTreeActivity = (treeId: string, days: number = 30, options?: UseQueryOptions<any, Error>) => {
  return useQuery({
    queryKey: [...treeKeys.activity(treeId), days],
    queryFn: () => treeService.getTreeActivitySummary(treeId, days),
    enabled: !!treeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

export const useTreeAccess = (treeId: string, userId: string, role: 'owner' | 'editor' | 'viewer' = 'viewer') => {
  return useQuery({
    queryKey: [...treeKeys.detail(treeId), 'access', userId, role],
    queryFn: () => treeService.checkTreeAccess(treeId, userId, role),
    enabled: !!treeId && !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Hooks for tree mutations
export const useCreateTree = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (treeData: CreateTreeInput) => treeService.create(treeData),
    onSuccess: (newTree) => {
      queryClient.invalidateQueries({ queryKey: treeKeys.user(user?.id || '') });
      queryClient.invalidateQueries({ queryKey: treeKeys.accessible(user?.id || '') });
      queryClient.setQueryData(treeKeys.detail(newTree.id), newTree);
      toast.success('Tree created successfully');
      return newTree;
    },
    onError: (error: any) => {
      console.error('Create tree error:', error);
      toast.error(error.message || 'Failed to create tree');
    },
  });
};

export const useUpdateTree = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ treeId, data }: { treeId: string; data: UpdateTreeInput }) => {
      if (!user?.id) throw new Error('User not authenticated');
      return treeService.updateTree(treeId, user.id, data);
    },
    onSuccess: (updatedTree, { treeId }) => {
      queryClient.setQueryData(treeKeys.detail(treeId), updatedTree);
      queryClient.invalidateQueries({ queryKey: treeKeys.detail(treeId) });
      queryClient.invalidateQueries({ queryKey: treeKeys.user(user?.id || '') });
      queryClient.invalidateQueries({ queryKey: treeKeys.accessible(user?.id || '') });
      toast.success('Tree updated successfully');
    },
    onError: (error: any) => {
      console.error('Update tree error:', error);
      toast.error(error.message || 'Failed to update tree');
    },
  });
};

export const useDeleteTree = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (treeId: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      return treeService.deleteTree(treeId, user.id);
    },
    onSuccess: (_, treeId) => {
      queryClient.removeQueries({ queryKey: treeKeys.detail(treeId) });
      queryClient.invalidateQueries({ queryKey: treeKeys.user(user?.id || '') });
      queryClient.invalidateQueries({ queryKey: treeKeys.accessible(user?.id || '') });
      toast.success('Tree deleted successfully');
    },
    onError: (error: any) => {
      console.error('Delete tree error:', error);
      toast.error(error.message || 'Failed to delete tree');
    },
  });
};

export const useDuplicateTree = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ treeId, newName }: { treeId: string; newName?: string }) => {
      if (!user?.id) throw new Error('User not authenticated');
      return treeService.duplicateTree(treeId, user.id, newName);
    },
    onSuccess: (newTree) => {
      queryClient.invalidateQueries({ queryKey: treeKeys.user(user?.id || '') });
      queryClient.invalidateQueries({ queryKey: treeKeys.accessible(user?.id || '') });
      queryClient.setQueryData(treeKeys.detail(newTree.id), newTree);
      toast.success('Tree duplicated successfully');
      return newTree;
    },
    onError: (error: any) => {
      console.error('Duplicate tree error:', error);
      toast.error(error.message || 'Failed to duplicate tree');
    },
  });
};

// Custom hooks for common operations
export const useCurrentUserTrees = () => {
  const { user } = useAuth();
  return useUserTrees(user?.id || '', {
    enabled: !!user?.id,
  });
};

export const useCurrentUserAccessibleTrees = () => {
  const { user } = useAuth();
  return useAccessibleTrees(user?.id || '', {
    enabled: !!user?.id,
  });
};

export const useTreeSearchWithDebounce = () => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const { user } = useAuth();

  const debouncedQuery = React.useMemo(() => {
    const timer = setTimeout(() => searchQuery, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const searchResults = useTreeSearch(debouncedQuery, user?.id, {
    enabled: debouncedQuery.length >= 2 && !!user?.id,
  });

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isLoading: searchResults.isLoading,
    data: searchResults.data,
  };
};

// Hook for tree dashboard data
export const useTreeDashboard = (treeId: string) => {
  const tree = useTree(treeId);
  const treeStats = useTreeWithStats(treeId);
  const treeActivity = useTreeActivity(treeId);
  const { user } = useAuth();
  const treeAccess = useTreeAccess(treeId, user?.id || '', 'editor');

  return {
    tree: tree.data,
    treeStats: treeStats.data,
    treeActivity: treeActivity.data,
    hasEditAccess: treeAccess.data,
    isLoading: tree.isLoading || treeStats.isLoading || treeActivity.isLoading || treeAccess.isLoading,
    error: tree.error || treeStats.error || treeActivity.error || treeAccess.error,
  };
};

// Hook for tree management operations
export const useTreeManagement = (treeId: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const updateTree = useUpdateTree();
  const deleteTree = useDeleteTree();
  const duplicateTree = useDuplicateTree();

  const handleUpdateTree = React.useCallback((data: UpdateTreeInput) => {
    return updateTree.mutateAsync({ treeId, data });
  }, [treeId, updateTree]);

  const handleDeleteTree = React.useCallback(() => {
    return deleteTree.mutateAsync(treeId);
  }, [treeId, deleteTree]);

  const handleDuplicateTree = React.useCallback((newName?: string) => {
    return duplicateTree.mutateAsync({ treeId, newName });
  }, [treeId, duplicateTree]);

  return {
    updateTree: handleUpdateTree,
    deleteTree: handleDeleteTree,
    duplicateTree: handleDuplicateTree,
    isLoading: updateTree.isLoading || deleteTree.isLoading || duplicateTree.isLoading,
  };
};