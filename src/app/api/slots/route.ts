import { NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/slots";
import { prisma } from "@/lib/prisma";

// =========================================================================
// GET /api/slots?username=john&eventSlug=30-min&date=2026-10-05&timezone=Asia/Kolkata
// =========================================================================
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const username = searchParams.get("username");
    const eventSlug = searchParams.get("eventSlug");
    const date = searchParams.get("date"); // Expected format: YYYY-MM-DD
    const timezone = searchParams.get("timezone") || "UTC";

    // 1. Validate incoming query parameters
    if (!username || !eventSlug || !date) {
      return NextResponse.json(
        { error: "Missing required query parameters: username, eventSlug, date" },
        { status: 400 }
      );
    }

    // 2. Lookup Host and Event Type by username + slug
    const eventType = await prisma.eventType.findFirst({
      where: {
        slug: eventSlug,
        isActive: true,
        user: { username },
      },
      include: {
        user: true,
      },
    });

    if (!eventType) {
      return NextResponse.json(
        { error: "Event type or user not found" },
        { status: 404 }
      );
    }

    // 3. Compute available slots via our core engine
    const slots = await getAvailableSlots({
      dateString: date,
      hostId: eventType.userId,
      duration: eventType.duration,
      guestTimezone: timezone,
    });

    return NextResponse.json({ slots });
  } catch (error) {
    console.error("GET /api/slots error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}