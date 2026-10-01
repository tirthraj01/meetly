import { z } from "zod";


export const eventTypeSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(100, "Title must be 100 characters or less"),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional(),
  duration: z
    .number()
    .int("Duration must be an integer")
    .positive("Duration must be greater than 0"),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens")
    .optional(),
});

export type EventTypeInput = z.infer<typeof eventTypeSchema>;