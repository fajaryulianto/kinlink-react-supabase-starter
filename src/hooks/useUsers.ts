import React from 'react';
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { userService } from '../services/user.service';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import type { User, CreateUserInput, UpdateUserInput } from '../types/database';

// Query keys
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: string) => [...userKeys.lists(), { filters }] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  search: (query: string) => [...userKeys.all, 'search', query] as const,
  stats: (id: string) => [...userKeys.detail(id), 'stats'] as const,
};

// Hooks for user queries
export const useUser = (userId: string, options?: UseQueryOptions<User | null, Error>) => {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => userService.findById(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

export const useUserWithStats = (userId: string, options?: UseQueryOptions<any, Error>) => {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => userService.getUserWithRelations(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

export const useUserByEmail = (email: string, options?: UseQueryOptions<User | null, Error>) => {
  return useQuery({
    queryKey: ['user', 'email', email],
    queryFn: () => userService.findByEmail(email),
    enabled: !!email,
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
};

export const useUserStats = (userId: string, options?: UseQueryOptions<any, Error>) => {
  return useQuery({
    queryKey: userKeys.stats(userId),
    queryFn: () => userService.getUserStats(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

export const useSearchUsers = (query: string, options?: UseQueryOptions<User[], Error>) => {
  return useQuery({
    queryKey: userKeys.search(query),
    queryFn: () => userService.searchUsers(query),
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

// Hooks for user mutations
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ data }: { data: UpdateUserInput }) => {
      if (!user?.id) throw new Error('User not authenticated');
      return userService.updateProfile(user.id, data);
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(userKeys.detail(user?.id || ''), updatedUser);
      queryClient.invalidateQueries({ queryKey: userKeys.detail(user?.id || '') });
      toast.success('Profile updated successfully');
    },
    onError: (error: any) => {
      console.error('Update profile error:', error);
      toast.error(error.message || 'Failed to update profile');
    },
  });
};

export const useUpdatePhoto = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (photoUrl: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      return userService.updatePhotoUrl(user.id, photoUrl);
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(userKeys.detail(user?.id || ''), updatedUser);
      queryClient.invalidateQueries({ queryKey: userKeys.detail(user?.id || '') });
      toast.success('Photo updated successfully');
    },
    onError: (error: any) => {
      console.error('Update photo error:', error);
      toast.error(error.message || 'Failed to update photo');
    },
  });
};

// Custom hook for current user data
export const useCurrentUser = () => {
  const { user } = useAuth();
  return useUserWithStats(user?.id || '', {
    enabled: !!user?.id,
  });
};

// Custom hook for user search with debouncing
export const useUserSearch = () => {
  const [searchQuery, setSearchQuery] = React.useState('');

  const debouncedQuery = React.useMemo(() => {
    const timer = setTimeout(() => searchQuery, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const searchResults = useSearchUsers(debouncedQuery, {
    enabled: debouncedQuery.length >= 2,
  });

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isLoading: searchResults.isLoading,
    data: searchResults.data,
  };
};

// Hook for user creation (admin use)
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData: CreateUserInput) => userService.create(userData),
    onSuccess: (newUser) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      toast.success('User created successfully');
      return newUser;
    },
    onError: (error: any) => {
      console.error('Create user error:', error);
      toast.error(error.message || 'Failed to create user');
    },
  });
};

// Hook for bulk user operations
export const useBulkUserOperations = () => {
  const queryClient = useQueryClient();

  const bulkUpdate = useMutation({
    mutationFn: ({ userIds, data }: { userIds: string[]; data: UpdateUserInput }) =>
      Promise.all(userIds.map(id => userService.update(id, data))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      toast.success('Users updated successfully');
    },
    onError: (error: any) => {
      console.error('Bulk update error:', error);
      toast.error('Failed to update users');
    },
  });

  return {
    bulkUpdate,
    isLoading: bulkUpdate.isLoading,
  };
};