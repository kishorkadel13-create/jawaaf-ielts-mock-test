import { z } from 'zod';

// Mock Test Schema
export const mockTestSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long'),
  description: z.string().optional(),
  is_demo: z.boolean().default(false),
  is_published: z.boolean().default(false),
  duration: z.number().int().min(1, 'Duration must be at least 1 minute'),
  section_template: z.enum([
    'full_mock',
    'reading',
    'reading_passage_1',
    'reading_passage_2',
    'reading_passage_3',
    'listening',
    'writing',
    'writing_task_1',
    'writing_task_2'
  ]).optional(),
});

// Test Section Schema
export const testSectionSchema = z.object({
  mock_test_id: z.string().uuid('Invalid Mock Test ID'),
  type: z.preprocess(
    value => typeof value === 'string' ? value.trim().toLowerCase() : value,
    z.enum(['reading', 'listening', 'writing'])
  ),
  title: z.string().min(2, 'Title must be at least 2 characters long'),
  duration: z.coerce.number().int().optional(),
  order_no: z.coerce.number().int().min(1),
});

// Question Group Schema
export const questionGroupSchema = z.object({
  section_id: z.string().uuid('Invalid Section ID'),
  title: z.string().min(2, 'Title must be at least 2 characters long'),
  instruction: z.string().optional().default(''),
  passage: z.string().optional(),
  audio_url: z.string().url('Invalid Audio URL').optional().or(z.literal('')),
  image_url: z.string().url('Invalid Image URL').optional().or(z.literal('')),
  order_no: z.number().int().min(1),
});

// Question Schema
export const questionSchema = z.object({
  group_id: z.string().uuid('Invalid Group ID'),
  question_type: z.enum([
    'INPUT_TEXT',
    'DROPDOWN_SELECT',
    'TRUE_FALSE_NOT_GIVEN',
    'YES_NO_NOT_GIVEN',
    'SINGLE_MCQ',
    'MATCHING',
    'MULTI_SELECT',
    'WRITING_TASK'
  ]),
  question_number: z.number().int().min(1),
  question_text: z.string().min(1, 'Question text is required'),
  instruction: z.string().optional(),
  options_json: z.array(z.any()).optional(),
  correct_answers_json: z.array(z.any()).optional().default([]),
  extra_data_json: z.record(z.any()).optional(),
  marks: z.number().int().default(1),
  order_no: z.number().int().min(1),
});

// Access Request Schema
export const accessRequestStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']),
});

// Attempt Answer Schema (for individual updates/saves)
export const attemptAnswerSchema = z.object({
  question_id: z.string().uuid('Invalid Question ID'),
  answer: z.any(),
});

// Save Attempts Payload Schema (list of answers)
export const saveAttemptPayloadSchema = z.object({
  answers: z.array(attemptAnswerSchema)
});
