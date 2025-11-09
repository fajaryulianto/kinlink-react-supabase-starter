import { BaseService, DatabaseError, NotFoundError, UnauthorizedError } from './base';
import { members } from '../db/schema';
import { eq, and, or, desc, asc, ilike } from 'drizzle-orm';
import { db } from '../db';
import type {
  Member,
  CreateMemberInput,
  UpdateMemberInput,
  MemberWithRelations,
  FamilyTreeNode
} from '../types/database';

export class MemberService extends BaseService<Member, CreateMemberInput, UpdateMemberInput> {
  protected table = members;

  /**
   * Create a new member with relationship handling (atomic transaction)
   */
  async createMemberWithRelationships(
    memberData: CreateMemberInput,
    relationships?: Array<{
      toMemberId: string;
      relationshipType: 'parent' | 'child' | 'spouse' | 'sibling';
      parentRole?: 'father' | 'mother' | 'neutral';
      metadata?: Record<string, any>;
    }>
  ): Promise<{ member: Member; relationships: any[] } | null> {
    const transaction = await db.transaction(async (tx) => {
      try {
        // Create the member first
        const [newMember] = await tx
          .insert(members)
          .values(memberData)
          .returning();

        if (!newMember) {
          throw new DatabaseError('Failed to create member');
        }

        const createdRelationships = [];

        // Create relationships if provided
        if (relationships && relationships.length > 0) {
          const { relationships: relTable } = await import('../db/schema');

          for (const relData of relationships) {
            const [newRelationship] = await tx
              .insert(relTable)
              .values({
                treeId: memberData.treeId,
                fromMemberId: newMember.id,
                toMemberId: relData.toMemberId,
                relationshipType: relData.relationshipType,
                parentRole: relData.parentRole,
                metadata: relData.metadata,
              })
              .returning();

            createdRelationships.push(newRelationship);

            // Create reverse relationships for bidirectional consistency
            const reverseType = this.getReverseRelationshipType(relData.relationshipType);
            if (reverseType) {
              await tx
                .insert(relTable)
                .values({
                  treeId: memberData.treeId,
                  fromMemberId: relData.toMemberId,
                  toMemberId: newMember.id,
                  relationshipType: reverseType,
                  parentRole: relData.parentRole,
                  metadata: relData.metadata,
                });
            }
          }
        }

        return {
          member: newMember,
          relationships: createdRelationships,
        };
      } catch (error) {
        tx.rollback();
        throw error;
      }
    });

    return transaction;
  }

  /**
   * Get members by tree with optional filters
   */
  async getTreeMembers(
    treeId: string,
    filters: {
      search?: string;
      gender?: 'male' | 'female' | 'other';
      isLiving?: boolean;
      birthYearRange?: { start?: number; end?: number };
    } = {}
  ): Promise<Member[]> {
    try {
      let whereConditions = [eq(this.table.treeId, treeId)];

      // Add filter conditions
      if (filters.gender) {
        whereConditions.push(eq(this.table.gender, filters.gender));
      }

      if (filters.isLiving !== undefined) {
        whereConditions.push(eq(this.table.isLiving, filters.isLiving));
      }

      if (filters.birthYearRange) {
        const { gte, lte } = await import('drizzle-orm');
        if (filters.birthYearRange.start) {
          whereConditions.push(
            gte(this.table.birthDate, `${filters.birthYearRange.start}-01-01`)
          );
        }
        if (filters.birthYearRange.end) {
          whereConditions.push(
            lte(this.table.birthDate, `${filters.birthYearRange.end}-12-31`)
          );
        }
      }

      const baseQuery = this.findMany({
        where: and(...whereConditions),
        orderBy: [{ column: this.table.birthDate, direction: 'asc' }],
      });

      // Apply search filter if provided
      if (filters.search) {
        const searchResults = await this.search(filters.search, [
          'firstName', 'lastName', 'nickname', 'maidenName', 'occupation'
        ]);
        const searchIds = searchResults.map(m => m.id);
        return baseQuery.then(members =>
          members.filter(member => searchIds.includes(member.id))
        );
      }

      return baseQuery;
    } catch (error) {
      this.handleError('getTreeMembers', error);
      return [];
    }
  }

