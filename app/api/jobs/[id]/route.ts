
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> } // Standard Next.js params type
) {
    try {
        const { userId, orgId } = await auth();

        if (!userId || !orgId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id } = await params;

        const job = await prisma.job.findUnique({
            where: { id },
        });

        if (!job) {
            return NextResponse.json(
                { error: "Job not found" },
                { status: 404 }
            );
        }

        // Security Check: Job must belong to org
        if (job.orgId !== orgId) {
            return NextResponse.json(
                { error: "Unauthorized access to job" },
                { status: 403 }
            );
        }

        return NextResponse.json({
            id: job.id,
            status: job.status,
            progress: job.progress,
            error: job.error,
            // Return specific result fields if they exist
            result: job.result,
            createdAt: job.createdAt,
            completedAt: job.completedAt,
        });

    } catch (error) {
        console.error("[Job API] Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
