// Database Types for KinLink Family Tree App
// These types correspond to the database schema

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  photoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tree {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Member {
  id: string;
  treeId: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  nickname: string | null;
  maidenName: string | null;
  gender: 'male' | 'female' | 'other' | null;
  birthDate: Date;
  birthPlace: string;
  deathDate: Date | null;
  deathPlace: string | null;
  isLiving: boolean;
  photoUrl: string | null;
  occupation: string | null;
  education: string | null;
  biography: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface Relationship {
  id: string;
  treeId: string;
  fromMemberId: string;
  toMemberId: string;
  relationshipType: 'parent' | 'child' | 'spouse' | 'sibling';
  parentRole: 'father' | 'mother' | 'neutral' | null;
  verificationLevel: 'verified' | 'relationship' | 'unknown';
  marriagePlace: string | null;
  marriageDate: Date | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
}

export interface LifeEvent {
  id: string;
  memberId: string;
  eventType: 'graduation' | 'job' | 'marriage' | 'birth' | 'death' | 'retirement' | 'military' | 'relocation' | 'education' | 'religious' | 'other';
  title: string;
  eventDate: Date | null;
  location: string | null;
  description: string | null;
  createdAt: Date;
}

export interface Collaboration {
  id: string;
  treeId: string;
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  invitedBy: string;
  invitedAt: Date;
  acceptedAt: Date | null;
  status: 'pending' | 'accepted' | 'declined';
}

export interface ActivityLog {
  id: string;
  treeId: string;
  userId: string;
  actionType: 'view' | 'create' | 'update' | 'delete';
  targetType: 'member' | 'tree' | 'relationship';
  targetId: string | null;
  metadata: Record<string, any> | null;
  ipAddress: string | null;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'invitation' | 'member_added' | 'sharing' | 'update' | 'reminder';
  title: string;
  message: string;
  isRead: boolean;
  metadata: Record<string, any> | null;
  createdAt: Date;
}

// Extended types with relations
export interface UserWithRelations extends User {
  ownedTrees?: Tree[];
  createdMembers?: Member[];
  updatedMembers?: Member[];
  collaborations?: Collaboration[];
  activityLogs?: ActivityLog[];
  notifications?: Notification[];
}

export interface TreeWithRelations extends Tree {
  owner?: User;
  members?: Member[];
  relationships?: Relationship[];
  collaborations?: Collaboration[];
  activityLogs?: ActivityLog[];
  _count?: {
    members?: number;
    relationships?: number;
    collaborators?: number;
  };
}

export interface MemberWithRelations extends Member {
  tree?: Tree;
  creator?: User;
  updater?: User;
  lifeEvents?: LifeEvent[];
  relationships?: Relationship[];
  parents?: Member[];
  children?: Member[];
  spouses?: Member[];
  siblings?: Member[];
}

export interface RelationshipWithRelations extends Relationship {
  tree?: Tree;
  fromMember?: Member;
  toMember?: Member;
}

// Form types for mutations
export interface CreateMemberInput {
  treeId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  nickname?: string;
  maidenName?: string;
  gender?: 'male' | 'female' | 'other';
  birthDate: string;
  birthPlace: string;
  deathDate?: string;
  deathPlace?: string;
  isLiving?: boolean;
  occupation?: string;
  education?: string;
  biography?: string;
  email?: string;
  phone?: string;
  address?: string;
  photoFile?: File;
}

export interface UpdateMemberInput extends Partial<CreateMemberInput> {
  id: string;
  treeId: string;
}

export interface CreateRelationshipInput {
  treeId: string;
  fromMemberId: string;
  toMemberId: string;
  relationshipType: 'parent' | 'child' | 'spouse' | 'sibling';
  parentRole?: 'father' | 'mother' | 'neutral';
  verificationLevel?: 'verified' | 'relationship' | 'unknown';
  marriagePlace?: string;
  marriageDate?: string;
  metadata?: Record<string, any>;
}

export interface CreateTreeInput {
  name: string;
  description?: string;
  isPublic?: boolean;
}

export interface UpdateTreeInput extends Partial<CreateTreeInput> {
  id: string;
}

export interface CreateLifeEventInput {
  memberId: string;
  eventType: 'graduation' | 'job' | 'marriage' | 'birth' | 'death' | 'retirement' | 'military' | 'relocation' | 'education' | 'religious' | 'other';
  title: string;
  eventDate?: string;
  location?: string;
  description?: string;
}

// Query and filter types
export interface MemberFilters {
  search?: string;
  gender?: 'male' | 'female' | 'other';
  isLiving?: boolean;
  birthYearRange?: {
    start?: number;
    end?: number;
  };
}

export interface TreeFilters {
  search?: string;
  isPublic?: boolean;
  ownerId?: string;
  hasCollaborations?: boolean;
}

export interface ActivityFilters {
  actionType?: 'view' | 'create' | 'update' | 'delete';
  targetType?: 'member' | 'tree' | 'relationship';
  userId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// Statistics types
export interface TreeStats {
  totalMembers: number;
  totalGenerations: number;
  livingMembers: number;
  deceasedMembers: number;
  totalRelationships: number;
  collaborators: number;
}

export interface FamilyTreeNode {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: Date;
  deathDate: Date | null;
  isLiving: boolean;
  photoUrl: string | null;
  gender: 'male' | 'female' | 'other' | null;
  relationships: Array<{
    type: 'parent' | 'child' | 'spouse' | 'sibling';
    relatedTo: string;
    metadata?: Record<string, any>;
  }>;
  children?: FamilyTreeNode[];
  spouses?: FamilyTreeNode[];
  parents?: FamilyTreeNode[];
}

// Export types for Supabase Realtime
export interface RealtimeEvent<T = any> {
  schema: string;
  table: string;
  commit_timestamp: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: T;
  old?: T;
  errors: string[];
}

export interface TreeUpdatePayload {
  treeId: string;
  type: 'member_added' | 'member_updated' | 'member_deleted' | 'relationship_added' | 'relationship_updated' | 'relationship_deleted';
  data: any;
  userId: string;
  timestamp: Date;
}

// Error types
export interface DatabaseError extends Error {
  code?: string;
  details?: string;
  hint?: string;
  table?: string;
}

export interface ValidationError extends Error {
  field: string;
  value: any;
  constraint: string;
}

// API Response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: DatabaseError | ValidationError | string;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Upload types
export interface UploadResult {
  url: string;
  path: string;
  size: number;
  contentType: string;
}

export interface ProfilePhotoUpload {
  userId: string;
  file: File;
}

export interface MemberPhotoUpload {
  treeId: string;
  memberId: string;
  file: File;
}

// Export all types for easier importing
export type {
  User as UserType,
  Tree as TreeType,
  Member as MemberType,
  Relationship as RelationshipType,
  LifeEvent as LifeEventType,
  Collaboration as CollaborationType,
  ActivityLog as ActivityLogType,
  Notification as NotificationType,
};