# KinLink Database Setup Guide

This guide explains how to set up the KinLink Family Tree database using Drizzle ORM and Supabase.

## Prerequisites

- Node.js (v18 or higher)
- A Supabase project
- PostgreSQL connection string

## Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Update the following variables:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Database
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
```

## Database Schema

The database consists of 8 main tables:

### Core Tables
1. **users** - User accounts and profiles
2. **trees** - Family tree information
3. **members** - Individual family members
4. **relationships** - Connections between family members

### Supporting Tables
5. **life_events** - Important life events for members
6. **collaborations** - User access and permissions
7. **activity_logs** - Audit trail of all changes
8. **notifications** - User notifications

## Setup Instructions

### Option 1: Using Drizzle Kit (Recommended)

1. **Generate migrations:**
   ```bash
   npm run db:generate
   ```

2. **Apply migrations to database:**
   ```bash
   npm run db:push
   ```

### Option 2: Manual SQL Setup

1. **Run the setup script:**
   ```bash
   psql $DATABASE_URL -f src/db/setup.sql
   ```

2. **Or run individual scripts:**
   ```bash
   psql $DATABASE_URL -f src/db/migrations.sql
   psql $DATABASE_URL -f src/db/rls-policies.sql
   psql $DATABASE_URL -f src/db/storage-policies.sql
   ```

## Row Level Security (RLS)

The database uses Row Level Security to ensure users can only access data they're authorized to see:

- **Trees**: Users can only see trees they own or have been granted access to
- **Members**: Access restricted to trees the user collaborates on
- **Relationships**: Same restrictions as members
- **Collaborations**: Users can only see their own collaboration invitations

## Storage Buckets

Three storage buckets are configured:

1. **profile-photos**: User profile pictures (5MB limit)
2. **member-photos**: Family member photos (5MB limit)
3. **tree-exports**: Export files like PDF/GEDCOM (100MB limit)

## Database Functions

Several helper functions are included:

- `get_tree_stats(tree_id)` - Returns statistics for a family tree
- `user_has_tree_access(user_id, tree_id, role)` - Checks user permissions
- `log_tree_activity()` - Records user actions
- `get_siblings(member_id)` - Finds siblings of a member
- `get_family_tree(tree_id, max_depth)` - Returns complete family tree

## Development Tools

### Drizzle Studio
Open the Drizzle Studio to browse your database:
```bash
npm run db:studio
```

### Generating Types
The TypeScript types are automatically generated from the schema and are available in `src/types/database.ts`.

## Testing the Setup

After setting up the database, you can test the connection:

```typescript
import { db } from './src/db';

// Test connection
const result = await db.select().from(users).limit(1);
console.log('Database connection successful:', result);
```

## Security Considerations

1. **Never commit database credentials to version control**
2. **Use environment variables for all sensitive data**
3. **Enable RLS on all tables**
4. **Review storage policies regularly**
5. **Monitor activity logs for suspicious behavior**

## Migration Strategy

When updating the schema:

1. **Always backup your database first**
2. **Test migrations on a staging environment**
3. **Use transaction-safe migration scripts**
4. **Update TypeScript types after schema changes**

## Troubleshooting

### Common Issues

1. **Connection errors**: Check DATABASE_URL format and credentials
2. **RLS policy issues**: Verify policies are enabled and properly configured
3. **Permission errors**: Ensure user has necessary grants
4. **Storage upload failures**: Check bucket policies and file size limits

### Debug Queries

Use Drizzle Studio or PostgreSQL client to debug queries:

```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'members';

-- Test user access
SELECT * FROM trees WHERE owner_id = 'user-uuid';

-- Check table structures
\d+ users;
```

## Next Steps

After database setup:

1. Set up authentication in your app
2. Implement the service layer for database operations
3. Configure real-time subscriptions
4. Set up file upload handling for photos
5. Implement data validation and error handling

## Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)