import { z } from "zod";

// 1. Define the schema rulebook
export const eventTypeSchema = z.object({
  // Title must be a string between 1 and 100 characters.
  title: z
    .string()
    .min(1, "Title is required")
    .max(100, "Title must be 100 characters or less"),

  // Description is optional, but if provided, must not exceed 500 characters.
  description: z.string().max(500, "Description must be 500 characters or less").optional(),

  // Duration must be an integer (e.g. 15, 30, 60) and strictly greater than 0.
  duration: z
    .number()
    .int("Duration must be a whole number of minutes")
    .positive("Duration must be greater than 0"),

  // Slug is optional. If the user provides a custom one, it must match this regex:
  // only lowercase letters, digits, and hyphens. No spaces, no uppercase, no symbols.
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens")
    .optional(),
});

// 2. Automatically derive the TypeScript type from the Zod schema
export type EventTypeInput = z.infer<typeof eventTypeSchema>;