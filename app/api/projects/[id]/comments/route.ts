
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { commentService } from "@/lib/collaboration/CommentService";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: projectId } = await params;
        const { searchParams } = new URL(request.url);
        const stageId = searchParams.get("stageId");

        const threads = await commentService.getThreads(projectId, stageId || undefined);

        return NextResponse.json({ threads });
    } catch (error) {
        console.error("[Comments API] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId, sessionClaims } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Safely extract email from session claims (Clerk specific)
        const authorEmail = (sessionClaims?.email as string) || "unknown@user.com";

        const { id: projectId } = await params;
        const body = await request.json();
        const { content, parentId, stageId } = body;

        if (!content) {
            return NextResponse.json({ error: "Content is required" }, { status: 400 });
        }

        const comment = await commentService.createComment({
            projectId,
            stageId,
            parentId,
            content,
            authorId: userId,
            authorEmail,
        });

        return NextResponse.json({ comment });
    } catch (error) {
        console.error("[Comments API] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
