# KinLink Mobile App Security Guidelines

This document outlines the security principles, controls, and best practices for the KinLink family tree mobile application. It is aligned with the application’s architecture—built on React Native, Supabase (with Drizzle ORM), TanStack Query, and React Hook Form—to ensure a robust, secure, and privacy-preserving user experience from development through production.

---

## 1. Authentication & Access Control

**Secure Authentication Flows**
- Use Supabase Authentication with email/password, OAuth providers, and optional OTP-based MFA for sensitive operations (e.g., deleting a tree).  
- Enforce strong password policies server-side: minimum length 12, mix of uppercase, lowercase, numbers, symbols.  
- Leverage Supabase’s built-in rate limiting on auth endpoints to mitigate credential-stuffing and brute-force attempts.

**JWT & Session Management**
- Store access and refresh tokens in secure storage (e.g., React Native Keychain or SecureStore), _not_ in AsyncStorage or localStorage.  
- Validate JWTs on every request: check signature, `exp`, and `sub`.  
- Rotate refresh tokens on each use and enforce short lifetimes (e.g., access token: 15 min; refresh token: 7 days).  
- Provide server-initiated logout/invalidation via Supabase’s revoke endpoint.

**Role-Based Access Control**
- Define Supabase Roles (e.g., `authenticated`, `admin`, `tree_lead`).  
- Implement Row-Level Security (RLS) policies on every table:  
  - Allow read/write only if `auth.uid()` matches `owner_id` or is a shared collaborator.  
  - Separate RLS policies for activity logs (readable by collaborators) vs. membership data (editable only by leads).
- Perform client-side role checks only for UI adjustments; enforce all authorization checks server-side via RLS.

---

## 2. Input Handling & Data Sanitization

**Client-Side & Server-Side Validation**
- Use React Hook Form + Zod to enforce strict schema validation on forms (`AddMember`, `EditMember`, `Register`).  
- Mirror all validation rules in database migrations and Drizzle schemas (e.g., string lengths, date formats) to guard against bypass.

**Preventing Injection Attacks**
- Use parameterized queries exclusively through Drizzle ORM or Supabase client to avoid SQL injection.  
- Sanitize any free-form text (e.g., notes, bios) before storage; escape HTML to prevent stored XSS in admin portals.

**File Upload Security**
- Validate image uploads by MIME type, extension whitelist (`.jpg`, `.png`), and max size (e.g., 5 MB).  
- Store uploads in Supabase Storage with bucket-level RLS rules; restrict public reads to approved URLs.
- Generate time-limited signed URLs for image retrieval.

---

## 3. Data Protection & Privacy

**Encryption**
- Enforce TLS 1.2+ for all communication between app and Supabase (HTTPS).  
- Use AES-256 encryption for any sensitive data cached locally (e.g., offline tree snapshots).

**Secrets Management**
- Do not hardcode API keys or service credentials in source code.  
- Store Supabase URL & public key in environment variables via a secure config system (e.g., React Native Config).  
- For CI/CD, use encrypted secrets stores (GitHub Secrets, CircleCI Contexts) to inject credentials.

**Logging & Error Handling**
- Sanitize log messages to avoid PII leakage (e.g., remove email addresses from error traces).  
- In production, suppress stack traces in crash reports; use a monitored error-tracking service (e.g., Sentry) with PII scrubbing.

---

## 4. API & Service Security

**Endpoint Hardening**
- All service calls (Supabase and custom Drizzle transactions) go through a centralized `src/services/` layer.  
- Abstract Supabase RPCs and Drizzle client calls in well-tested functions that enforce input contracts.

**Rate Limiting & Throttling**
- Activate Supabase Edge Function rate‐limits or deploy API proxies (e.g., Cloudflare) to throttle suspicious traffic to critical endpoints.

**CORS & Origin Controls**
- Although the mobile app bundle is not subject to browser CORS, restrict Supabase client settings to known app domains and IPs (for any admin dashboards).

---

## 5. Mobile App–Specific Security Hygiene

**Secure Storage & Caching**
- Store tokens and sensitive data in platform-secure keychains.  
- Use ephemeral in-memory stores for short-lived data; clear cache on logout.

**Certificate Pinning**
- Implement TLS certificate pinning in React Native to prevent man-in-the-middle attacks against Supabase endpoints.

**Code Integrity & Updates**
- Use CodePush or a similar mechanism with binary signature verification to ensure only signed JS bundles are deployed.

**Client-Side Hardening**
- Disable WebView debugging in production builds.  
- Obfuscate JS code using Metro’s minification and optional code obfuscation tools.

---

## 6. Infrastructure & Configuration Management

**Supabase Configuration**
- Enable database audit logging for RLS denials and admin changes.  
- Rotate service role keys regularly; use short-lived API keys for edge functions.

**Production Environment Hardening**
- Disable Supabase project’s anonymous access; enforce authentication.  
- Use VPC peering (if applicable) to restrict database access to known services.

**CI/CD Pipeline Security**
- Enforce branch protection and required code reviews before merges.  
- Scan IaC (infrastructure as code) definitions for misconfigurations using tools like Terraform Sentinel or Checkov.

---

## 7. Dependency Management

- Pin all package versions in `yarn.lock` or `package-lock.json`; run monthly dependency vulnerability scans (Snyk, Dependabot).  
- Vet critical libraries (React Native Paper, Drizzle ORM) for active maintainers and CVE history.  
- Remove unused dependencies to reduce attack surface.

---

## 8. Testing & Validation

- Write unit tests for all service functions (Supabase and Drizzle) to verify RLS logic and data constraints.  
- Perform end-to-end tests (Detox or Maestro) to cover key flows: registration, login, adding members, and real-time updates.  
- Include security tests: verify unauthorized requests are blocked by RLS, test file upload size/type validation.

---

## Conclusion
By integrating these security guidelines into every layer—from React Native UI components to Supabase database policies—the KinLink app will achieve a strong security posture, protect user data and privacy, and provide a resilient platform for collaborative family tree editing. Continuous monitoring, regular audits, and proactive dependency management will ensure the app remains secure as it evolves.