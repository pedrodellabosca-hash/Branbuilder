
import { requireSuperAdmin } from "@/lib/admin/adminAuth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    const { error } = await requireSuperAdmin();
    if (error) return error;

    try {
        // 1. Check DB & Worker
        const workers = await (prisma as any).workerHeartbeat.findMany({
            orderBy: { lastSeenAt: 'desc' },
            take: 5
        });

        const activeWorkers = workers.filter((w: any) =>
            (new Date().getTime() - new Date(w.lastSeenAt).getTime()) < 30000
        );

        // 2. Queue Status
        const queueStats = await prisma.job.groupBy({
            by: ['status'],
            _count: { id: true },
            where: {
                status: { in: ['QUEUED', 'PROCESSING'] }
            }
        });

        const counts = queueStats.reduce((acc, curr) => {
            acc[curr.status] = curr._count.id;
            return acc;
        }, {} as Record<string, number>);

        // 3. AI Ping (Simulated internal check)
        const aiStatus = {
            provider: process.env.AI_PROVIDER || 'UNKNOWN',
            ready: !!process.env.OPENAI_API_KEY
        };

        return NextResponse.json({
            status: "ok",
            timestamp: new Date(),
            system: {
                workersOnline: activeWorkers.length,
                dbConnection: true,
                aiProvider: aiStatus
            },
            queue: {
                queued: counts.QUEUED || 0,
                processing: counts.PROCESSING || 0
            },
            recentWorkers: workers
        });

    } catch (err: any) {
        return NextResponse.json({
            status: "error",
            error: err.message
        }, { status: 500 });
    }
}
