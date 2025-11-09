import { z } from 'zod';

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password requirements
const passwordMinLength = 8;
const passwordMaxLength = 128;

// Form schemas
export const signInSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .regex(emailRegex, 'Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
});

export const signUpSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .regex(emailRegex, 'Please enter a valid email address'),
  password: z
    .string()
    .min(passwordMinLength, `Password must be at least ${passwordMinLength} characters long`)
    .max(passwordMaxLength, `Password cannot be more than ${passwordMaxLength} characters`)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
  displayName: z
    .string()
    .min(2, 'Display name must be at least 2 characters long')
    .max(50, 'Display name cannot be more than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Display name can only contain letters, spaces, hyphens, and apostrophes')
    .optional(),
  acceptTerms: z
    .boolean()
    .refine((val) => val === true, 'You must accept the terms and conditions'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .regex(emailRegex, 'Please enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(passwordMinLength, `Password must be at least ${passwordMinLength} characters long`)
    .max(passwordMaxLength, `Password cannot be more than ${passwordMaxLength} characters`)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Display name must be at least 2 characters long')
    .max(50, 'Display name cannot be more than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Display name can only contain letters, spaces, hyphens, and apostrophes')
    .optional(),
  email: z
    .string()
    .min(1, 'Email is required')
    .regex(emailRegex, 'Please enter a valid email address')
    .optional(),
});

// Type inference
export type SignInFormData = z.infer<typeof signInSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

// Validation helper functions
export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < passwordMinLength) {
    errors.push(`Password must be at least ${passwordMinLength} characters long`);
  }

  if (password.length > passwordMaxLength) {
    errors.push(`Password cannot be more than ${passwordMaxLength} characters`);
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateEmail = (email: string): boolean => {
  return emailRegex.test(email);
};

export const getPasswordStrength = (password: string): { score: number; feedback: string } => {
  let score = 0;
  const feedback: string[] = [];

  if (password.length >= 8) score += 1;
  else feedback.push('Add more characters');

  if (password.length >= 12) score += 1;
  else if (password.length >= 8) feedback.push('Consider adding more characters for stronger security');

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Add uppercase letters');

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Add lowercase letters');

  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('Add numbers');

  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  else feedback.push('Add special characters');

  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const strengthLabel = strengthLabels[Math.min(score, 5)];

  return {
    score: Math.min(score, 5),
    feedback: score < 3 ? feedback.join(', ') : strengthLabel,
  };
};