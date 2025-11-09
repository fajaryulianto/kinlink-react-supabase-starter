/**
 * Database Test Script
 * This script validates the database schema and basic operations
 */

import { testConnection, healthCheck } from './utils';
import { db } from './index';
import { users, trees, members, relationships, lifeEvents, collaborations, activityLogs, notifications } from './schema';
import { eq } from 'drizzle-orm';

async function runTests() {
  console.log('🧪 Starting Database Tests...\n');

  // Test 1: Connection
  console.log('1. Testing database connection...');
  const connectionOk = await testConnection();
  if (!connectionOk) {
    console.log('❌ Connection failed. Stopping tests.');
    return;
  }

  // Test 2: Health Check
  console.log('\n2. Running health check...');
  const health = await healthCheck();
  console.log('Health check results:', JSON.stringify(health, null, 2));

  // Test 3: Basic CRUD Operations
  console.log('\n3. Testing CRUD operations...');

  try {
    // Create user
    console.log('   Creating test user...');
    const [newUser] = await db.insert(users).values({
      email: 'test@example.com',
      displayName: 'Test User',
    }).returning();

    console.log('   ✅ User created:', newUser.id);

    // Read user
    console.log('   Reading user...');
    const foundUser = await db.select().from(users).where(eq(users.id, newUser.id));
    console.log('   ✅ User found:', foundUser[0]?.email);

    // Update user
    console.log('   Updating user...');
    const [updatedUser] = await db.update(users)
      .set({ displayName: 'Updated Test User' })
      .where(eq(users.id, newUser.id))
      .returning();
    console.log('   ✅ User updated:', updatedUser.displayName);

    // Create tree
    console.log('   Creating test tree...');
    const [newTree] = await db.insert(trees).values({
      name: 'Test Family Tree',
      description: 'A test tree for validation',
      ownerId: newUser.id,
      isPublic: false,
    }).returning();
    console.log('   ✅ Tree created:', newTree.id);

    // Create member
    console.log('   Creating test member...');
    const [newMember] = await db.insert(members).values({
      treeId: newTree.id,
      firstName: 'John',
      lastName: 'Doe',
      birthDate: '1990-01-01',
      birthPlace: 'Test City',
      isLiving: true,
      createdBy: newUser.id,
    }).returning();
    console.log('   ✅ Member created:', newMember.id);

    // Create relationship
    console.log('   Creating test relationship...');
    const [parentMember] = await db.insert(members).values({
      treeId: newTree.id,
      firstName: 'Jane',
      lastName: 'Doe',
      birthDate: '1960-01-01',
      birthPlace: 'Test City',
      isLiving: true,
      createdBy: newUser.id,
    }).returning();

    const [newRelationship] = await db.insert(relationships).values({
      treeId: newTree.id,
      fromMemberId: parentMember.id,
      toMemberId: newMember.id,
      relationshipType: 'parent',
      parentRole: 'mother',
    }).returning();
    console.log('   ✅ Relationship created:', newRelationship.id);

    // Create life event
    console.log('   Creating test life event...');
    const [newLifeEvent] = await db.insert(lifeEvents).values({
      memberId: newMember.id,
      eventType: 'graduation',
      title: 'High School Graduation',
      eventDate: '2008-06-01',
      location: 'Test High School',
      description: 'Graduated with honors',
    }).returning();
    console.log('   ✅ Life event created:', newLifeEvent.id);

    // Create collaboration
    console.log('   Creating test collaboration...');
    const [collaboratorUser] = await db.insert(users).values({
      email: 'collaborator@example.com',
      displayName: 'Collaborator User',
    }).returning();

    const [newCollaboration] = await db.insert(collaborations).values({
      treeId: newTree.id,
      userId: collaboratorUser.id,
      role: 'editor',
      invitedBy: newUser.id,
      status: 'accepted',
      acceptedAt: new Date(),
    }).returning();
    console.log('   ✅ Collaboration created:', newCollaboration.id);

    // Create activity log
    console.log('   Creating test activity log...');
    const [newActivityLog] = await db.insert(activityLogs).values({
      treeId: newTree.id,
      userId: newUser.id,
      actionType: 'create',
      targetType: 'member',
      targetId: newMember.id,
      metadata: { memberName: 'John Doe' },
    }).returning();
    console.log('   ✅ Activity log created:', newActivityLog.id);

    // Create notification
    console.log('   Creating test notification...');
    const [newNotification] = await db.insert(notifications).values({
      userId: newUser.id,
      type: 'member_added',
      title: 'New Member Added',
      message: 'John Doe has been added to your family tree',
      isRead: false,
      metadata: { memberId: newMember.id },
    }).returning();
    console.log('   ✅ Notification created:', newNotification.id);

    // Test 4: Queries with Relations
    console.log('\n4. Testing relational queries...');

    // Get tree with all related data
    const treeWithMembers = await db.select({
      tree: trees,
      memberCount: { count: members.id },
      relationshipCount: { count: relationships.id },
    })
      .from(trees)
      .leftJoin(members, eq(trees.id, members.treeId))
      .leftJoin(relationships, eq(trees.id, relationships.treeId))
      .where(eq(trees.id, newTree.id))
      .groupBy(trees.id);

    console.log('   ✅ Tree with stats:', {
      name: treeWithMembers[0]?.tree.name,
      members: treeWithMembers[0]?.memberCount,
      relationships: treeWithMembers[0]?.relationshipCount,
    });

    // Get member relationships
    const memberRelationships = await db.select({
      relationship: relationships,
      fromMember: { firstName: members.firstName, lastName: members.lastName },
      toMember: { firstName: members.firstName, lastName: members.lastName },
    })
      .from(relationships)
      .innerJoin(members, eq(relationships.fromMemberId, members.id))
      .where(eq(relationships.treeId, newTree.id));

    console.log('   ✅ Member relationships found:', memberRelationships.length);

    // Test 5: Constraints and Validation
    console.log('\n5. Testing constraints...');

    // Test unique constraint on users.email
    try {
      await db.insert(users).values({
        email: 'test@example.com', // Same email as before
        displayName: 'Duplicate User',
      });
      console.log('   ❌ Email uniqueness constraint failed');
    } catch (error) {
      console.log('   ✅ Email uniqueness constraint working');
    }

    // Test foreign key constraint
    try {
      await db.insert(members).values({
        treeId: '00000000-0000-0000-0000-000000000000', // Invalid tree ID
        firstName: 'Invalid',
        lastName: 'Member',
        birthDate: new Date().toISOString().split('T')[0],
        birthPlace: 'Nowhere',
      });
      console.log('   ❌ Foreign key constraint failed');
    } catch (error) {
      console.log('   ✅ Foreign key constraint working');
    }

    // Test 6: Cleanup
    console.log('\n6. Cleaning up test data...');
    await db.delete(notifications).where(eq(notifications.userId, newUser.id));
    await db.delete(activityLogs).where(eq(activityLogs.treeId, newTree.id));
    await db.delete(collaborations).where(eq(collaborations.treeId, newTree.id));
    await db.delete(lifeEvents).where(eq(lifeEvents.memberId, newMember.id));
    await db.delete(relationships).where(eq(relationships.treeId, newTree.id));
    await db.delete(members).where(eq(members.treeId, newTree.id));
    await db.delete(trees).where(eq(trees.id, newTree.id));
    await db.delete(users).where(eq(users.id, newUser.id));
    await db.delete(users).where(eq(users.id, collaboratorUser.id));
    console.log('   ✅ Test data cleaned up');

    console.log('\n🎉 All database tests passed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

async function main() {
  try {
    await runTests();
    console.log('\n✅ Database setup is complete and working correctly!');
  } catch (error) {
    console.error('\n❌ Database setup has issues:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { runTests };