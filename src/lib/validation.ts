import { z } from 'zod';

export const AllowedCategories = [
  'Food', 'Rent', 'EMI', 'Travel', 'Utilities', 'Shopping', 
  'Entertainment', 'Healthcare', 'Education', 'Salary', 
  'Investment', 'Miscellaneous'
] as const;

export type CategoryType = typeof AllowedCategories[number];

/**
 * Zod Schema for Manual Expense Entry Validation
 */
export const ExpenseInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' }),
  description: z.string().trim().min(1, 'Description is required').max(200, 'Description cannot exceed 200 characters'),
  amount: z.number({ invalid_type_error: 'Amount must be a valid number' })
    .positive('Amount must be greater than zero')
    .max(10000000, 'Amount cannot exceed ₹1,00,00,000'),
  category: z.enum(AllowedCategories, { invalid_type_error: 'Invalid category selected' })
});

export type ExpenseInput = z.infer<typeof ExpenseInputSchema>;

/**
 * Zod Schema for Financial Chat Queries
 */
export const RelevantChunkValidationSchema = z.object({
  text: z.string().trim().min(1, 'Chunk text cannot be empty'),
  metadata: z.object({
    date: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    amount: z.number().optional().nullable(),
    fileName: z.string().optional().nullable()
  }).optional().nullable()
});

export const ChatQueryInputSchema = z.object({
  userQuery: z.string().trim().min(1, 'Query cannot be empty').max(1000, 'Query cannot exceed 1,000 characters'),
  relevantChunks: z.array(RelevantChunkValidationSchema).max(50, 'Cannot process more than 50 context chunks'),
  plannerContext: z.object({
    monthlyIncome: z.number().optional().nullable(),
    monthlyExpenses: z.number().optional().nullable(),
    monthlySurplus: z.number().optional().nullable(),
    plannedSavings: z.number().optional().nullable(),
    acceptedTargets: z.record(z.string(), z.number()).optional().nullable(),
    goals: z.array(z.object({
      name: z.string(),
      targetAmount: z.number(),
      currentSaved: z.number(),
      targetDate: z.string(),
    })).optional().nullable(),
  }).optional().nullable()
});

export type ChatQueryInput = z.infer<typeof ChatQueryInputSchema>;

/**
 * Zod Schema for File Upload Validation
 */
export const FileUploadValidationSchema = z.object({
  filename: z.string().trim().min(1, 'Filename required'),
  fileSize: z.number().positive('File cannot be empty').max(10 * 1024 * 1024, 'File size must be under 10MB'),
  fileType: z.enum(['csv', 'pdf'], { invalid_type_error: 'Only CSV and PDF files are allowed' })
});

/**
 * Zod Schema for Custom Budget Settings
 */
export const BudgetSettingsSchema = z.record(
  z.enum(AllowedCategories),
  z.number().min(0, 'Budget limit must be non-negative').max(10000000, 'Budget limit too high')
);

/**
 * Zod Schema for Savings Goal Planner
 */
export const SavingsGoalInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'Goal name is required').max(80, 'Goal name cannot exceed 80 characters'),
  targetAmount: z.number({ invalid_type_error: 'Target amount must be a number' })
    .positive('Target amount must be greater than zero')
    .max(100000000, 'Target amount cannot exceed ₹10,00,00,000'),
  currentSaved: z.number({ invalid_type_error: 'Saved amount must be a number' })
    .min(0, 'Current saved amount cannot be negative')
    .max(100000000, 'Saved amount cannot exceed ₹10,00,00,000'),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Target date must be in YYYY-MM-DD format' }),
});

export type SavingsGoalInput = z.infer<typeof SavingsGoalInputSchema>;

/**
 * Zod Schema for Savings Target (Category reduction)
 */
export const SavingsTargetInputSchema = z.object({
  category: z.string().trim().min(1, 'Category is required'),
  monthlyReduction: z.number({ invalid_type_error: 'Monthly reduction must be a number' })
    .min(0, 'Monthly reduction cannot be negative')
    .max(10000000, 'Monthly reduction cannot exceed ₹1,00,00,000'),
  status: z.enum(['pending', 'accepted', 'dismissed']),
});

export type SavingsTargetInput = z.infer<typeof SavingsTargetInputSchema>;

/**
 * Zod Schema for User Monthly Income Setup
 */
export const UserIncomeInputSchema = z.object({
  monthlyIncome: z.number({ invalid_type_error: 'Monthly income must be a valid number' })
    .positive('Monthly income must be greater than zero')
    .max(100000000, 'Monthly income cannot exceed ₹10,00,00,000'),
});

export type UserIncomeInput = z.infer<typeof UserIncomeInputSchema>;

/**
 * Zod Schema for Investment Calculator Scenario Inputs
 */
export const InvestmentCalculatorInputSchema = z.object({
  initialLumpsum: z.number().min(0).max(100000000).default(0),
  monthlySIP: z.number().min(0).max(10000000).default(5000),
  durationYears: z.number().min(1).max(40).default(5),
  returnRate: z.number().min(0).max(100).default(12),
});

export type InvestmentCalculatorInput = z.infer<typeof InvestmentCalculatorInputSchema>;

/**
 * Zod Schema for Document Parsing Results
 */
export const DocumentParsedContentSchema = z.object({
  documentId: z.string().min(1),
  filename: z.string().min(1),
  fileType: z.enum(['CSV', 'PDF']),
  chunksCount: z.number().int().nonnegative(),
  isEncrypted: z.boolean().optional(),
  totalAmount: z.number().optional()
});

export type DocumentParsedContent = z.infer<typeof DocumentParsedContentSchema>;
