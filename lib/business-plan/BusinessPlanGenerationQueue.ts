import { prisma } from "@/lib/db";

export class BusinessPlanGenerationRateLimitError extends Error {
    code = "BUSINESS_PLAN_RATE_LIMIT" as const;
}

export class BusinessPlanGenerationLockError extends Error {
    code = "BUSINESS_PLAN_LOCKED" as const;
}

type EnqueueParams = {
    orgId: string;
    projectId: string;
    requestedBy: string;
};

type AdvisoryLockResult = { locked: boolean };

export async function enqueueBusinessPlanGenerationJob(params: EnqueueParams) {
    const { orgId, projectId, requestedBy } = params;
    const maxGenerations = Number(process.env.BUSINESS_PLAN_GENERATE_LIMIT || "3");
    const windowMinutes = Number(process.env.BUSINESS_PLAN_GENERATE_WINDOW_MINUTES || "60");
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

    return prisma.$transaction(async (tx) => {
        const lockRows = await tx.$queryRaw<AdvisoryLockResult[]>`
            SELECT pg_try_advisory_lock(hashtext(${orgId}), hashtext(${projectId})) AS locked
        `;
        const locked = lockRows[0]?.locked === true;

        if (!locked) {
            throw new BusinessPlanGenerationLockError("Generation already in progress");
        }

        try {
            const activeJob = await tx.job.findFirst({
                where: {
                    orgId,
                    projectId,
                    type: "BUSINESS_PLAN_GENERATE",
                    status: { in: ["QUEUED", "PROCESSING"] },
                },
                select: { id: true },
            });

            if (activeJob) {
                throw new BusinessPlanGenerationLockError("Generation already in progress");
            }

            const recentCount = await tx.job.count({
                where: {
                    orgId,
                    projectId,
                    type: "BUSINESS_PLAN_GENERATE",
                    status: { in: ["DONE", "FAILED"] },
                    createdAt: { gte: windowStart },
                },
            });

            if (recentCount >= maxGenerations) {
                throw new BusinessPlanGenerationRateLimitError("Rate limit exceeded");
            }

            const job = await tx.job.create({
                data: {
                    orgId,
                    projectId,
                    type: "BUSINESS_PLAN_GENERATE",
                    payload: { requestedBy },
                },
            });

            return job;
        } finally {
            await tx.$queryRaw<{ unlocked: boolean }[]>`
                SELECT (pg_advisory_unlock(hashtext(${orgId}), hashtext(${projectId})))::bool AS unlocked
            `;
        }
    });
}
