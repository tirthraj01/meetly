import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { updateAvailabilitySchema } from "@/lib/validations/availability";


export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const schedule = await prisma.availability.findMany({
      where: { userId: session.user.id },
      orderBy: { dayOfWeek: "asc" },
    });

    return NextResponse.json(schedule);
  } catch (error) {
    console.error("GET /api/availability error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const json = await req.json();
    const days = updateAvailabilitySchema.parse(json);

    const operations = days.map((item) =>
      prisma.availability.upsert({
        where: {
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

    const updatedSchedule = await prisma.$transaction(operations);

    return NextResponse.json(updatedSchedule);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("PUT /api/availability error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}