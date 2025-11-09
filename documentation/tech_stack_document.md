# Tech Stack Document for KinLink Family Tree App

This document explains, in everyday language, the main technologies chosen for the KinLink mobile application. It describes why each technology was selected and how they work together to create a fast, reliable, and secure family tree experience.

## 1. Frontend Technologies

Our mobile app’s interface is built with modern, widely adopted tools that make development smoother and deliver a polished experience to users.

- React Native (with Metro Bundler)
  - Lets us write one codebase for both iOS and Android.
  - Provides a rich set of ready-made components and smooth animations.
- TypeScript
  - Adds clear rules around data types to catch many mistakes early.
  - Makes the code easier to understand and maintain.
- React Navigation
  - Powers screen-to-screen flow (login, family tree view, add/edit member).
  - Handles deep links, back-button behavior, and tab/stack navigation.
- React Native Paper (or Tamagui)
  - A ready-to-use library of Material Design–style components (buttons, dialogs, cards).
  - Ensures consistent look and feel across the app.
- Styling solutions (StyleSheet API, Tamagui, or Unistyles)
  - Organize styles in a predictable way.
  - Support dynamic themes (light/dark) and responsive layouts.
- React Hook Form + Zod
  - Manages complex forms (Add Member, Registration) with minimal boilerplate.
  - Validates user input against clear, reusable rules.
- TanStack Query (React Query)
  - Handles data fetching, caching, and synchronization with the server.
  - Provides loading indicators, retries on failure, and optimistic updates for instant UI feedback.

Together, these tools make it possible to build a responsive, type-safe, and feature-rich mobile interface quickly.

## 2. Backend Technologies

All data storage, authentication, and real-time features rely on a modern Backend-as-a-Service platform, complemented by a lightweight ORM for database operations.

- Supabase
  - **PostgreSQL Database**: Stores users, family members, relationships, photos, and activity logs.
  - **Auth**: Manages secure user sign-up, login, and session handling out of the box.
  - **Storage**: Hosts uploaded photos and media in a scalable bucket system.
  - **Realtime**: Publishes live updates on specific family trees to all connected clients.
- Drizzle ORM
  - A type-safe interface on top of PostgreSQL.
  - Enables multi-step transactions (e.g., adding a member, linking relations, uploading an image) that succeed or fail together.
- Supabase Client Libraries (JavaScript/TypeScript)
  - Simplify queries, authentication calls, and subscriptions.

This combination delivers a full-featured backend without managing your own servers, while Drizzle ensures database interactions remain clear and reliable.

## 3. Infrastructure and Deployment

To keep development fast and ensure stable releases, we rely on proven hosting, build, and deployment tools.

- Version Control: Git + GitHub
  - Central place for code collaboration, review, and history.
- Continuous Integration / Continuous Deployment (CI/CD): GitHub Actions
  - Automatically runs tests, linting, and builds on every pull request.
  - Can publish new mobile builds via Expo Application Services (EAS) or Fastlane.
- Metro Bundler (React Native’s default)
  - Optimizes code bundling and asset handling for development and production.
- Supabase Hosting
  - Manages the database, authentication, storage, and realtime server.
- App Store & Play Store Deployment (via Expo or native pipelines)
  - Packages and distributes the mobile app to users.

These infrastructure choices ensure that every change is tested, reviewers get quick feedback, and new features reach users reliably.

## 4. Third-Party Integrations

To extend functionality without reinventing the wheel, we integrate a handful of trusted services:

- Supabase Services (Auth, Database, Storage, Realtime)
  - Key building blocks for user data, media, and live collaboration.
- TanStack Query
  - Although part of our code, it’s a widely used library that hooks into Supabase for data management.
- React Native Paper / Tamagui
  - UI libraries maintained by the community to speed up UI development.
- Optional Analytics and Error Tracking (e.g., Sentry, Firebase Analytics)
  - Track app usage, performance metrics, and catch runtime errors in production.

These integrations focus on tried-and-tested solutions to keep the app lightweight and maintainable.

## 5. Security and Performance Considerations

We’ve built in multiple layers of protection and optimization to keep user data safe and the app responsive.

- Authentication & Authorization
  - Supabase Auth issues secure JSON Web Tokens (JWTs) for every request.
  - Row Level Security (RLS) policies in PostgreSQL ensure users only access their own family trees.
- Data Validation
  - Zod schemas validate form data before it ever reaches the backend.
- Transactional Integrity
  - Drizzle ORM wraps multi-step operations in atomic transactions, so partial failures can’t corrupt data.
- Network & Caching
  - TanStack Query caches responses and retries failed requests automatically.
  - Optimistic updates make the UI feel instant while waiting for server confirmation.
- Secure Storage of Tokens & Media
  - Mobile secure storage or keychains keep authentication tokens safe.
  - Supabase Storage buckets enforce file access rules.

Together, these measures prevent unauthorized access, keep data consistent, and ensure a smooth user experience even on flaky networks.

## 6. Conclusion and Overall Tech Stack Summary

We’ve chosen a technology stack that balances developer productivity, user experience, and long-term maintainability:

- Frontend: React Native, TypeScript, React Navigation, React Native Paper (or Tamagui), React Hook Form, Zod, TanStack Query
- Backend: Supabase (PostgreSQL, Auth, Storage, Realtime), Drizzle ORM
- Infrastructure: GitHub (code), GitHub Actions (CI/CD), Metro Bundler, Expo/EAS or Fastlane (app builds), Supabase hosting
- Integrations: Community-maintained libraries for UI, data management, and optional analytics/error tracking
- Security & Performance: Row Level Security, atomic transactions, form validation, caching, and optimistic UI updates

This tight-knit set of tools lets us build KinLink quickly while ensuring it is secure, scalable, and pleasant to use. The unique mix of Supabase’s backend services plus a type-safe ORM (Drizzle) and a modern mobile frontend (React Native) sets KinLink apart as a real-time, collaborative family tree app that developers can confidently maintain and users will enjoy interacting with.