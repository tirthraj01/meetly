import { z } from "zod";
import { DayOfWeek } from "@prisma/client";


const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; // Validates HH:mm format


export const availabilityItemSchema = z
  .object({
    dayOfWeek: z.nativeEnum(DayOfWeek),
    startTime: z.string().regex(timeRegex, "Invalid startTime format (expected HH:mm)"),
    endTime: z.string().regex(timeRegex, "Invalid endTime format (expected HH:mm)"),
    isActive: z.boolean(),
  })
  .refine(
    (data) => {
      if (!data.isActive) return true;
      return data.startTime < data.endTime;
    },
    {
      message: "startTime must be earlier than endTime",
      path: ["endTime"],
    }
  );

export const updateAvailabilitySchema = z.array(availabilityItemSchema);