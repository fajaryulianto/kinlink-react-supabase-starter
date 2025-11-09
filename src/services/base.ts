import { db } from '../db';
import { eq, and, or, desc, asc, ilike, isNull, not } from 'drizzle-orm';

/**
 * Base service class with common CRUD operations and error handling
 */
export abstract class BaseService<T, InsertT, UpdateT> {
  protected abstract table: any;

  /**
   * Find a single record by ID
   */
  async findById(id: string): Promise<T | null> {
    try {
      const [record] = await db
        .select()
        .from(this.table)
        .where(eq(this.table.id, id))
        .limit(1);

      return record || null;
    } catch (error) {
      this.handleError('findById', error);
      return null;
    }
  }

  /**
   * Find multiple records with optional filters
   */
  async findMany(options: {
    where?: any;
    orderBy?: { column: any; direction: 'asc' | 'desc' }[];
    limit?: number;
    offset?: number;
  } = {}): Promise<T[]> {
    try {
      let query = db.select().from(this.table);

      if (options.where) {
        query = query.where(options.where);
      }

      if (options.orderBy) {
        options.orderBy.forEach(({ column, direction }) => {
          query = query.orderBy(direction === 'asc' ? asc(column) : desc(column));
        });
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.offset(options.offset);
      }

      return await query;
    } catch (error) {
      this.handleError('findMany', error);
      return [];
    }
  }

  /**
   * Create a new record
   */
  async create(data: InsertT): Promise<T | null> {
    try {
      const [newRecord] = await db
        .insert(this.table)
        .values(data)
        .returning();

      return newRecord;
    } catch (error) {
      this.handleError('create', error);
      return null;
    }
  }

  /**
   * Update a record by ID
   */
  async update(id: string, data: UpdateT): Promise<T | null> {
    try {
      const [updatedRecord] = await db
        .update(this.table)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(this.table.id, id))
        .returning();

      return updatedRecord;
    } catch (error) {
      this.handleError('update', error);
      return null;
    }
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(this.table)
        .where(eq(this.table.id, id));

      return result.rowCount > 0;
    } catch (error) {
      this.handleError('delete', error);
      return false;
    }
  }

  /**
   * Check if a record exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      const [record] = await db
        .select({ id: this.table.id })
        .from(this.table)
        .where(eq(this.table.id, id))
        .limit(1);

      return !!record;
    } catch (error) {
      this.handleError('exists', error);
      return false;
    }
  }

  /**
   * Count records with optional filters
   */
  async count(options: { where?: any } = {}): Promise<number> {
    try {
      let query = db.select({ count: this.table.id }).from(this.table);

      if (options.where) {
        query = query.where(options.where);
      }

      const result = await query;
      return result.length;
    } catch (error) {
      this.handleError('count', error);
      return 0;
    }
  }

  /**
   * Search records by text field
   */
  async search(searchTerm: string, searchFields: (keyof T)[]): Promise<T[]> {
    try {
      if (!searchTerm || searchFields.length === 0) {
        return [];
      }

      const searchConditions = searchFields.map((field) =>
        ilike(this.table[field as string], `%${searchTerm}%`)
      );

      return await db
        .select()
        .from(this.table)
        .where(or(...searchConditions));
    } catch (error) {
      this.handleError('search', error);
      return [];
    }
  }

  /**
   * Get paginated results
   */
  async paginate(options: {
    page: number;
    limit: number;
    where?: any;
    orderBy?: { column: any; direction: 'asc' | 'desc' }[];
  }): Promise<{
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    try {
      const offset = (options.page - 1) * options.limit;

      // Get total count
      const total = await this.count({ where: options.where });

      // Get data
      const data = await this.findMany({
        where: options.where,
        orderBy: options.orderBy,
        limit: options.limit,
        offset,
      });

      const totalPages = Math.ceil(total / options.limit);

      return {
        data,
        pagination: {
          page: options.page,
          limit: options.limit,
          total,
          totalPages,
          hasNext: options.page < totalPages,
          hasPrev: options.page > 1,
        },
      };
    } catch (error) {
      this.handleError('paginate', error);
      return {
        data: [],
        pagination: {
          page: options.page,
          limit: options.limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
    }
  }

  /**
   * Handle errors in a consistent way
   */
  protected handleError(operation: string, error: any): void {
    console.error(`[${this.constructor.name}] Error in ${operation}:`, error);

    // You can add error reporting, logging, or other error handling here
    // For example: send to Sentry, log to file, etc.
  }

  /**
   * Create a where clause for common operations
   */
  protected createWhereClause(conditions: Record<string, any>): any {
    const clauses = Object.entries(conditions)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => {
        if (typeof value === 'object' && value?.not) {
          return not(eq(this.table[key], value.value));
        }
        if (typeof value === 'object' && value?.like) {
          return ilike(this.table[key], `%${value.value}%`);
        }
        return eq(this.table[key], value);
      });

    return clauses.length > 0 ? and(...clauses) : undefined;
  }
}

/**
 * Error types for better error handling
 */
export class DatabaseError extends Error {
  public code?: string;
  public details?: any;
  public operation?: string;

  constructor(message: string, code?: string, details?: any, operation?: string) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.details = details;
    this.operation = operation;
  }
}

export class ValidationError extends DatabaseError {
  public field?: string;
  public value?: any;

  constructor(message: string, field?: string, value?: any) {
    super(message, 'VALIDATION_ERROR', { field, value }, 'validate');
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

export class NotFoundError extends DatabaseError {
  constructor(resource: string, id?: string) {
    super(
      `${resource}${id ? ` with ID ${id}` : ''} not found`,
      'NOT_FOUND',
      { resource, id },
      'findById'
    );
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends DatabaseError {
  constructor(action: string, resource: string) {
    super(
      `Not authorized to ${action} ${resource}`,
      'UNAUTHORIZED',
      { action, resource },
      'authorize'
    );
    this.name = 'UnauthorizedError';
  }
}