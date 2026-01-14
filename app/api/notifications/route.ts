
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { notificationService } from "@/lib/collaboration/NotificationService";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 50,
        });

        return NextResponse.json({ notifications });
    } catch (error) {
        console.error("[Notifications API] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { notificationId, markAll } = body;

        if (markAll) {
            await notificationService.markAllAsRead(userId);
            return NextResponse.json({ success: true });
        }

        if (notificationId) {
            await notificationService.markAsRead(notificationId, userId);
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Invalid Request" }, { status: 400 });
    } catch (error) {
        console.error("[Notifications API] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
