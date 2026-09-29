import { z } from "zod";
import { DayOfWeek } from "@prisma/client";

// Regex explaining: Two digits for hours (00-23) + colon + two digits for minutes (00-59)
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const availabilityItemSchema = z
  .object({
    // Must be one of the enum values defined in Prisma (MONDAY, TUESDAY...)
    dayOfWeek: z.nativeEnum(DayOfWeek),

    // Must be valid 24-hour time strings like "09:00" or "17:30"
    startTime: z.string().regex(timeRegex, "Invalid startTime format (expected HH:mm)"),
    endTime: z.string().regex(timeRegex, "Invalid endTime format (expected HH:mm)"),

    // Flag indicating if the host is available on this day
    isActive: z.boolean(),
  })
  // Custom business logic refinement
  .refine(
    (data) => {
      // If the host is taking this day off (isActive = false), the time range doesn't matter.
      if (!data.isActive) return true;
      // In 24-hr time strings ("09:00" vs "17:00"), alphabetical string comparison
      // matches chronological order: "09:00" < "17:00" evaluates to true.
      return data.startTime < data.endTime;
    },
    {
      message: "startTime must be earlier than endTime",
      path: ["endTime"], // Shows the error directly under the endTime field
    }
  );

// The client updates the entire week at once as an array of 7 items
export const updateAvailabilitySchema = z.array(availabilityItemSchema);