import { BaseService, DatabaseError, NotFoundError, UnauthorizedError } from './base';
import { trees } from '../db/schema';
import { eq, and, or, desc, asc, ilike } from 'drizzle-orm';
import { db } from '../db';
import type { Tree, CreateTreeInput, UpdateTreeInput, TreeWithRelations } from '../types/database';

export class TreeService extends BaseService<Tree, CreateTreeInput, UpdateTreeInput> {
  protected table = trees;

  /**
   * Create a new tree
   */
  async create(treeData: CreateTreeInput): Promise<Tree | null> {
    try {
      return await super.create(treeData);
    } catch (error) {
      this.handleError('create', error);
      throw error;
    }
  }

  /**
   * Get trees owned by a user
   */
  async getUserTrees(userId: string): Promise<Tree[]> {
    try {
      return await this.findMany({
        where: eq(this.table.ownerId, userId),
        orderBy: [{ column: this.table.updatedAt, direction: 'desc' }],
      });
    } catch (error) {
      this.handleError('getUserTrees', error);
      return [];
    }
  }

  /**
   * Get trees accessible to a user (owned + collaborated)
   */
  async getAccessibleTrees(userId: string): Promise<Tree[]> {
    try {
      // Import here to avoid circular dependencies
      const { collaborations } = await import('../db/schema');

      // Get owned trees
      const ownedTrees = await this.getUserTrees(userId);

      // Get collaborated trees
      const collaboratedTrees = await db
        .select({
          id: trees.id,
          name: trees.name,
          description: trees.description,
          ownerId: trees.ownerId,
          isPublic: trees.isPublic,
          createdAt: trees.createdAt,
          updatedAt: trees.updatedAt,
        })
        .from(trees)
        .innerJoin(collaborations, eq(trees.id, collaborations.treeId))
        .where(
          and(
            eq(collaborations.userId, userId),
            eq(collaborations.status, 'accepted')
          )
        );

      // Combine and remove duplicates
      const allTrees = [...ownedTrees, ...collaboratedTrees];
      const uniqueTrees = allTrees.filter((tree, index, self) =>
        index === self.findIndex(t => t.id === tree.id)
      );

      // Sort by updated date
      return uniqueTrees.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    } catch (error) {
      this.handleError('getAccessibleTrees', error);
      return [];
    }
  }

  /**
   * Get tree with statistics
   */
  async getTreeWithStats(treeId: string): Promise<Tree & {
    memberCount: number;
    relationshipCount: number;
    collaboratorCount: number;
  } | null> {
    try {
      const tree = await this.findById(treeId);
      if (!tree) {
        return null;
      }

      // Import here to avoid circular dependencies
      const { members } = await import('../db/schema');
      const { relationships } = await import('../db/schema');
      const { collaborations } = await import('../db/schema');

      const [memberCount, relationshipCount, collaboratorCount] = await Promise.all([
        db.select({ count: members.id }).from(members).where(eq(members.treeId, treeId)),
        db.select({ count: relationships.id }).from(relationships).where(eq(relationships.treeId, treeId)),
        db.select({ count: collaborations.id }).from(collaborations)
          .where(and(eq(collaborations.treeId, treeId), eq(collaborations.status, 'accepted'))),
      ]);

      return {
        ...tree,
        memberCount: memberCount.length,
        relationshipCount: relationshipCount.length,
        collaboratorCount: collaboratorCount.length,
      };
    } catch (error) {
      this.handleError('getTreeWithStats', error);
      return null;
    }
  }

  /**
   * Check if user has access to a tree with specific role
   */
  async checkTreeAccess(
    treeId: string,
    userId: string,
    requiredRole: 'owner' | 'editor' | 'viewer' = 'viewer'
  ): Promise<boolean> {
    try {
      const tree = await this.findById(treeId);
      if (!tree) {
        return false;
      }

      // Owner has all permissions
      if (tree.ownerId === userId) {
        return true;
      }

      // Check collaboration
      const { collaborations } = await import('../db/schema');
      const [collaboration] = await db
        .select()
        .from(collaborations)
        .where(
          and(
            eq(collaborations.treeId, treeId),
            eq(collaborations.userId, userId),
            eq(collaborations.status, 'accepted')
          )
        )
        .limit(1);

      if (!collaboration) {
        return false;
      }

      // Check role-based permissions
      if (requiredRole === 'owner') {
        return collaboration.role === 'owner';
      } else if (requiredRole === 'editor') {
        return ['owner', 'editor'].includes(collaboration.role);
      } else {
        return true; // viewer
      }
    } catch (error) {
      this.handleError('checkTreeAccess', error);
      return false;
    }
  }

