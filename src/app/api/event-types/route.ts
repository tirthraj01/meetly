import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { eventTypeSchema } from "@/lib/validations/event-type";

// ==========================================
// HELPER: Convert titles into URL slugs
// Example: "30-Min Strategy Call!" -> "30-min-strategy-call"
// ==========================================
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove all non-word characters (like !@#$%^&*)
    .replace(/[\s_-]+/g, "-")  // Replace spaces and underscores with a single hyphen
    .replace(/^-+|-+$/g, ""); // Trim leading or trailing hyphens
}

// =========================================================================
// GET /api/event-types -> Returns all event types belonging to the host
// =========================================================================
export async function GET() {
  try {
    // 1. Authenticate: check if user is logged in
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch records belonging ONLY to this user
    const eventTypes = await prisma.eventType.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(eventTypes);
  } catch (error) {
    console.error("GET /api/event-types error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// =========================================================================
// POST /api/event-types -> Create a new event type
// =========================================================================
export async function POST(req: Request) {
  try {
    // 1. Authenticate
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse request JSON body
    const json = await req.json();

    // 3. Validate with Zod
    const validatedData = eventTypeSchema.parse(json);

    // 4. Determine slug (use provided custom slug or auto-generate from title)
    const slug = validatedData.slug || slugify(validatedData.title);

    // 5. Check unique constraint: does this user already have an event with this slug?
    const existing = await prisma.eventType.findUnique({
      where: {
        userId_slug: {
          userId: session.user.id,
          slug: slug,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "You already have an event type with this URL slug." },
        { status: 409 } // 409 Conflict
      );
    }

    // 6. Save to Database
    const newEventType = await prisma.eventType.create({
      data: {
        userId: session.user.id,
        title: validatedData.title,
        description: validatedData.description,
        duration: validatedData.duration,
        slug: slug,
      },
    });

    return NextResponse.json(newEventType, { status: 201 }); // 201 Created
  } catch (error: any) {
    // If Zod caught invalid data, return 400 Bad Request with details
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("POST /api/event-types error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}