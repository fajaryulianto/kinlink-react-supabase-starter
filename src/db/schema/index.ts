import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  date,
  jsonb,
  pgEnum
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const genderEnum = pgEnum('gender', ['male', 'female', 'other']);
export const relationshipTypeEnum = pgEnum('relationship_type', ['parent', 'child', 'spouse', 'sibling']);
export const parentRoleEnum = pgEnum('parent_role', ['father', 'mother', 'neutral']);
export const verificationLevelEnum = pgEnum('verification_level', ['verified', 'relationship', 'unknown']);
export const eventTypeEnum = pgEnum('event_type', [
  'graduation',
  'job',
  'marriage',
  'birth',
  'death',
  'retirement',
  'military',
  'relocation',
  'education',
  'religious',
  'other'
]);
export const collaborationRoleEnum = pgEnum('collaboration_role', ['owner', 'editor', 'viewer']);
export const collaborationStatusEnum = pgEnum('collaboration_status', ['pending', 'accepted', 'declined']);
export const actionTypeEnum = pgEnum('action_type', ['view', 'create', 'update', 'delete']);
export const targetTypeEnum = pgEnum('target_type', ['member', 'tree', 'relationship']);
export const notificationTypeEnum = pgEnum('notification_type', ['invitation', 'member_added', 'sharing', 'update', 'reminder']);

// Tables
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  photoUrl: text('photo_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const trees = pgTable('trees', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  isPublic: boolean('is_public').default(false).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const members = pgTable('members', {
  id: uuid('id').primaryKey().defaultRandom(),
  treeId: uuid('tree_id').notNull().references(() => trees.id, { onDelete: 'cascade' }),
  firstName: text('first_name').notNull(),
  middleName: text('middle_name'),
  lastName: text('last_name').notNull(),
  nickname: text('nickname'),
  maidenName: text('maiden_name'),
  gender: genderEnum('gender'),
  birthDate: date('birth_date').notNull(),
  birthPlace: text('birth_place').notNull(),
  deathDate: date('death_date'),
  deathPlace: text('death_place'),
  isLiving: boolean('is_living').default(true).notNull(),
  photoUrl: text('photo_url'),
  occupation: text('occupation'),
  education: text('education'),
  biography: text('biography'),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
  updatedBy: uuid('updated_by').references(() => users.id),
});

export const relationships = pgTable('relationships', {
  id: uuid('id').primaryKey().defaultRandom(),
  treeId: uuid('tree_id').notNull().references(() => trees.id, { onDelete: 'cascade' }),
  fromMemberId: uuid('from_member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  toMemberId: uuid('to_member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  relationshipType: relationshipTypeEnum('relationship_type').notNull(),
  parentRole: parentRoleEnum('parent_role'),
  verificationLevel: verificationLevelEnum('verification_level').default('unknown').notNull(),
  marriagePlace: text('marriage_place'),
  marriageDate: date('marriage_date'),
  metadata: jsonb('metadata').$type<{[key: string]: any}>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const lifeEvents = pgTable('life_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  eventType: eventTypeEnum('event_type').notNull(),
  title: text('title').notNull(),
  eventDate: date('event_date'),
  location: text('location'),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const collaborations = pgTable('collaborations', {
  id: uuid('id').primaryKey().defaultRandom(),
  treeId: uuid('tree_id').notNull().references(() => trees.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: collaborationRoleEnum('role').notNull(),
  invitedBy: uuid('invited_by').notNull().references(() => users.id),
  invitedAt: timestamp('invited_at').notNull().defaultNow(),
  acceptedAt: timestamp('accepted_at'),
  status: collaborationStatusEnum('status').default('pending').notNull(),
});

export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  treeId: uuid('tree_id').notNull().references(() => trees.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  actionType: actionTypeEnum('action_type').notNull(),
  targetType: targetTypeEnum('target_type').notNull(),
  targetId: uuid('target_id'),
  metadata: jsonb('metadata').$type<{[key: string]: any}>(),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  metadata: jsonb('metadata').$type<{[key: string]: any}>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  ownedTrees: many(trees),
  createdMembers: many(members),
  updatedMembers: many(members),
  collaborations: many(collaborations),
  activityLogs: many(activityLogs),
  notifications: many(notifications),
  invitedCollaborations: many(collaborations),
}));

export const treesRelations = relations(trees, ({ one, many }) => ({
  owner: one(users, {
    fields: [trees.ownerId],
    references: [users.id],
  }),
  members: many(members),
  relationships: many(relationships),
  collaborations: many(collaborations),
  activityLogs: many(activityLogs),
}));

export const membersRelations = relations(members, ({ one, many }) => ({
  tree: one(trees, {
    fields: [members.treeId],
    references: [trees.id],
  }),
  creator: one(users, {
    fields: [members.createdBy],
    references: [users.id],
  }),
  updater: one(users, {
    fields: [members.updatedBy],
    references: [users.id],
  }),
  lifeEvents: many(lifeEvents),
  fromRelationships: many(relationships, { relationName: 'fromMember' }),
  toRelationships: many(relationships, { relationName: 'toMember' }),
}));

export const relationshipsRelations = relations(relationships, ({ one }) => ({
  tree: one(trees, {
    fields: [relationships.treeId],
    references: [trees.id],
  }),
  fromMember: one(members, {
    fields: [relationships.fromMemberId],
    references: [members.id],
    relationName: 'fromMember',
  }),
  toMember: one(members, {
    fields: [relationships.toMemberId],
    references: [members.id],
    relationName: 'toMember',
  }),
}));

export const lifeEventsRelations = relations(lifeEvents, ({ one }) => ({
  member: one(members, {
    fields: [lifeEvents.memberId],
    references: [members.id],
  }),
}));

export const collaborationsRelations = relations(collaborations, ({ one }) => ({
  tree: one(trees, {
    fields: [collaborations.treeId],
    references: [trees.id],
  }),
  user: one(users, {
    fields: [collaborations.userId],
    references: [users.id],
  }),
  invitedBy: one(users, {
    fields: [collaborations.invitedBy],
    references: [users.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  tree: one(trees, {
    fields: [activityLogs.treeId],
    references: [trees.id],
  }),
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));