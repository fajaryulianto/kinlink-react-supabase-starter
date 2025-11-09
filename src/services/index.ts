// Export all services
export { BaseService, DatabaseError, ValidationError, NotFoundError, UnauthorizedError } from './base';
export { UserService, userService } from './user.service';
export { TreeService, treeService } from './tree.service';
export { MemberService, memberService } from './member.service';

// Export hooks
export * from '../hooks/useUsers';
export * from '../hooks/useTrees';
export * from '../hooks/useMembers';

// Re-export commonly used types
export type * from '../types/database';

// Utility functions for service operations
export const createServiceError = (
  message: string,
  code?: string,
  details?: any
): DatabaseError => {
  return new DatabaseError(message, code, details);
};

export const handleServiceError = (error: any, context: string): DatabaseError => {
  if (error instanceof DatabaseError) {
    return error;
  }

  if (error?.code === '23505') { // PostgreSQL unique violation
    return new DatabaseError('Record already exists', 'DUPLICATE_RECORD', error, context);
  }

  if (error?.code === '23503') { // PostgreSQL foreign key violation
    return new DatabaseError('Referenced record does not exist', 'FOREIGN_KEY_VIOLATION', error, context);
  }

  if (error?.code === '23514') { // PostgreSQL check violation
    return new DatabaseError('Data validation failed', 'CHECK_VIOLATION', error, context);
  }

  // Generic error
  return new DatabaseError(
    error?.message || 'An unexpected error occurred',
    error?.code || 'UNKNOWN_ERROR',
    error,
    context
  );
};

// Optimistic update helpers
export const createOptimisticUpdate = <T>(
  queryClient: any,
  queryKey: string[],
  newData: Partial<T>,
  updateFn: (old: T) => T
) => {
  // Cancel any outgoing refetches
  queryClient.cancelQueries({ queryKey });

  // Snapshot the previous value
  const previousData = queryClient.getQueryData(queryKey);

  // Optimistically update to the new value
  queryClient.setQueryData(queryKey, (old: T) => updateFn({ ...old, ...newData }));

  // Return a context object with the snapshotted value
  return { previousData };
};

export const rollbackOptimisticUpdate = (
  queryClient: any,
  queryKey: string[],
  previousData: any
) => {
  queryClient.setQueryData(queryKey, previousData);
};

// Cache invalidation helpers
export const invalidateRelatedQueries = (
  queryClient: any,
  baseKey: string[],
  relatedIds: string[]
) => {
  // Invalidate specific queries
  relatedIds.forEach(id => {
    queryClient.invalidateQueries({ queryKey: [...baseKey, id] });
  });

  // Invalidate list queries
  queryClient.invalidateQueries({ queryKey: baseKey });
};

// Pagination helpers
export const createPaginationQuery = (page: number, limit: number) => {
  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
};

export const getPaginationInfo = (
  total: number,
  page: number,
  limit: number
) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    total,
    totalPages,
    currentPage: page,
    limit,
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null,
  };
};

// Search helpers
export const createSearchQuery = (searchTerm: string) => {
  return {
    searchTerm: searchTerm.trim(),
    isValid: searchTerm.trim().length >= 2,
  };
};

// Form validation helpers for services
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date.toISOString().split('T')[0] === dateString;
};

export const validateYear = (year: number): boolean => {
  const currentYear = new Date().getFullYear();
  return year >= 1900 && year <= currentYear;
};

// Data transformation helpers
export const transformMemberForDisplay = (member: any) => {
  return {
    ...member,
    fullName: `${member.firstName} ${member.lastName}`.trim(),
    displayName: member.nickname || `${member.firstName} ${member.lastName}`.trim(),
    age: member.birthDate ? calculateAge(new Date(member.birthDate), member.deathDate ? new Date(member.deathDate) : undefined) : null,
    birthYear: member.birthDate ? new Date(member.birthDate).getFullYear() : null,
    deathYear: member.deathDate ? new Date(member.deathDate).getFullYear() : null,
  };
};

export const calculateAge = (birthDate: Date, deathDate?: Date): number => {
  const endDate = deathDate || new Date();
  let age = endDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = endDate.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && endDate.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
};

// Error boundary helpers
export const getServiceErrorType = (error: any): string => {
  if (error instanceof DatabaseError) {
    return error.name;
  }

  if (error?.code) {
    switch (error.code) {
      case '23505':
        return 'DuplicateError';
      case '23503':
        return 'ForeignKeyError';
      case '23514':
        return 'ValidationError';
      default:
        return 'DatabaseError';
    }
  }

  return 'UnknownError';
};

export const getServiceErrorMessage = (error: any, fallbackMessage?: string): string => {
  if (error instanceof DatabaseError) {
    return error.message;
  }

  if (error?.message) {
    return error.message;
  }

  return fallbackMessage || 'An unexpected error occurred';
};