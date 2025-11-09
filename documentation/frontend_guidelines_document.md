# Frontend Guideline Document

This document outlines the frontend architecture, design principles, and technologies for the KinLink Family Tree mobile application. It’s written in everyday language to ensure clarity and consistency across the team.

## 1. Frontend Architecture

### Overview
- Framework: React Native (functional components, hooks) running on Metro Bundler.
- Language: TypeScript in strict mode for type safety.
- Backend Integration: Supabase client for auth, database queries, storage, and real-time features.
- Data Layer: Drizzle ORM for all PostgreSQL interactions, wrapped in a service layer.
- Server State Management: TanStack Query (React Query) for data fetching, caching, background refetching, and optimistic updates.
- Form Handling: React Hook Form with Zod for schema validation and type safety.
- UI Library: React Native Paper (Material Design) or Tamagui for consistent theming and components.
- Navigation: React Navigation (stack and tab navigators, deep linking).

### Scalability, Maintainability, Performance
- Component-based structure keeps UI pieces small and reusable.
- Service layer (`src/services/`) centralizes all API calls, making code testable and easier to update.
- TanStack Query minimizes network calls, handles cache invalidation, and ensures UI stays in sync with the server.
- Drizzle transactions guarantee multi-step database operations succeed or roll back together, preserving data integrity.
- TypeScript + Zod ensure that data shapes are validated at compile time, reducing runtime errors.

## 2. Design Principles

1. **Usability**: Simple, predictable user flows with clear labels and feedback.
2. **Accessibility**: High-contrast text, sufficient touch target sizes (minimum 44×44 pt), and support for screen readers via accessibility labels.
3. **Responsiveness**: Flexible layouts (using Flexbox) that adapt to different screen sizes and orientations.
4. **Consistency**: Shared UI components and theming ensure a uniform look and feel.

Application
- Buttons, inputs, and dialogs follow Material Design guidelines.
- Error messages and loading indicators provide immediate feedback.
- Form fields have inline validation and user-friendly error messages.

## 3. Styling and Theming

### Approach
- Use React Native’s `StyleSheet` API or a library like Tamagui to define styles as JavaScript objects.
- Organize styles by component, e.g., `Button/style.ts`, `Input/style.ts`, using clear naming conventions.
- Implement a theme context (`ThemeProvider`) to switch between light and dark modes at runtime.

### Theming
- Two themes: **Light** and **Dark**.
- Theme values stored in a central file (`src/theme/index.ts`).
- Access colors and typography via hooks or context (`useTheme()`).

### Visual Style
- Style: Material Design with a nature-inspired twist (organic shapes, soft shadows).
- Elevation and rounded corners for cards and buttons.

### Color Palette
Light Theme:
- Primary: #2D7A2D (Forest Green)
- Secondary: #A3C293 (Sage)
- Accent: #8AB6D6 (Sky Blue)
- Background: #F5F5F4 (Ivory)
- Surface: #FFFFFF (White)
- Text Primary: #333333
- Text Secondary: #555555
- Error: #D32F2F

Dark Theme:
- Primary: #A3C293
- Secondary: #2D7A2D
- Background: #121212
- Surface: #1E1E1E
- Text Primary: #E0E0E0
- Text Secondary: #B0B0B0
- Error: #EF5350

### Typography
- Font Family: Roboto (Android, iOS) or system default.
- Weights: Regular (400), Medium (500), Bold (700).
- Scale text sizes using a typographic scale (e.g., 14 px body, 20 px title).

## 4. Component Structure

- **Atomic components** (`src/components/`) such as `Button`, `Input`, `Card`, `Dialog`.
- **Composite components** that combine atoms, e.g., `MemberCard`, `TreeNode`.
- Each component folder contains:
  - `index.tsx`: main component file.
  - `style.ts`: styles definition.
  - `types.ts`: prop type definitions (if needed).
- Benefits:
  - Easy to locate and update code.
  - Promotes reuse and consistency.
  - Simplifies testing individual pieces.

## 5. State Management

### Server State: TanStack Query
- useQuery for fetching lists or single items.
- useMutation for creating, updating, or deleting data with automatic cache invalidation.
- Query keys follow a consistent naming pattern (`['member', memberId]`, `['tree', treeId]`).

### Client State: Lightweight Store or Context
- Global settings (theme mode, user profile) managed via React Context or Zustand.
- Keep shared UI state (e.g., current selected node) in a simple store.

## 6. Routing and Navigation

- Library: React Navigation v6.
- Organize navigators:
  - **AuthStack**: `LoginScreen`, `RegisterScreen`.
  - **MainTab**: `HomeScreen`, `FamilyTreeScreen`, `SettingsScreen`.
  - **ModalStack**: `AddMemberModal`, `EditMemberModal`.
- Deep linking configured in `navigation/linking.ts` for universal links.
- Handle busy/loading states and authentication guards before rendering protected screens.

## 7. Performance Optimization

- **Lazy Loading**: Dynamically import less-often-used screens and components.
- **Code Splitting**: Use React.lazy and Suspense for large modules.
- **Asset Optimization**: Use compressed images (`.webp`/`@2x`), optimize SVGs.
- **Memoization**: React.memo for pure components and useCallback/useMemo for expensive calculations.
- **Batching and Debouncing**: Debounce rapid updates (e.g., search input).
- **Offline Support**: Cache queries and serve stale data while revalidating in background.

## 8. Testing and Quality Assurance

1. **Unit Tests**
   - Jest + React Native Testing Library.
   - Focus on pure functions, component rendering, and hooks.
2. **Integration Tests**
   - Test component interactions, API mocks with MSW (Mock Service Worker).
3. **End-to-End Tests**
   - Detox or Maestro for critical flows: sign-up, login, add member.
4. **Code Quality**
   - ESLint with Prettier for consistent formatting.
   - TypeScript compiler checks in CI.
   - Commit hooks (Husky) for linting and testing on pre-commit.

## 9. Conclusion and Overall Frontend Summary

This guideline sets a clear path for building a reliable, maintainable, and high-performance KinLink mobile app. By following a component-driven architecture, enforcing type safety, and leveraging modern tools like Supabase, Drizzle ORM, and TanStack Query, we ensure code quality and a smooth user experience. The nature-inspired Material Design look and robust theming support deliver an inviting interface, while comprehensive testing and performance optimizations guarantee reliability and speed. This setup not only meets the project’s current needs but also scales to support future features like real-time collaboration, advanced transactions, and data export.