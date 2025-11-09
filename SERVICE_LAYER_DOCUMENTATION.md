# Service Layer Documentation

## Overview

The KinLink service layer provides a comprehensive, type-safe data access layer built with Drizzle ORM and TanStack Query. It encapsulates all database operations, provides caching, optimistic updates, and error handling.

## Architecture

### Base Service Class

The `BaseService<T, InsertT, UpdateT>` class provides common CRUD operations:

- **CRUD Operations**: `create`, `read`, `update`, `delete`
- **Query Operations**: `findMany`, `findById`, `search`, `paginate`
- **Utility Operations**: `exists`, `count`
- **Error Handling**: Consistent error handling across all services

### Service Classes

#### UserService
Manages user accounts and profiles.

**Key Methods:**
- `findByEmail(email)` - Find user by email
- `create(userData)` - Create new user with validation
- `updateProfile(userId, data)` - Update user profile
- `getUserStats(userId)` - Get user statistics
- `searchUsers(query, limit)` - Search users by name/email

**Example Usage:**
```typescript
import { userService } from '@/services';

// Create a new user
const user = await userService.create({
  email: 'user@example.com',
  displayName: 'John Doe',
});

// Update user profile
await userService.updateProfile(userId, {
  displayName: 'Jane Doe',
});
```

#### TreeService
Manages family trees and access control.

**Key Methods:**
- `getUserTrees(userId)` - Get trees owned by user
- `getAccessibleTrees(userId)` - Get all accessible trees
- `checkTreeAccess(treeId, userId, role)` - Verify permissions
- `getTreeWithStats(treeId)` - Get tree with statistics
- `searchTrees(query, userId)` - Search trees
- `duplicateTree(treeId, userId, newName)` - Duplicate tree

**Example Usage:**
```typescript
import { treeService } from '@/services';

// Create a new tree
const tree = await treeService.create({
  name: 'My Family Tree',
  description: 'Our family history',
  ownerId: userId,
  isPublic: false,
});

// Check if user has edit access
const canEdit = await treeService.checkTreeAccess(treeId, userId, 'editor');
```

#### MemberService
Manages family members with complex relationship handling.

**Key Methods:**
- `createMemberWithRelationships(memberData, relationships)` - Atomic member creation
- `getTreeMembers(treeId, filters)` - Get filtered tree members
- `getMemberWithRelations(memberId)` - Get member with full relations
- `getSiblings(memberId)` - Find siblings
- `searchMembers(query, userId, treeId)` - Search members
- `deleteMember(memberId, userId)` - Delete with cleanup

**Example Usage:**
```typescript
import { memberService } from '@/services';

// Create member with relationships
const result = await memberService.createMemberWithRelationships(
  {
    treeId: 'tree-1',
    firstName: 'John',
    lastName: 'Doe',
    birthDate: '1990-01-01',
    birthPlace: 'New York',
    isLiving: true,
    createdBy: userId,
  },
  [
    {
      toMemberId: 'parent-id',
      relationshipType: 'parent',
      parentRole: 'father',
    },
  ]
);
```

## TanStack Query Hooks

### User Hooks
```typescript
import { useUser, useCurrentUser, useUpdateProfile } from '@/hooks/useUsers';

// Get current user with stats
const { data: user, isLoading } = useCurrentUser();

// Update profile
const updateProfile = useUpdateProfile();
await updateProfile.mutateAsync({
  data: { displayName: 'New Name' }
});
```

### Tree Hooks
```typescript
import { useTree, useAccessibleTrees, useCreateTree } from '@/hooks/useTrees';

// Get tree with stats
const { data: tree, isLoading } = useTree(treeId);

// Get all accessible trees
const { data: trees } = useAccessibleTrees(userId);

// Create new tree
const createTree = useCreateTree();
await createTree.mutateAsync({
  name: 'New Tree',
  ownerId: userId,
});
```

### Member Hooks
```typescript
import { useMember, useTreeMembers, useCreateMember } from '@/hooks/useMembers';

// Get member with relations
const { data: member } = useMember(memberId);

// Get filtered tree members
const { data: members } = useTreeMembers(treeId, {
  gender: 'male',
  isLiving: true,
});

// Create new member
const createMember = useCreateMember();
await createMember.mutateAsync({
  memberData: { /* member data */ },
  relationships: [/* relationships */],
});
```

## Error Handling

### Error Types
- `DatabaseError` - General database errors
- `ValidationError` - Data validation errors
- `NotFoundError` - Resource not found
- `UnauthorizedError` - Permission denied

### Error Handling Pattern
```typescript
try {
  const result = await service.operation(data);
  return result;
} catch (error) {
  if (error instanceof NotFoundError) {
    // Handle not found
  } else if (error instanceof ValidationError) {
    // Handle validation error
  } else {
    // Handle other errors
  }
  throw error;
}
```

## Caching Strategy

