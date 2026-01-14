
import { prisma } from '@/lib/db';

export class SubscriptionService {

    /**
     * Check if an organization has enough tokens for an operation
     * @throws Error if limit exceeded
     */
    static async checkUsage(orgId: string, estimatedTokens: number) {
        // Optimization: Fetch only necessary fields
        const org = await prisma.organization.findUnique({
            where: { id: orgId },
            select: {
                monthlyTokenLimit: true,
                monthlyTokensUsed: true,
                bonusTokens: true,
                plan: true
            }
        });

        if (!org) throw new Error("Organization not found");

        const available = org.monthlyTokenLimit + org.bonusTokens;
        const used = org.monthlyTokensUsed;
        const remaining = available - used;

        if (estimatedTokens > remaining) {
            throw new Error(`Usage limit exceeded. Required: ${estimatedTokens}, Remaining: ${remaining}. Please upgrade or purchase add-ons.`);
        }

        return { remaining, plan: org.plan };
    }

    /**
     * Record usage after a successful operation
     */
    static async recordUsage(orgId: string, tokensUsed: number, metadata: {
        projectId?: string,
        stageKey?: string,
        jobId?: string,
        provider: string,
        model: string
    }) {
        // 1. Update Org Counter
        await prisma.organization.update({
            where: { id: orgId },
            data: {
                monthlyTokensUsed: { increment: tokensUsed }
            }
        });

        // 2. Create Usage Record (Audit)
        await prisma.usage.create({
            data: {
                orgId,
                inputTokens: 0, // Simplified for now, total passed in tokensUsed
                outputTokens: tokensUsed,
                totalTokens: tokensUsed,
                provider: metadata.provider,
                model: metadata.model,
                projectId: metadata.projectId,
                stageKey: metadata.stageKey,
                jobId: metadata.jobId
            }
        });
    }
}
