import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/groups - Get all groups (public) or user's groups
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter"); // "my" | "public" | "all"
    const search = searchParams.get("search");

    let whereClause: any = {};

    if (filter === "my") {
      // Get groups user is a member of
      whereClause.members = {
        some: {
          userId: session.user.id,
        },
      };
    } else if (filter === "public") {
      // Get public groups
      whereClause.isPrivate = false;
    } else {
      // Get all accessible groups (public + user's private groups)
      whereClause.OR = [
        { isPrivate: false },
        {
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
      ];
    }

    // Add search filter
    if (search) {
      whereClause.AND = [
        {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        },
      ];
    }

    const groups = await prisma.group.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        description: true,
        image: true,
        isPrivate: true,
        members: {
          where: { userId: session.user.id },
          select: { role: true },
          take: 1,
        },
        _count: {
          select: {
            members: true,
            messages: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 50,
    });

    const response = NextResponse.json(groups);
    response.headers.set('Cache-Control', 's-maxage=5, stale-while-revalidate=15');
    return response;
  } catch (error) {
    console.error("Error fetching groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch groups" },
      { status: 500 }
    );
  }
}

// POST /api/groups - Create a new group
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, image, isPrivate, maxMembers } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Group name is required" },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: "Group name must be less than 100 characters" },
        { status: 400 }
      );
    }

    // Create group with creator as first member
    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        image: image || null,
        isPrivate: isPrivate || false,
        maxMembers: maxMembers || 100,
        creatorId: session.user.id,
        members: {
          create: {
            userId: session.user.id,
            role: "creator",
          },
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
            messages: true,
          },
        },
      },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error("Error creating group:", error);
    return NextResponse.json(
      { error: "Failed to create group" },
      { status: 500 }
    );
  }
}
