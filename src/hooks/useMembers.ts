import React from 'react';
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { memberService } from '../services/member.service';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import type { Member, CreateMemberInput, UpdateMemberInput, MemberWithRelations } from '../types/database';

// Query keys
export const memberKeys = {
  all: ['members'] as const,
  lists: () => [...memberKeys.all, 'list'] as const,
  list: (treeId: string, filters: string) => [...memberKeys.lists(), treeId, { filters }] as const,
  details: () => [...memberKeys.all, 'detail'] as const,
  detail: (id: string) => [...memberKeys.details(), id] as const,
  tree: (treeId: string) => [...memberKeys.all, 'tree', treeId] as const,
  treeMembers: (treeId: string, filters: string) => [...memberKeys.tree(treeId), 'members', { filters }] as const,
  search: (query: string, userId: string, treeId?: string) => [...memberKeys.all, 'search', query, userId, treeId] as const,
  siblings: (id: string) => [...memberKeys.detail(id), 'siblings'] as const,
  stats: (id: string) => [...memberKeys.detail(id), 'stats'] as const,
  familyTree: (treeId: string, rootId?: string) => [...memberKeys.tree(treeId), 'family-tree', rootId] as const,
};

// Hooks for member queries
export const useMember = (memberId: string, options?: UseQueryOptions<Member | null, Error>) => {
  return useQuery({
    queryKey: memberKeys.detail(memberId),
    queryFn: () => memberService.findById(memberId),
    enabled: !!memberId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

export const useMemberWithRelations = (memberId: string, options?: UseQueryOptions<MemberWithRelations | null, Error>) => {
  return useQuery({
    queryKey: memberKeys.detail(memberId),
    queryFn: () => memberService.getMemberWithRelations(memberId),
    enabled: !!memberId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    ...options,
  });
};

export const useTreeMembers = (
  treeId: string,
  filters: {
    search?: string;
    gender?: 'male' | 'female' | 'other';
    isLiving?: boolean;
    birthYearRange?: { start?: number; end?: number };
  } = {},
  options?: UseQueryOptions<Member[], Error>
) => {
  const filtersKey = JSON.stringify(filters);

  return useQuery({
    queryKey: memberKeys.treeMembers(treeId, filtersKey),
    queryFn: () => memberService.getTreeMembers(treeId, filters),
    enabled: !!treeId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    ...options,
  });
};

export const useMemberSearch = (
  query: string,
  userId: string,
  treeId?: string,
  options?: UseQueryOptions<Member[], Error>
) => {
  return useQuery({
    queryKey: memberKeys.search(query, userId, treeId),
    queryFn: () => memberService.searchMembers(query, userId, { treeId }),
    enabled: query.length >= 2 && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

export const useMemberSiblings = (memberId: string, options?: UseQueryOptions<Member[], Error>) => {
  return useQuery({
    queryKey: memberKeys.siblings(memberId),
    queryFn: () => memberService.getSiblings(memberId),
    enabled: !!memberId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

export const useMemberStats = (memberId: string, options?: UseQueryOptions<any, Error>) => {
  return useQuery({
    queryKey: memberKeys.stats(memberId),
    queryFn: () => memberService.getMemberStats(memberId),
    enabled: !!memberId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

export const useFamilyTree = (
  treeId: string,
  rootMemberId?: string,
  maxDepth: number = 5,
  options?: UseQueryOptions<any[], Error>
) => {
  return useQuery({
    queryKey: memberKeys.familyTree(treeId, rootMemberId),
    queryFn: () => memberService.getFamilyTree(treeId, rootMemberId, maxDepth),
    enabled: !!treeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

// Hooks for member mutations
export const useCreateMember = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({
      memberData,
      relationships,
    }: {
      memberData: CreateMemberInput;
      relationships?: Array<{
        toMemberId: string;
        relationshipType: 'parent' | 'child' | 'spouse' | 'sibling';
        parentRole?: 'father' | 'mother' | 'neutral';
        metadata?: Record<string, any>;
      }>;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');
      return memberService.createMemberWithRelationships(memberData, relationships);
    },
    onSuccess: (result, variables) => {
      // Invalidate tree members list
      queryClient.invalidateQueries({
        queryKey: memberKeys.treeMembers(variables.memberData.treeId, '{}')
      });

      // Invalidate family tree
      queryClient.invalidateQueries({
        queryKey: memberKeys.familyTree(variables.memberData.treeId)
      });

      // Add new member to cache
      if (result.member) {
        queryClient.setQueryData(memberKeys.detail(result.member.id), result.member);
      }

      toast.success('Member added successfully');
      return result;
    },
    onError: (error: any) => {
      console.error('Create member error:', error);
      toast.error(error.message || 'Failed to add member');
    },
  });
};

export const useUpdateMember = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ memberId, data }: { memberId: string; data: UpdateMemberInput }) => {
      if (!user?.id) throw new Error('User not authenticated');
      return memberService.updateMember(memberId, user.id, data);
    },
    onSuccess: (updatedMember, { memberId }) => {
      // Update member in cache
      queryClient.setQueryData(memberKeys.detail(memberId), updatedMember);

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: memberKeys.detail(memberId) });
      queryClient.invalidateQueries({ queryKey: memberKeys.siblings(memberId) });
      queryClient.invalidateQueries({ queryKey: memberKeys.stats(memberId) });

      // Get treeId from updated member and invalidate tree queries
      if (updatedMember?.treeId) {
        queryClient.invalidateQueries({
          queryKey: memberKeys.treeMembers(updatedMember.treeId, '{}')
        });
        queryClient.invalidateQueries({
          queryKey: memberKeys.familyTree(updatedMember.treeId)
        });
      }

      toast.success('Member updated successfully');
    },
    onError: (error: any) => {
      console.error('Update member error:', error);
      toast.error(error.message || 'Failed to update member');
    },
  });
};

export const useDeleteMember = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (memberId: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      return memberService.deleteMember(memberId, user.id);
    },
    onSuccess: (_, memberId) => {
      // Remove member from cache
      queryClient.removeQueries({ queryKey: memberKeys.detail(memberId) });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() });

      toast.success('Member deleted successfully');
    },
    onError: (error: any) => {
      console.error('Delete member error:', error);
      toast.error(error.message || 'Failed to delete member');
    },
  });
};

// Custom hooks for common operations
export const useMemberSearchWithDebounce = (treeId?: string) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const { user } = useAuth();

  const debouncedQuery = React.useMemo(() => {
    const timer = setTimeout(() => searchQuery, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const searchResults = useMemberSearch(debouncedQuery, user?.id || '', treeId, {
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

// Hook for member management
export const useMemberManagement = (treeId: string) => {
  const members = useTreeMembers(treeId);
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();

  const handleCreateMember = React.useCallback((
    memberData: CreateMemberInput,
    relationships?: Array<{
      toMemberId: string;
      relationshipType: 'parent' | 'child' | 'spouse' | 'sibling';
      parentRole?: 'father' | 'mother' | 'neutral';
      metadata?: Record<string, any>;
    }>
  ) => {
    return createMember.mutateAsync({ memberData, relationships });
  }, [createMember]);

  const handleUpdateMember = React.useCallback((memberId: string, data: UpdateMemberInput) => {
    return updateMember.mutateAsync({ memberId, data });
  }, [updateMember]);

  const handleDeleteMember = React.useCallback((memberId: string) => {
    return deleteMember.mutateAsync(memberId);
  }, [deleteMember]);

  return {
    members: members.data || [],
    isLoading: members.isLoading,
    error: members.error,
    createMember: handleCreateMember,
    updateMember: handleUpdateMember,
    deleteMember: handleDeleteMember,
    isMutating: createMember.isLoading || updateMember.isLoading || deleteMember.isLoading,
  };
};

// Hook for member detail view
export const useMemberDetail = (memberId: string) => {
  const member = useMemberWithRelations(memberId);
  const memberStats = useMemberStats(memberId);
  const memberSiblings = useMemberSiblings(memberId);
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();

  const handleUpdateMember = React.useCallback((data: UpdateMemberInput) => {
    return updateMember.mutateAsync({ memberId, data });
  }, [memberId, updateMember]);

  const handleDeleteMember = React.useCallback(() => {
    return deleteMember.mutateAsync(memberId);
  }, [memberId, deleteMember]);

  return {
    member: member.data,
    memberStats: memberStats.data,
    siblings: memberSiblings.data || [],
    isLoading: member.isLoading || memberStats.isLoading || memberSiblings.isLoading,
    error: member.error || memberStats.error || memberSiblings.error,
    updateMember: handleUpdateMember,
    deleteMember: handleDeleteMember,
    isUpdating: updateMember.isLoading,
    isDeleting: deleteMember.isLoading,
  };
};

// Hook for member filtering
export const useMemberFilters = (treeId: string) => {
  const [filters, setFilters] = React.useState({
    search: '',
    gender: undefined as 'male' | 'female' | 'other' | undefined,
    isLiving: undefined as boolean | undefined,
    birthYearRange: undefined as { start?: number; end?: number } | undefined,
  });

  const members = useTreeMembers(treeId, filters);

  const updateFilters = React.useCallback((newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = React.useCallback(() => {
    setFilters({
      search: '',
      gender: undefined,
      isLiving: undefined,
      birthYearRange: undefined,
    });
  }, []);

  return {
    filters,
    members: members.data || [],
    isLoading: members.isLoading,
    error: members.error,
    updateFilters,
    clearFilters,
  };
};