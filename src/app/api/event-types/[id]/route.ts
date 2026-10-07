import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { eventTypeSchema } from "@/lib/validations/event-type";

// Define the structure for route parameters where 'params' is an asynchronous Promise in Next.js App Router
interface RouteParams {
  params: Promise<{ id: string }>;
}

// =========================================================================
// PUT /api/event-types/[id] -> Updates an existing event type by ID
// =========================================================================
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    // 1. Authenticate: check if user session is valid and contains an ID
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Await the route parameters and parse the incoming request body
    const { id } = await params;
    const json = await req.json();
    
    // 3. Validate data using Zod schema, allowing partial updates (.partial())
    const validatedData = eventTypeSchema.partial().parse(json);

    // 4. Ensure the resource exists and belongs to the authenticated user
    const existing = await prisma.eventType.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Event type not found" }, { status: 404 });
    }

    // 5. If slug is being updated, verify that the new slug isn't already taken by this user
    if (validatedData.slug && validatedData.slug !== existing.slug) {
      const slugTaken = await prisma.eventType.findUnique({
        where: {
          userId_slug: {
            userId: session.user.id,
            slug: validatedData.slug,
          },
        },
      });

      if (slugTaken) {
        return NextResponse.json(
          { error: "This URL slug is already in use by another event." },
          { status: 409 } // 409 Conflict
        );
      }
    }

    // 6. Persist changes to the database
    const updated = await prisma.eventType.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    // Handle Zod validation issues by returning a 400 Bad Request status
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("PUT /api/event-types/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// =========================================================================
// DELETE /api/event-types/[id] -> Permanently deletes an event type by ID
// =========================================================================
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    // 1. Authenticate: check if user session is valid and contains an ID
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Await the route parameters to retrieve the specific record ID
    const { id } = await params;

    // 3. Verify the resource exists and belongs strictly to the authenticated user
    const existing = await prisma.eventType.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Event type not found" }, { status: 404 });
    }

    // 4. Remove the record from the database
    await prisma.eventType.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Event type deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/event-types/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