  /**
   * Update tree with authorization check
   */
  async updateTree(
    treeId: string,
    userId: string,
    data: UpdateTreeInput
  ): Promise<Tree | null> {
    try {
      // Check if user has edit access
      const hasAccess = await this.checkTreeAccess(treeId, userId, 'editor');
      if (!hasAccess) {
        throw new UnauthorizedError('update', 'tree');
      }

      return await this.update(treeId, data);
    } catch (error) {
      this.handleError('updateTree', error);
      throw error;
    }
  }

  /**
   * Delete tree with authorization check
   */
  async deleteTree(treeId: string, userId: string): Promise<boolean> {
    try {
      // Only owners can delete trees
      const tree = await this.findById(treeId);
      if (!tree) {
        throw new NotFoundError('Tree', treeId);
      }

      if (tree.ownerId !== userId) {
        throw new UnauthorizedError('delete', 'tree');
      }

      return await this.delete(treeId);
    } catch (error) {
      this.handleError('deleteTree', error);
      throw error;
    }
  }

  /**
   * Search trees
   */
  async searchTrees(query: string, userId?: string): Promise<Tree[]> {
    try {
      if (!query || query.length < 2) {
        return [];
      }

      let baseQuery = this.search(query, ['name', 'description']);

      // If userId is provided, filter to trees accessible to that user
      if (userId) {
        const accessibleTreeIds = await this.getAccessibleTrees(userId)
          .then(trees => trees.map(t => t.id));

        baseQuery = baseQuery.filter(tree => accessibleTreeIds.includes(tree.id));
      }

      return baseQuery;
    } catch (error) {
      this.handleError('searchTrees', error);
      return [];
    }
  }

  /**
   * Get public trees
   */
  async getPublicTrees(limit: number = 20): Promise<Tree[]> {
    try {
      return await this.findMany({
        where: eq(this.table.isPublic, true),
        orderBy: [{ column: this.table.updatedAt, direction: 'desc' }],
        limit,
      });
    } catch (error) {
      this.handleError('getPublicTrees', error);
      return [];
    }
  }

  /**
   * Duplicate a tree (creates a new tree with same structure but no members)
   */
  async duplicateTree(treeId: string, userId: string, newName?: string): Promise<Tree | null> {
    try {
      const originalTree = await this.findById(treeId);
      if (!originalTree) {
        throw new NotFoundError('Tree', treeId);
      }

      const hasAccess = await this.checkTreeAccess(treeId, userId, 'viewer');
      if (!hasAccess) {
        throw new UnauthorizedError('duplicate', 'tree');
      }

      const newTree = await this.create({
        name: newName || `${originalTree.name} (Copy)`,
        description: originalTree.description,
        ownerId: userId,
        isPublic: false,
      });

      // TODO: You could also copy tree structure, templates, etc. here
      // This would be implemented in a more complex version

      return newTree;
    } catch (error) {
      this.handleError('duplicateTree', error);
      throw error;
    }
  }

  /**
   * Get tree activity summary
   */
  async getTreeActivitySummary(treeId: string, days: number = 30): Promise<{
    totalActivity: number;
    recentActivity: Array<{
      date: string;
      count: number;
    }>;
  }> {
    try {
      // Import here to avoid circular dependencies
      const { activityLogs } = await import('../db/schema');
      const { gte, lte } = await import('drizzle-orm');

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const activities = await db
        .select()
        .from(activityLogs)
        .where(
          and(
            eq(activityLogs.treeId, treeId),
            gte(activityLogs.createdAt, startDate)
          )
        )
        .orderBy(desc(activityLogs.createdAt));

      // Group by date
      const activityByDate = activities.reduce((acc, activity) => {
        const date = activity.createdAt.toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalActivity: activities.length,
        recentActivity: Object.entries(activityByDate)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => b.date.localeCompare(a.date)),
      };
    } catch (error) {
      this.handleError('getTreeActivitySummary', error);
      return {
        totalActivity: 0,
        recentActivity: [],
      };
    }
  }

  /**
   * Validate tree data
   */
  private validateTreeData(treeData: Partial<CreateTreeInput | UpdateTreeInput>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (treeData.name) {
      if (treeData.name.length < 1) {
        errors.push('Tree name is required');
      }
      if (treeData.name.length > 100) {
        errors.push('Tree name cannot be more than 100 characters');
      }
    }

    if (treeData.description && treeData.description.length > 500) {
      errors.push('Description cannot be more than 500 characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
export const treeService = new TreeService();