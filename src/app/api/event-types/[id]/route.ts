import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { eventTypeSchema } from "@/lib/validations/event-type";


interface RouteParams {
  params: Promise<{ id: string }>;
}


export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const json = await req.json();
    const validatedData = eventTypeSchema.partial().parse(json);

    const existing = await prisma.eventType.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Event type not found" }, { status: 404 });
    }

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
          { status: 409 }
        );
      }
    }

    const updated = await prisma.eventType.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("PUT /api/event-types/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.eventType.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Event type not found" }, { status: 404 });
    }

    await prisma.eventType.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Event type deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/event-types/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}