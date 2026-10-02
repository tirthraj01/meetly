import { prisma } from "@/lib/prisma";
import { 
  addMinutes, 
  parseISO, 
  format, 
  isBefore, 
  isAfter, 
  getDay 
} from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { DayOfWeek } from "@prisma/client";

// =========================================================================
// 1. HELPER: Map JS Day (0=Sun, 1=Mon... 6=Sat) to Prisma's DayOfWeek Enum
// =========================================================================
export const DAYS_OF_WEEK_MAP: DayOfWeek[] = [
  "SUNDAY",    // index 0
  "MONDAY",    // index 1
  "TUESDAY",   // index 2
  "WEDNESDAY", // index 3
  "THURSDAY",  // index 4
  "FRIDAY",    // index 5
  "SATURDAY",  // index 6
];

// =========================================================================
// 2. TYPES / CONTRACTS
// =========================================================================
export interface Slot {
  startTime: string;   // ISO-8601 UTC string (e.g. "2026-10-05T03:30:00.000Z")
  endTime: string;     // ISO-8601 UTC string (e.g. "2026-10-05T04:00:00.000Z")
  displayTime: string; // Formatted in guest's local time (e.g. "09:00 AM")
}

export interface GetSlotsOptions {
  dateString: string;     // Format: "YYYY-MM-DD"
  hostId: string;         // Host's user ID
  duration: number;       // Meeting duration in minutes (e.g. 15, 30, 60)
  guestTimezone: string;  // e.g. "Asia/Kolkata", "America/New_York"
  hostTimezone?: string;  // Default: host's timezone ("Asia/Kolkata")
}

// =========================================================================
// 3. THE CORE ENGINE: getAvailableSlots
// =========================================================================
export async function getAvailableSlots({
  dateString,
  hostId,
  duration,
  guestTimezone,
  hostTimezone = "Asia/Kolkata",
}: GetSlotsOptions): Promise<Slot[]> {

  // STEP 1: Determine what day of the week this date is
  const requestedDate = parseISO(dateString);
  const dayIndex = getDay(requestedDate); // 0 (Sunday) to 6 (Saturday)
  const dayOfWeekEnum = DAYS_OF_WEEK_MAP[dayIndex];

  // STEP 2: Fetch the host's configured availability for this day of the week
  const availability = await prisma.availability.findUnique({
    where: {
      userId_dayOfWeek: {
        userId: hostId,
        dayOfWeek: dayOfWeekEnum,
      },
    },
  });

  // If host didn't set availability for this day or marked it inactive -> 0 slots
  if (!availability || !availability.isActive) {
    return [];
  }

  // STEP 3: Anchor host's local working hours to concrete UTC timestamps
  // e.g. "2026-10-05T09:00:00" in "Asia/Kolkata" -> converted into a UTC Date
  const startLocalString = `${dateString}T${availability.startTime}:00`;
  const endLocalString = `${dateString}T${availability.endTime}:00`;

  const workDayStartUTC = fromZonedTime(startLocalString, hostTimezone);
  const workDayEndUTC = fromZonedTime(endLocalString, hostTimezone);

  // STEP 4: Fetch all existing confirmed bookings that overlap with this workday window
  const existingBookings = await prisma.booking.findMany({
    where: {
      eventType: { userId: hostId },
      status: "CONFIRMED",
      startTime: { lt: workDayEndUTC },
      endTime: { gt: workDayStartUTC },
    },
    select: {
      startTime: true,
      endTime: true,
    },
  });

  // STEP 5: Slicing loop - cut the workday into duration chunks and check collisions
  const availableSlots: Slot[] = [];
  const now = new Date(); // To prevent offering slots in the past

  let currentSlotStart = workDayStartUTC;

  while (true) {
    const currentSlotEnd = addMinutes(currentSlotStart, duration);

    // If the next slot extends past the end of the working day, stop looping
    if (isAfter(currentSlotEnd, workDayEndUTC)) {
      break;
    }

    // Check A: Is this slot in the past?
    const isPast = isBefore(currentSlotStart, now);

    // Check B: Does this slot collide with any existing booking?
    // Mathematical overlap formula: (SlotStart < BookingEnd) AND (SlotEnd > BookingStart)
    const hasConflict = existingBookings.some((booking) => {
      return (
        isBefore(currentSlotStart, booking.endTime) &&
        isAfter(currentSlotEnd, booking.startTime)
      );
    });

    // If it's valid and unbooked, keep it!
    if (!isPast && !hasConflict) {
      // Convert the slot start into the guest's local timezone for visual display
      const guestZonedStart = toZonedTime(currentSlotStart, guestTimezone);

      availableSlots.push({
        startTime: currentSlotStart.toISOString(),
        endTime: currentSlotEnd.toISOString(),
        displayTime: format(guestZonedStart, "hh:mm a"),
      });
    }

    // Move to next slot
    currentSlotStart = currentSlotEnd;
  }

  return availableSlots;
}