  /**
   * Get member with full relations
   */
  async getMemberWithRelations(memberId: string): Promise<MemberWithRelations | null> {
    try {
      const member = await this.findById(memberId);
      if (!member) {
        return null;
      }

      // Import related tables
      const { relationships } = await import('../db/schema');
      const { lifeEvents } = await import('../db/schema');
      const { users } = await import('../db/schema');

      // Get relationships
      const [fromRelationships, toRelationships] = await Promise.all([
        db
          .select()
          .from(relationships)
          .where(eq(relationships.fromMemberId, memberId)),
        db
          .select()
          .from(relationships)
          .where(eq(relationships.toMemberId, memberId)),
      ]);

      // Get life events
      const events = await db
        .select()
        .from(lifeEvents)
        .where(eq(lifeEvents.memberId, memberId))
        .orderBy(desc(lifeEvents.eventDate));

      // Get creator and updater info
      const [creator, updater] = await Promise.all([
        member.createdBy
          ? db.select().from(users).where(eq(users.id, member.createdBy)).limit(1)
          : Promise.resolve([null]),
        member.updatedBy
          ? db.select().from(users).where(eq(users.id, member.updatedBy)).limit(1)
          : Promise.resolve([null]),
      ]);

      // Resolve related members
      const relatedMemberIds = [
        ...fromRelationships.map(r => r.toMemberId),
        ...toRelationships.map(r => r.fromMemberId),
      ];

      const relatedMembers = relatedMemberIds.length > 0
        ? await db
            .select()
            .from(this.table)
            .where(eq(this.table.id, relatedMemberIds[0])) // Simplified for now
        : [];

      return {
        ...member,
        creator: creator[0],
        updater: updater[0],
        lifeEvents: events,
        relationships: [...fromRelationships, ...toRelationships],
        relatedMembers,
      };
    } catch (error) {
      this.handleError('getMemberWithRelations', error);
      return null;
    }
  }

  /**
   * Update member with authorization check
   */
  async updateMember(
    memberId: string,
    userId: string,
    data: UpdateMemberInput
  ): Promise<Member | null> {
    try {
      // Check if user has edit access to the tree
      const { treeService } = await import('./tree.service');
      const member = await this.findById(memberId);

      if (!member) {
        throw new NotFoundError('Member', memberId);
      }

      const hasAccess = await treeService.checkTreeAccess(
        member.treeId,
        userId,
        'editor'
      );

      if (!hasAccess) {
        throw new UnauthorizedError('update', 'member');
      }

      return await this.update(memberId, data);
    } catch (error) {
      this.handleError('updateMember', error);
      throw error;
    }
  }

  /**
   * Delete member with relationship cleanup
   */
  async deleteMember(memberId: string, userId: string): Promise<boolean> {
    try {
      const member = await this.findById(memberId);
      if (!member) {
        throw new NotFoundError('Member', memberId);
      }

      // Check if user has edit access
      const { treeService } = await import('./tree.service');
      const hasAccess = await treeService.checkTreeAccess(
        member.treeId,
        userId,
        'editor'
      );

      if (!hasAccess) {
        throw new UnauthorizedError('delete', 'member');
      }

      // Use transaction to delete member and related data
      const result = await db.transaction(async (tx) => {
        // Delete relationships
        const { relationships } = await import('../db/schema');
        await tx
          .delete(relationships)
          .where(
            or(
              eq(relationships.fromMemberId, memberId),
              eq(relationships.toMemberId, memberId)
            )
          );

        // Delete life events
        const { lifeEvents } = await import('../db/schema');
        await tx.delete(lifeEvents).where(eq(lifeEvents.memberId, memberId));

        // Delete member
        return await tx.delete(this.table).where(eq(this.table.id, memberId));
      });

      return result.rowCount > 0;
    } catch (error) {
      this.handleError('deleteMember', error);
      throw error;
    }
  }

  /**
   * Get family tree structure
   */
  async getFamilyTree(
    treeId: string,
    rootMemberId?: string,
    maxDepth: number = 5
  ): Promise<FamilyTreeNode[]> {
    try {
      // This would use a recursive CTE or application-side logic
      // For now, return a simplified version
      const members = await this.getTreeMembers(treeId);

      return members.map(member => ({
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        birthDate: member.birthDate,
        deathDate: member.deathDate,
        isLiving: member.isLiving,
        photoUrl: member.photoUrl,
        gender: member.gender,
        relationships: [], // Would be populated with actual relationships
        children: [],
        spouses: [],
        parents: [],
      }));
    } catch (error) {
      this.handleError('getFamilyTree', error);
      return [];
    }
  }

  /**
   * Find siblings of a member
   */
  async getSiblings(memberId: string): Promise<Member[]> {
    try {
      const member = await this.findById(memberId);
      if (!member) {
        return [];
      }

      const { relationships } = await import('../db/schema');

      // Get parent relationships
      const parentRelationships = await db
        .select()
        .from(relationships)
        .where(
          and(
            eq(relationships.toMemberId, memberId),
            eq(relationships.relationshipType, 'parent')
          )
        );

      // Find other children of the same parents
      const parentIds = parentRelationships.map(r => r.fromMemberId);
      if (parentIds.length === 0) {
        return [];
      }

      const siblingRelationships = await db
        .select({
          memberId: relationships.toMemberId,
        })
        .from(relationships)
        .where(
          and(
            eq(relationships.fromMemberId, parentIds[0]), // Simplified
            eq(relationships.relationshipType, 'parent'),
            // Exclude the original member
            // neq(relationships.toMemberId, memberId)
          )
        );

      const siblingIds = siblingRelationships
        .map(r => r.memberId)
        .filter(id => id !== memberId);

      if (siblingIds.length === 0) {
        return [];
      }

      return await this.findMany({
        where: eq(this.table.id, siblingIds[0]) // Simplified
      });
    } catch (error) {
      this.handleError('getSiblings', error);
      return [];
    }
  }

