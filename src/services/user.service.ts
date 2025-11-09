import { BaseService, DatabaseError, NotFoundError } from './base';
import { users } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import type { User, CreateUserInput, UpdateUserInput } from '../types/database';

export class UserService extends BaseService<User, CreateUserInput, UpdateUserInput> {
  protected table = users;

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const [user] = await db
        .select()
        .from(this.table)
        .where(eq(this.table.email, email))
        .limit(1);

      return user || null;
    } catch (error) {
      this.handleError('findByEmail', error);
      return null;
    }
  }

  /**
   * Create a new user
   */
  async create(userData: CreateUserInput): Promise<User | null> {
    try {
      // Check if user with email already exists
      const existingUser = await this.findByEmail(userData.email);
      if (existingUser) {
        throw new DatabaseError('User with this email already exists', 'DUPLICATE_EMAIL');
      }

      return await super.create(userData);
    } catch (error) {
      this.handleError('create', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: UpdateUserInput): Promise<User | null> {
    try {
      // Check if user exists
      const existingUser = await this.findById(userId);
      if (!existingUser) {
        throw new NotFoundError('User', userId);
      }

      // If email is being updated, check for duplicates
      if (data.email && data.email !== existingUser.email) {
        const emailExists = await this.findByEmail(data.email);
        if (emailExists) {
          throw new DatabaseError('User with this email already exists', 'DUPLICATE_EMAIL');
        }
      }

      return await this.update(userId, data);
    } catch (error) {
      this.handleError('updateProfile', error);
      throw error;
    }
  }

  /**
   * Update user photo URL
   */
  async updatePhotoUrl(userId: string, photoUrl: string): Promise<User | null> {
    try {
      return await this.update(userId, { photoUrl });
    } catch (error) {
      this.handleError('updatePhotoUrl', error);
      return null;
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<{
    totalTrees: number;
    totalMembers: number;
    totalCollaborations: number;
  }> {
    try {
      // Import here to avoid circular dependencies
      const { trees } = await import('../db/schema');
      const { members } = await import('../db/schema');
      const { collaborations } = await import('../db/schema');

      const [treeCount, memberCount, collaborationCount] = await Promise.all([
        db.select({ count: trees.id }).from(trees).where(eq(trees.ownerId, userId)),
        db.select({ count: members.id }).from(members).where(eq(members.createdBy, userId)),
        db.select({ count: collaborations.id }).from(collaborations).where(eq(collaborations.userId, userId)),
      ]);

      return {
        totalTrees: treeCount.length,
        totalMembers: memberCount.length,
        totalCollaborations: collaborationCount.length,
      };
    } catch (error) {
      this.handleError('getUserStats', error);
      return {
        totalTrees: 0,
        totalMembers: 0,
        totalCollaborations: 0,
      };
    }
  }

  /**
   * Search users by display name or email
   */
  async searchUsers(query: string, limit: number = 10): Promise<User[]> {
    try {
      if (!query || query.length < 2) {
        return [];
      }

      return await this.search(query, ['displayName', 'email']).then(results =>
        results.slice(0, limit)
      );
    } catch (error) {
      this.handleError('searchUsers', error);
      return [];
    }
  }

  /**
   * Get users by creation date range
   */
  async getUsersByDateRange(startDate: Date, endDate: Date): Promise<User[]> {
    try {
      return await this.findMany({
        where: and(
          // Note: You'll need to adjust this based on your schema
          // this.table.createdAt >= startDate,
          // this.table.createdAt <= endDate
        ),
        orderBy: [{ column: this.table.createdAt, direction: 'desc' }],
      });
    } catch (error) {
      this.handleError('getUsersByDateRange', error);
      return [];
    }
  }

  /**
   * Soft delete user (mark as inactive instead of actual deletion)
   */
  async softDelete(userId: string): Promise<boolean> {
    try {
      // This would require adding an 'isActive' or 'deletedAt' field to the users table
      // For now, we'll just return false as this is not implemented in the schema
      console.warn('Soft delete not implemented for users');
      return false;
    } catch (error) {
      this.handleError('softDelete', error);
      return false;
    }
  }

  /**
   * Validate user data
   */
  private validateUserData(userData: Partial<CreateUserInput | UpdateUserInput>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Email validation
    if (userData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        errors.push('Invalid email format');
      }
    }

    // Display name validation
    if (userData.displayName) {
      if (userData.displayName.length < 2) {
        errors.push('Display name must be at least 2 characters long');
      }
      if (userData.displayName.length > 50) {
        errors.push('Display name cannot be more than 50 characters');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get user with related data
   */
  async getUserWithRelations(userId: string): Promise<User & {
    stats: {
      totalTrees: number;
      totalMembers: number;
      totalCollaborations: number;
    };
  } | null> {
    try {
      const user = await this.findById(userId);
      if (!user) {
        return null;
      }

      const stats = await this.getUserStats(userId);

      return {
        ...user,
        stats,
      };
    } catch (error) {
      this.handleError('getUserWithRelations', error);
      return null;
    }
  }

  /**
   * Update user last activity
   */
  async updateLastActivity(userId: string): Promise<boolean> {
    try {
      // This would require adding a 'lastActivityAt' field to the users table
      // For now, we'll just update the updatedAt field
      await this.update(userId, {});
      return true;
    } catch (error) {
      this.handleError('updateLastActivity', error);
      return false;
    }
  }
}

// Export singleton instance
export const userService = new UserService();