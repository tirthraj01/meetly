import { z } from "zod";

export const createBookingSchema = z.object({
  // 1. The ID of the meeting type being booked
  eventTypeId: z.string().min(1, "Event type ID is required"),

  // 2. Guest personal information
  guestName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long"),

  guestEmail: z
    .string()
    .email("Please provide a valid email address"),

  // 3. Optional notes or agenda from the guest
  guestNotes: z
    .string()
    .max(1000, "Notes cannot exceed 1000 characters")
    .optional(),

  // 4. ISO-8601 UTC string (e.g. "2026-10-05T03:30:00.000Z")
  startTime: z
    .string()
    .datetime("startTime must be a valid ISO-8601 UTC string"),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;