### Cache Keys
All services use consistent cache key patterns:
- `['users', 'detail', userId]` - User details
- `['trees', 'accessible', userId]` - Accessible trees
- `['members', 'tree', treeId, 'members', filters]` - Tree members

### Cache Invalidation
- **Automatic**: Mutations automatically invalidate related queries
- **Manual**: Use `queryClient.invalidateQueries()` for manual invalidation
- **Optimistic**: Updates are applied optimistically and rolled back on error

### Stale Time
- User data: 5 minutes
- Tree data: 3 minutes
- Member data: 3 minutes
- Search results: 5 minutes

## Transaction Support

### Atomic Operations
Critical operations use database transactions:

```typescript
const result = await db.transaction(async (tx) => {
  const member = await tx.insert(members).values(memberData).returning();

  if (relationships) {
    await tx.insert(relationships).values(relationshipData);
  }

  return member;
});
```

### Rollback Handling
Transactions automatically rollback on errors:
```typescript
try {
  const result = await memberService.createMemberWithRelationships(data, relationships);
} catch (error) {
  // Transaction automatically rolled back
  console.error('Failed to create member:', error);
}
```

## Optimistic Updates

### Pattern
```typescript
const updateMember = useMutation({
  mutationFn: updateMemberFn,
  onMutate: async (newData) => {
    // Cancel outgoing queries
    await queryClient.cancelQueries({ queryKey: ['members', newData.id] });

    // Snapshot previous value
    const previousMember = queryClient.getQueryData(['members', newData.id]);

    // Optimistically update
    queryClient.setQueryData(['members', newData.id], newData);

    return { previousMember };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(['members', newData.id], context.previousMember);
  },
  onSettled: (newData) => {
    // Refetch on success/failure
    queryClient.invalidateQueries({ queryKey: ['members', newData.id] });
  },
});
```

## Testing

### Service Testing
Services are tested with mocked database calls:

```typescript
describe('UserService', () => {
  it('should create user successfully', async () => {
    const mockUser = { id: '1', email: 'test@example.com' };
    mockDb.insert.mockReturnValue([mockUser]);

    const result = await userService.create({ email: 'test@example.com' });

    expect(result).toEqual(mockUser);
  });
});
```

### Hook Testing
React Query hooks are tested with `@testing-library/react`:

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUser } from '@/hooks/useUsers';

test('should fetch user data', async () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const { result } = renderHook(() => useUser('1'), { wrapper });

  await waitFor(() => {
    expect(result.current.data).toEqual(mockUser);
  });
});
```

## Performance Considerations

### Database Optimization
- Use proper indexes on frequently queried columns
- Implement pagination for large datasets
- Use transactions for atomic operations
- Optimize complex queries with proper joins

### Cache Optimization
- Set appropriate stale times for different data types
- Use query invalidation strategically
- Implement background refetching for stale data
- Use optimistic updates for better UX

### Memory Management
- Limit query results with pagination
- Use query client cleanup on unmount
- Implement proper error boundaries
- Monitor query cache size

## Best Practices

### Service Layer
1. **Single Responsibility**: Each service handles one entity type
2. **Error Handling**: Consistent error types and handling
3. **Validation**: Validate data before database operations
4. **Transactions**: Use transactions for multi-step operations
5. **Type Safety**: Leverage TypeScript for compile-time safety

### React Query
1. **Query Keys**: Use consistent, descriptive query keys
2. **Cache Management**: Set appropriate stale times and invalidation strategies
3. **Error Handling**: Handle errors gracefully with proper UI feedback
4. **Loading States**: Provide loading indicators for better UX
5. **Optimistic Updates**: Use for instant feedback where appropriate

### Data Flow
1. **Unidirectional**: Data flows from services → hooks → components
2. **Immutable**: Never mutate data directly, always create new copies
3. **Consistent**: Use consistent patterns across all entities
4. **Typed**: Leverage TypeScript for type safety throughout

## Monitoring and Debugging

### Query DevTools
Use React Query DevTools for debugging:
```bash
npm install @tanstack/react-query-devtools
```

### Error Tracking
Implement error tracking for production:
```typescript
// In service error handler
if (process.env.NODE_ENV === 'production') {
  Sentry.captureException(error);
}
```

### Performance Monitoring
Monitor query performance:
```typescript
// Add performance logging
const startTime = performance.now();
const result = await operation();
const endTime = performance.now();
console.log(`Operation took ${endTime - startTime} milliseconds`);
```

## Migration Guide

### From Direct Database Calls
1. Replace direct `db.select()` calls with service methods
2. Add React Query hooks for data fetching
3. Implement proper error handling
4. Add optimistic updates where appropriate
5. Update cache invalidation strategies

### From REST APIs
1. Replace API calls with service methods
2. Implement React Query for caching
3. Add proper loading and error states
4. Update data transformation logic
5. Implement optimistic updates