  /**
   * Search members across all accessible trees
   */
  async searchMembers(
    query: string,
    userId: string,
    options: {
      treeId?: string;
      limit?: number;
    } = {}
  ): Promise<Member[]> {
    try {
      if (!query || query.length < 2) {
        return [];
      }

      let treeIds: string[] = [];

      if (options.treeId) {
        // Search in specific tree
        const { treeService } = await import('./tree.service');
        const hasAccess = await treeService.checkTreeAccess(
          options.treeId,
          userId,
          'viewer'
        );

        if (hasAccess) {
          treeIds = [options.treeId];
        }
      } else {
        // Search in all accessible trees
        const { treeService } = await import('./tree.service');
        const accessibleTrees = await treeService.getAccessibleTrees(userId);
        treeIds = accessibleTrees.map(t => t.id);
      }

      if (treeIds.length === 0) {
        return [];
      }

      // Search members in these trees
      const searchResults = await this.search(query, [
        'firstName', 'lastName', 'nickname', 'maidenName', 'occupation'
      ]);

      const filteredResults = searchResults.filter(member =>
        treeIds.includes(member.treeId)
      );

      return options.limit
        ? filteredResults.slice(0, options.limit)
        : filteredResults;
    } catch (error) {
      this.handleError('searchMembers', error);
      return [];
    }
  }

  /**
   * Get member statistics
   */
  async getMemberStats(memberId: string): Promise<{
    totalRelationships: number;
    totalLifeEvents: number;
    totalChildren: number;
    totalParents: number;
    totalSpouses: number;
    totalSiblings: number;
  }> {
    try {
      const { relationships } = await import('../db/schema');
      const { lifeEvents } = await import('../db/schema');

      const [relationshipsCount, eventsCount, childrenCount, parentsCount, spousesCount, siblingsCount] = await Promise.all([
        db.select({ count: relationships.id }).from(relationships)
          .where(or(eq(relationships.fromMemberId, memberId), eq(relationships.toMemberId, memberId))),

        db.select({ count: lifeEvents.id }).from(lifeEvents)
          .where(eq(lifeEvents.memberId, memberId)),

        db.select({ count: relationships.id }).from(relationships)
          .where(and(eq(relationships.fromMemberId, memberId), eq(relationships.relationshipType, 'parent'))),

        db.select({ count: relationships.id }).from(relationships)
          .where(and(eq(relationships.toMemberId, memberId), eq(relationships.relationshipType, 'parent'))),

        db.select({ count: relationships.id }).from(relationships)
          .where(and(eq(relationships.fromMemberId, memberId), eq(relationships.relationshipType, 'spouse'))),

        this.getSiblings(memberId).then(siblings => ({ count: siblings.length })),
      ]);

      return {
        totalRelationships: relationshipsCount.length,
        totalLifeEvents: eventsCount.length,
        totalChildren: childrenCount.length,
        totalParents: parentsCount.length,
        totalSpouses: spousesCount.length,
        totalSiblings: siblingsCount.count,
      };
    } catch (error) {
      this.handleError('getMemberStats', error);
      return {
        totalRelationships: 0,
        totalLifeEvents: 0,
        totalChildren: 0,
        totalParents: 0,
        totalSpouses: 0,
        totalSiblings: 0,
      };
    }
  }

  /**
   * Helper method to get reverse relationship type
   */
  private getReverseRelationshipType(type: string): string | null {
    const reverses: Record<string, string> = {
      'parent': 'child',
      'child': 'parent',
      'spouse': 'spouse',
      'sibling': 'sibling',
    };

    return reverses[type] || null;
  }

  /**
   * Validate member data
   */
  private validateMemberData(memberData: Partial<CreateMemberInput | UpdateMemberInput>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (memberData.firstName) {
      if (memberData.firstName.length < 1) {
        errors.push('First name is required');
      }
      if (memberData.firstName.length > 50) {
        errors.push('First name cannot be more than 50 characters');
      }
    }

    if (memberData.lastName) {
      if (memberData.lastName.length < 1) {
        errors.push('Last name is required');
      }
      if (memberData.lastName.length > 50) {
        errors.push('Last name cannot be more than 50 characters');
      }
    }

    if (memberData.birthDate) {
      const birthDate = new Date(memberData.birthDate);
      const now = new Date();

      if (birthDate > now) {
        errors.push('Birth date cannot be in the future');
      }

      // Check for reasonable birth dates
      const minDate = new Date('1900-01-01');
      if (birthDate < minDate) {
        errors.push('Birth date seems too far in the past');
      }
    }

    if (memberData.deathDate && memberData.birthDate) {
      const birthDate = new Date(memberData.birthDate);
      const deathDate = new Date(memberData.deathDate);

      if (deathDate < birthDate) {
        errors.push('Death date cannot be before birth date');
      }
    }

    if (memberData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(memberData.email)) {
        errors.push('Invalid email format');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
export const memberService = new MemberService();