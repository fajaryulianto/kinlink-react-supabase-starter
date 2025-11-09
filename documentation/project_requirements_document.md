# Project Requirements Document (PRD)

## 1. Project Overview

KinLink is a mobile application designed to help families build, visualize, and collaborate on their family trees in real time. It provides an intuitive interface for adding, editing, and exploring relatives, while ensuring that changes sync instantly across all devices. By leveraging a modern React Native frontend, Supabase backend, and a type-safe ORM (Drizzle), KinLink aims to deliver a robust, scalable, and secure solution for both casual users and power genealogists.

The core problems KinLink solves are: 1) The complexity of setting up a full-stack, real-time family tree app; and 2) Maintaining data integrity when multiple users collaborate on the same tree. Success will be measured by user onboarding rates, tree-building activity, smooth real-time updates, and zero data corruption under concurrent edits.

## 2. In-Scope vs. Out-of-Scope

### In-Scope (MVP v1)
- User registration & login (email/password) via Supabase Auth
- Create, rename, and delete family trees
- Add, edit, and remove members (name, birthdate, photo, relationships)
- Display interactive family tree view with zoom and pan
- Real-time updates across devices using Supabase Realtime + TanStack Query
- Photo uploads to Supabase Storage
- Activity log per tree (who did what, when)
- Light/dark theme toggle
- Basic error handling and user feedback (snackbars or toasts)

### Out-of-Scope (Phase 2+)
- GEDCOM import/export
- Offline-first queueing and sync
- Advanced analytics (relationship graphs, age distribution)
- Third-party integrations (Facebook, Ancestry.com)
- Presence indicators (who’s online now)
- In-app chat or messaging
- Push notifications

## 3. User Flow

When a new user opens KinLink, they land on a welcome screen offering Sign Up or Login. After creating an account or logging in, they see the Home Screen listing existing family trees and a prominent “+ New Tree” button. Tapping a tree thumbnail takes them into the Family Tree Screen where relatives are displayed in a zoomable, scrollable canvas.

In the Family Tree Screen, a floating “Add Member” button opens a form powered by React Hook Form and Zod validation. The user inputs member details and selects parent or spouse relationships. Upon submission, a Drizzle transaction runs via a `memberService` to insert data, upload the photo, link relationships, and record an activity entry. TanStack Query updates caches instantly, and connected devices get real-time updates via Supabase Realtime subscriptions.

## 4. Core Features

- **Authentication**: Email/password signup and login with Supabase Auth + Row Level Security (RLS).
- **Family Tree Management**: Create, rename, delete trees; each tree scoped to a user or group.
- **Member CRUD**: Full create, read, update, delete operations on family members, including photos.
- **Relationship Linking**: Define parent-child and spouse links; data integrity via Drizzle ORM transactions.
- **Real-Time Collaboration**: Subscriptions to `tree-updates:<tree_id>` channels using Supabase Realtime and cache updates via TanStack Query.
- **Photo Storage**: File uploads to Supabase Storage with URL retrieval.
- **Activity Log**: Immutable log of actions (e.g., "Alice added Bob").
- **Theming**: Light and dark modes using React Native theming APIs.
- **Form Validation**: React Hook Form + Zod for type-safe, schema-driven user input.

## 5. Tech Stack & Tools

- **Frontend**: React Native (Expo or bare) with TypeScript in strict mode
- **Navigation**: React Navigation (stack & tab navigators)
- **UI Library**: React Native Paper or Tamagui for Material-style components
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **ORM**: Drizzle ORM for type-safe database schemas & transactions
- **Data Fetching**: TanStack Query (React Query) for caching and mutations
- **Form Handling**: React Hook Form + Zod schemas
- **State Management**: TanStack Query for server state; optional Zustand for small client state
- **IDE/Plugins**: VSCode with TypeScript support; optional Cursor or Windsurf for AI-assisted coding

## 6. Non-Functional Requirements

- **Performance**: Initial screen render under 2 seconds; interactive actions (zooms, node expansions) under 100 ms.
- **Scalability**: Support trees up to 1,000 members without UI freezes.
- **Security**: SSL/TLS everywhere; Supabase RLS policies per tree; secure storage rules for photos.
- **Reliability**: 99.9% uptime on Supabase services; gracefully handle network failures with retry logic.
- **Accessibility**: Comply with WCAG AA for color contrast and touch target sizes.
- **Usability**: Clear form errors, snackbars for feedback, intuitive icons and labels.

## 7. Constraints & Assumptions

- Supabase services (Auth, Database, Storage, Realtime) are available and performant.
- Users have modern iOS/Android devices with network connectivity.
- Drizzle ORM can run in React Native environment via proper bundler config.
- No requirement for offline or background sync in v1.
- All data stays within Supabase; no external APIs.

## 8. Known Issues & Potential Pitfalls

- **API Rate Limits**: Supabase free tier limits may be reached under heavy use—plan for upgrade or batched operations.
- **Large Trees**: Rendering hundreds of nodes may degrade performance—consider virtualization or clustering.
- **Transaction Rollbacks**: Complex Drizzle transactions may fail silently; ensure robust error reporting and user retry options.
- **Real-Time Conflicts**: Concurrent edits on the same member could overwrite data; consider simple last-write-wins or edit-lock fields in future phases.
- **Mobile Storage Limits**: Photos may fill local cache—implement remote-only fetch or low-res thumbnails if needed.


**End of PRD**