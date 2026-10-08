import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { updateAvailabilitySchema } from "@/lib/validations/availability";

/**
 * Handles GET requests to retrieve the authenticated user's availability schedule.
 */
export async function GET() {
  try {
    // 1. Authenticate the user session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch all availability records belonging to this user, sorted by day of the week
    const schedule = await prisma.availability.findMany({
      where: { userId: session.user.id },
      orderBy: { dayOfWeek: "asc" },
    });

    // 3. Return the retrieved schedule with a default 200 OK status
    return NextResponse.json(schedule);
  } catch (error) {
    // Log unexpected errors on the server side and return a generic 500 status
    console.error("GET /api/availability error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * Handles PUT requests to create or update the authenticated user's availability schedule.
 */
export async function PUT(req: Request) {
  try {
    // 1. Authenticate the user session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    
    // 2. Parse and validate the incoming request body against the Zod schema
    const json = await req.json();
    const days = updateAvailabilitySchema.parse(json);

    // 3. Map through the validated days to prepare an array of Prisma upsert operations
    // (Upsert will update the record if it exists, or create a new one if it doesn't)
    const operations = days.map((item) =>
      prisma.availability.upsert({
        where: {
          // Uses the unique compound index defined on userId and dayOfWeek
          userId_dayOfWeek: {
            userId,
            dayOfWeek: item.dayOfWeek,
          },
        },
        create: {
          userId,
          dayOfWeek: item.dayOfWeek,
          startTime: item.startTime,
          endTime: item.endTime,
          isActive: item.isActive,
        },
        update: {
          startTime: item.startTime,
          endTime: item.endTime,
          isActive: item.isActive,
        },
      })
    );

    // 4. Execute all upsert operations sequentially within a single database transaction
    // This ensures all updates succeed together, or none do (atomicity)
    const updatedSchedule = await prisma.$transaction(operations);

    // 5. Return the newly updated schedule data
    return NextResponse.json(updatedSchedule);
  } catch (error) {
    // Handle validation errors caught by Zod parsing
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    
    // Log other unexpected server-side errors
    console.error("PUT /api/availability error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
