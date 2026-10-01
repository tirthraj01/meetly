import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { eventTypeSchema } from "@/lib/validations/event-type";


function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json();
    const validatedData = eventTypeSchema.parse(json);

    const slug = validatedData.slug || slugify(validatedData.title);

    const existing = await prisma.eventType.findUnique({
      where: {
        userId_slug: {
          userId: session.user.id,
          slug,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "You already have an event type with this URL slug." },
        { status: 409 }
      );
    }

    const newEventType = await prisma.eventType.create({
      data: {
        userId: session.user.id,
        title: validatedData.title,
        description: validatedData.description,
        duration: validatedData.duration,
        slug,
      },
    });

    return NextResponse.json(newEventType, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("POST /api/event-types error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}