import { z } from 'zod';

export const mobileSchema = z.string().regex(/^\d{10}$/, 'validation.invalidMobile');

export const registrationSchema = z
  .object({
    name: z.string().min(1, 'validation.required'),
    mobile: mobileSchema,
    altMobile: z.string().regex(/^\d{10}$/, 'validation.invalidMobile').optional().or(z.literal('')),
    email: z.string().email('validation.invalidEmail'),
    password: z.string().min(6, 'validation.passwordTooShort'),
    confirmPassword: z.string().min(1, 'validation.required'),
    district: z.string().min(1, 'validation.required'),
    city: z.string().min(1, 'validation.required'),
    address: z.string().min(1, 'validation.required'),
    occupation: z
      .string()
      .trim()
      .min(1, 'validation.required'),
    aadhaarNumber: z
      .string()
      .min(1, 'validation.required')
      .regex(/^\d{12}$/, 'validation.invalidAadhaar'),
    panNumber: z.preprocess(
      (val) => String(val ?? '').toUpperCase().replace(/[^A-Z0-9]/g, ''),
      z.string().min(1, 'validation.required').regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'validation.invalidPan')
    ),
    role: z.enum(['customer', 'agent', 'sales_member']).default('customer'),
    agentCategoryId: z.union([z.string(), z.number()]).optional().or(z.literal('')),
    preferredPropertyType: z.string().optional().or(z.literal('')),
    referralAgentCode: z.string().optional().or(z.literal('')),
    roleDetail: z.string().optional().or(z.literal('')),
    acceptTerms: z.literal(true, { errorMap: () => ({ message: 'validation.mustAcceptTerms' }) }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'validation.passwordMismatch',
    path: ['confirmPassword'],
  })
  .refine((data) => data.role !== 'customer' || Boolean(String(data.preferredPropertyType || '').trim()), {
    message: 'validation.required',
    path: ['preferredPropertyType'],
  });

export const otpSchema = z.object({
  otp: z.string().regex(/^\d{4,6}$/, 'auth.error.invalidOtp'),
});
