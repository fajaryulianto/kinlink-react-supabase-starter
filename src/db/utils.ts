import { db } from './index';
import { users, trees, members, relationships } from './schema';
import { eq } from 'drizzle-orm';

/**
 * Test database connection
 */
export async function testConnection() {
  try {
    await db.select().from(users).limit(1);
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string) {
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return user[0] || null;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string) {
  const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user[0] || null;
}

/**
 * Get trees for a user (owner or collaborator)
 */
export async function getUserTrees(userId: string) {
  const ownedTrees = await db.select().from(trees).where(eq(trees.ownerId, userId));

  // TODO: Add collaborative trees query once collaborations table is populated

  return ownedTrees;
}

/**
 * Get tree with member count
 */
export async function getTreeWithStats(treeId: string) {
  const tree = await db.select().from(trees).where(eq(trees.id, treeId)).limit(1);

  if (!tree[0]) {
    return null;
  }

  const memberCount = await db.select({ count: members.id }).from(members).where(eq(members.treeId, treeId));
  const relationshipCount = await db.select({ count: relationships.id }).from(relationships).where(eq(relationships.treeId, treeId));

  return {
    ...tree[0],
    memberCount: memberCount.length,
    relationshipCount: relationshipCount.length,
  };
}

/**
 * Create a new user
 */
export async function createUser(userData: {
  email: string;
  displayName?: string;
  photoUrl?: string;
}) {
  const [newUser] = await db.insert(users).values(userData).returning();
  return newUser;
}

/**
 * Create a new tree
 */
export async function createTree(treeData: {
  name: string;
  description?: string;
  ownerId: string;
  isPublic?: boolean;
}) {
  const [newTree] = await db.insert(trees).values(treeData).returning();
  return newTree;
}

/**
 * Check if user has access to a tree
 */
export async function checkTreeAccess(userId: string, treeId: string, _requiredRole: 'owner' | 'editor' | 'viewer' = 'viewer') {
  const tree = await db.select().from(trees).where(eq(trees.id, treeId)).limit(1);

  if (!tree[0]) {
    return false;
  }

  // Owner has all permissions
  if (tree[0].ownerId === userId) {
    return true;
  }

  // TODO: Add collaboration check once implemented
  // For now, only owners have access

  return false;
}

/**
 * Database health check
 */
export async function healthCheck() {
  const checks = {
    database: false,
    tables: {
      users: false,
      trees: false,
      members: false,
      relationships: false,
    },
    timestamp: new Date().toISOString(),
  };

  try {
    // Test database connection
    await db.select().from(users).limit(1);
    checks.database = true;

    // Test each table
    await db.select().from(users).limit(1);
    checks.tables.users = true;

    await db.select().from(trees).limit(1);
    checks.tables.trees = true;

    await db.select().from(members).limit(1);
    checks.tables.members = true;

    await db.select().from(relationships).limit(1);
    checks.tables.relationships = true;

  } catch (error) {
    console.error('Health check failed:', error);
  }

  return checks;
}

/**
 * Seed database with sample data (for development)
 */
export async function seedSampleData() {
  try {
    // Create sample user
    const [sampleUser] = await db.insert(users).values({
      email: 'sample@kinlink.com',
      displayName: 'Sample User',
    }).returning();

    // Create sample tree
    const [sampleTree] = await db.insert(trees).values({
      name: 'Sample Family Tree',
      description: 'A sample family tree for testing',
      ownerId: sampleUser.id,
      isPublic: false,
    }).returning();

    // Create sample members
    const [grandfather] = await db.insert(members).values({
      treeId: sampleTree.id,
      firstName: 'John',
      lastName: 'Smith',
      birthDate: '1950-01-01',
      birthPlace: 'New York, USA',
      isLiving: false,
      deathDate: '2020-01-01',
      deathPlace: 'New York, USA',
      createdBy: sampleUser.id,
    }).returning();

    const [grandmother] = await db.insert(members).values({
      treeId: sampleTree.id,
      firstName: 'Jane',
      lastName: 'Smith',
      birthDate: '1952-03-15',
      birthPlace: 'Boston, USA',
      isLiving: true,
      createdBy: sampleUser.id,
    }).returning();

    const [father] = await db.insert(members).values({
      treeId: sampleTree.id,
      firstName: 'Robert',
      lastName: 'Smith',
      birthDate: '1975-06-10',
      birthPlace: 'New York, USA',
      isLiving: true,
      createdBy: sampleUser.id,
    }).returning();

    // Create relationships
    await db.insert(relationships).values([
      {
        treeId: sampleTree.id,
        fromMemberId: grandfather.id,
        toMemberId: father.id,
        relationshipType: 'parent',
        parentRole: 'father',
      },
      {
        treeId: sampleTree.id,
        fromMemberId: grandmother.id,
        toMemberId: father.id,
        relationshipType: 'parent',
        parentRole: 'mother',
      },
      {
        treeId: sampleTree.id,
        fromMemberId: grandfather.id,
        toMemberId: grandmother.id,
        relationshipType: 'spouse',
        marriageDate: '1974-09-01',
        marriagePlace: 'New York, USA',
      },
    ]);

    console.log('✅ Sample data seeded successfully');
    return { user: sampleUser, tree: sampleTree };

  } catch (error) {
    console.error('❌ Failed to seed sample data:', error);
    throw error;
  }
}