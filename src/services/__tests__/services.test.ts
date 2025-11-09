/**
 * Test Suite for Service Layer
 * This file contains comprehensive tests for all services
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { userService } from '../user.service';
import { treeService } from '../tree.service';
import { memberService } from '../member.service';
import { DatabaseError, ValidationError } from '../base';
import { db } from '../../db';

// Mock database for testing
const mockDb = {
  select: vi.fn(() => mockDb),
  from: vi.fn(() => mockDb),
  where: vi.fn(() => mockDb),
  limit: vi.fn(() => mockDb),
  offset: vi.fn(() => mockDb),
  orderBy: vi.fn(() => mockDb),
  insert: vi.fn(() => mockDb),
  values: vi.fn(() => mockDb),
  returning: vi.fn(() => mockDb),
  update: vi.fn(() => mockDb),
  set: vi.fn(() => mockDb),
  delete: vi.fn(() => mockDb),
  transaction: vi.fn((callback) => callback(mockDb)),
  rollback: vi.fn(),
  rowCount: 1,
};

// Mock the db module
vi.mock('../../db', () => ({
  db: mockDb,
}));

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findById', () => {
    it('should return a user when found', async () => {
      const mockUser = { id: '1', email: 'test@example.com', displayName: 'Test User' };
      mockDb.select.mockReturnValueOnce(mockDb).mockReturnValueOnce([mockUser]);

      const result = await userService.findById('1');

      expect(result).toEqual(mockUser);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should return null when user not found', async () => {
      mockDb.select.mockReturnValueOnce(mockDb).mockReturnValueOnce([]);

      const result = await userService.findById('999');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      mockDb.select.mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const result = await userService.findById('1');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return a user when found by email', async () => {
      const mockUser = { id: '1', email: 'test@example.com', displayName: 'Test User' };
      mockDb.select.mockReturnValueOnce(mockDb).mockReturnValueOnce([mockUser]);

      const result = await userService.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found by email', async () => {
      mockDb.select.mockReturnValueOnce(mockDb).mockReturnValueOnce([]);

      const result = await userService.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new user successfully', async () => {
      const newUser = { email: 'new@example.com', displayName: 'New User' };
      const createdUser = { id: '2', ...newUser, createdAt: new Date(), updatedAt: new Date() };

      mockDb.select.mockReturnValueOnce(mockDb).mockReturnValueOnce([]); // Email check
      mockDb.insert.mockReturnValueOnce(mockDb);
      mockDb.values.mockReturnValueOnce(mockDb);
      mockDb.returning.mockReturnValueOnce([createdUser]);

      const result = await userService.create(newUser);

      expect(result).toEqual(createdUser);
    });

    it('should throw error when email already exists', async () => {
      const existingUser = { id: '1', email: 'existing@example.com' };
      const newUser = { email: 'existing@example.com', displayName: 'New User' };

      mockDb.select.mockReturnValueOnce(mockDb).mockReturnValueOnce([existingUser]);

      await expect(userService.create(newUser)).rejects.toThrow(DatabaseError);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const existingUser = { id: '1', email: 'test@example.com', displayName: 'Test User' };
      const updateData = { displayName: 'Updated User' };
      const updatedUser = { ...existingUser, ...updateData };

      mockDb.select.mockReturnValueOnce(mockDb).mockReturnValueOnce([existingUser]); // User exists
      mockDb.select.mockReturnValueOnce(mockDb).mockReturnValueOnce([]); // Email check
      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.returning.mockReturnValueOnce([updatedUser]);

      const result = await userService.updateProfile('1', updateData);

      expect(result).toEqual(updatedUser);
    });

    it('should throw NotFoundError when user does not exist', async () => {
      mockDb.select.mockReturnValueOnce(mockDb).mockReturnValueOnce([]);

      await expect(userService.updateProfile('999', { displayName: 'Test' })).rejects.toThrow();
    });
  });
});

describe('TreeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new tree successfully', async () => {
      const treeData = { name: 'Test Tree', description: 'Test Description', ownerId: '1', isPublic: false };
      const createdTree = { id: 'tree-1', ...treeData, createdAt: new Date(), updatedAt: new Date() };

      mockDb.insert.mockReturnValueOnce(mockDb);
      mockDb.values.mockReturnValueOnce(mockDb);
      mockDb.returning.mockReturnValueOnce([createdTree]);

      const result = await treeService.create(treeData);

      expect(result).toEqual(createdTree);
    });
  });

  describe('getUserTrees', () => {
    it('should return trees owned by user', async () => {
      const mockTrees = [
        { id: 'tree-1', name: 'Tree 1', ownerId: '1' },
        { id: 'tree-2', name: 'Tree 2', ownerId: '1' },
      ];

      mockDb.select.mockReturnValueOnce(mockDb).mockReturnValueOnce(mockTrees);

      const result = await treeService.getUserTrees('1');

      expect(result).toEqual(mockTrees);
    });
  });

  describe('checkTreeAccess', () => {
    it('should return true for tree owner', async () => {
      const mockTree = { id: 'tree-1', name: 'Tree 1', ownerId: '1' };

      mockDb.select.mockReturnValueOnce(mockDb).mockReturnValueOnce([mockTree]);

      const result = await treeService.checkTreeAccess('tree-1', '1', 'owner');

      expect(result).toBe(true);
    });

    it('should return false when tree does not exist', async () => {
      mockDb.select.mockReturnValueOnce(mockDb).mockReturnValueOnce([]);

      const result = await treeService.checkTreeAccess('tree-999', '1', 'owner');

      expect(result).toBe(false);
    });
  });

  describe('getTreeWithStats', () => {
    it('should return tree with statistics', async () => {
      const mockTree = { id: 'tree-1', name: 'Tree 1', ownerId: '1' };
      const mockStats = [
        [{ count: 'member-1' }, { count: 'member-2' }], // members
        [{ count: 'rel-1' }], // relationships
        [{ count: 'collab-1' }], // collaborators
      ];

      mockDb.select.mockReturnValueOnce(mockDb).mockReturnValueOnce([mockTree]); // Tree
      mockDb.select.mockReturnValueOnce(mockDb).mockReturnValueOnce(mockStats[0]); // Members
      mockDb.select.mockReturnValueOnce(mockDb).mockReturnValueOnce(mockStats[1]); // Relationships
      mockDb.select.mockReturnValueOnce(mockDb).mockReturnValueOnce(mockStats[2]); // Collaborations

      const result = await treeService.getTreeWithStats('tree-1');

      expect(result).toEqual({
        ...mockTree,
        memberCount: 2,
        relationshipCount: 1,
        collaboratorCount: 1,
      });
    });

    it('should return null when tree does not exist', async () => {
      mockDb.select.mockReturnValueOnce(mockDb).mockReturnValueOnce([]);

      const result = await treeService.getTreeWithStats('tree-999');

      expect(result).toBeNull();
    });
  });
});

describe('MemberService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createMemberWithRelationships', () => {
    it('should create member with relationships in transaction', async () => {
      const memberData = {
        treeId: 'tree-1',
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1990-01-01',
        birthPlace: 'Test City',
        isLiving: true,
        createdBy: '1',
      };

      const relationships = [
        {
          toMemberId: 'parent-1',
          relationshipType: 'parent' as const,
          parentRole: 'father' as const,
        },
      ];

      const mockMember = { id: 'member-1', ...memberData };
      const mockRelationship = { id: 'rel-1', treeId: 'tree-1', fromMemberId: 'member-1', toMemberId: 'parent-1' };

      mockDb.insert.mockReturnValueOnce(mockDb);
      mockDb.values.mockReturnValueOnce(mockDb);
      mockDb.returning.mockReturnValueOnce([mockMember]);
      mockDb.insert.mockReturnValueOnce(mockDb);
      mockDb.values.mockReturnValueOnce(mockDb);
      mockDb.returning.mockReturnValueOnce([mockRelationship]);

      mockDb.transaction.mockImplementationOnce(async (callback) => {
        return await callback(mockDb);
      });

      const result = await memberService.createMemberWithRelationships(memberData, relationships);

      expect(result).toEqual({
        member: mockMember,
        relationships: [mockRelationship],
      });
    });

    it('should handle transaction rollback on error', async () => {
      const memberData = {
        treeId: 'tree-1',
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1990-01-01',
        birthPlace: 'Test City',
        isLiving: true,
        createdBy: '1',
      };

      mockDb.transaction.mockImplementationOnce(async (callback) => {
        mockDb.insert.mockImplementationOnce(() => {
          throw new Error('Database error');
        });
        await expect(callback(mockDb)).rejects.toThrow('Database error');
      });

      await expect(
        memberService.createMemberWithRelationships(memberData)
      ).rejects.toThrow('Database error');
    });
  });

  describe('getTreeMembers', () => {
    it('should return members with filters applied', async () => {
      const mockMembers = [
        { id: 'member-1', firstName: 'John', lastName: 'Doe', treeId: 'tree-1', gender: 'male', isLiving: true },
        { id: 'member-2', firstName: 'Jane', lastName: 'Doe', treeId: 'tree-1', gender: 'female', isLiving: true },
      ];

      mockDb.select.mockReturnValueOnce(mockDb).mockReturnValueOnce(mockMembers);

      const result = await memberService.getTreeMembers('tree-1', {
        gender: 'male',
        isLiving: true,
      });

      expect(result).toEqual(mockMembers);
    });

    it('should handle search filter', async () => {
      const searchResults = [
        { id: 'member-1', firstName: 'John', lastName: 'Doe', treeId: 'tree-1' },
      ];

      mockDb.select.mockReturnValueOnce(mockDb).mockReturnValueOnce([]);
      mockDb.select.mockReturnValueOnce(mockDb).mockReturnValueOnce(searchResults);

      const result = await memberService.getTreeMembers('tree-1', {
        search: 'John',
      });

      expect(result).toEqual(searchResults);
    });
  });

  describe('getMemberWithRelations', () => {
    it('should return member with full relations', async () => {
      const mockMember = { id: 'member-1', firstName: 'John', lastName: 'Doe', treeId: 'tree-1' };
      const mockRelationships = [{ id: 'rel-1', fromMemberId: 'member-1', toMemberId: 'member-2' }];
      const mockLifeEvents = [{ id: 'event-1', memberId: 'member-1', title: 'Birth' }];

      mockDb.select.mockReturnValueOnce(mockDb).mockReturnValueOnce([mockMember]); // Member
      mockDb.select.mockReturnValueOnce(mockDb).mockReturnValueOnce(mockRelationships); // From relationships
      mockDb.select.mockReturnValueOnce(mockDb).mockReturnValueOnce([]); // To relationships
      mockDb.select.mockReturnValueOnce(mockDb).mockReturnValueOnce(mockLifeEvents); // Life events
      mockDb.select.mockReturnValueOnce(mockDb).mockReturnValueOnce([]); // Creator
      mockDb.select.mockReturnValueOnce(mockDb).mockReturnValueOnce([]); // Updater

      const result = await memberService.getMemberWithRelations('member-1');

      expect(result).toEqual({
        ...mockMember,
        creator: null,
        updater: null,
        lifeEvents: mockLifeEvents,
        relationships: mockRelationships,
        relatedMembers: [],
      });
    });

    it('should return null when member does not exist', async () => {
      mockDb.select.mockReturnValueOnce(mockDb).mockReturnValueOnce([]);

      const result = await memberService.getMemberWithRelations('member-999');

      expect(result).toBeNull();
    });
  });

  describe('deleteMember', () => {
    it('should delete member with related data', async () => {
      const mockMember = { id: 'member-1', treeId: 'tree-1' };

      mockDb.select.mockReturnValueOnce(mockDb).mockReturnValueOnce([mockMember]); // Member exists
      mockDb.select.mockReturnValueOnce(mockDb).mockReturnValueOnce([{ id: 'tree-1', ownerId: '1' }]); // Tree access check
      mockDb.transaction.mockImplementationOnce(async (callback) => {
        const tx = mockDb;
        tx.delete.mockReturnValue({ rowCount: 1 });
        await callback(tx);
        return { rowCount: 1 };
      });

      const result = await memberService.deleteMember('member-1', '1');

      expect(result).toBe(true);
    });

    it('should throw NotFoundError when member does not exist', async () => {
      mockDb.select.mockReturnValueOnce(mockDb).mockReturnValueOnce([]);

      await expect(memberService.deleteMember('member-999', '1')).rejects.toThrow();
    });
  });
});

describe('Error Handling', () => {
  it('should create proper DatabaseError instances', () => {
    const error = new DatabaseError('Test error', 'TEST_CODE', { details: 'test' }, 'testOperation');

    expect(error.name).toBe('DatabaseError');
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.operation).toBe('testOperation');
  });

  it('should create proper ValidationError instances', () => {
    const error = new ValidationError('Validation failed', 'email', 'invalid-email');

    expect(error.name).toBe('ValidationError');
    expect(error.field).toBe('email');
    expect(error.value).toBe('invalid-email');
  });
});