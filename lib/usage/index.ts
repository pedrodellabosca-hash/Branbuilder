/**
 * Token Usage Service
 * 
 * Handles all token budget checking, recording, and monthly resets.
 * 
 * Business Rules:
 * - All users can use all models (no plan restrictions on model access)
 * - Token limits apply per organization per month
 * - BASIC plan: fixed limit, must upgrade to MID/PRO when reached
 * - MID/PRO plans: can purchase token add-ons in 500k increments
 * - Reset cycle: 30 days from last reset
 */

import { prisma } from "@/lib/db";
import type { Plan } from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

export interface TokenBudget {
    allowed: boolean;
    remaining: number;
    limit: number;
    used: number;
    bonusTokens: number;
    canPurchaseMore: boolean;
    suggestUpgrade: boolean;
    resetDate: Date;
    daysUntilReset: number;
}

export interface UsageSummary {
    limit: number;
    used: number;
    remaining: number;
    bonusTokens: number;
    percentUsed: number;
    resetDate: Date;
    daysUntilReset: number;
    plan: Plan;
    canPurchaseMore: boolean;
}

export interface RecordUsageParams {
    orgId: string;
    projectId?: string;
    stageKey?: string;
    jobId?: string;
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
}

// Default limits by plan (used if PlanConfig not set in DB)
const DEFAULT_PLAN_LIMITS: Record<Plan, number> = {
    BASIC: 100000,
    MID: 500000,
    PRO: 2000000,
};

// Plans that can purchase additional tokens
const PURCHASABLE_PLANS: Plan[] = ["MID", "PRO"];

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Check if organization has budget for estimated tokens
 */
/**
 * Check if organization has budget for estimated tokens
 */
export async function checkTokenBudget(
    orgId: string,
    estimatedTokens: number
): Promise<TokenBudget> {
    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: {
            plan: true,
            monthlyTokenLimit: true,
            bonusTokens: true,
            monthlyTokensUsed: true,
            tokenResetDate: true,
        },
    });

    if (!org) {
        throw new Error("Organization not found");
    }

    // Check if we need to reset the counter (30 days cycle)
    await resetMonthlyUsageIfNeeded(orgId);

    // Refresh after potential reset
    const freshOrg = await prisma.organization.findUnique({
        where: { id: orgId },
        select: {
            monthlyTokenLimit: true,
            bonusTokens: true,
            monthlyTokensUsed: true,
            tokenResetDate: true,
            plan: true,
        },
    });

    if (!freshOrg) {
        throw new Error("Organization not found");
    }

    // Logic: Monthly quota first, then bonus tokens
    const monthlyRemaining = Math.max(0, freshOrg.monthlyTokenLimit - freshOrg.monthlyTokensUsed);
    const totalRemaining = monthlyRemaining + freshOrg.bonusTokens;

    // Check if allowed
    const allowed = totalRemaining >= estimatedTokens;
    const canPurchaseMore = PURCHASABLE_PLANS.includes(freshOrg.plan);
    const suggestUpgrade = !allowed && freshOrg.plan === "BASIC";

    const resetDate = new Date(freshOrg.tokenResetDate);
    resetDate.setDate(resetDate.getDate() + 30);
    const daysUntilReset = Math.max(
        0,
        Math.ceil((resetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    );

    return {
        allowed,
        remaining: totalRemaining,
        limit: freshOrg.monthlyTokenLimit + freshOrg.bonusTokens, // Total capacity
        used: freshOrg.monthlyTokensUsed, // Only tracks monthly quota usage
        bonusTokens: freshOrg.bonusTokens,
        canPurchaseMore,
        suggestUpgrade,
        resetDate,
        daysUntilReset,
    };
}

/**
 * Record actual token usage after AI call
 * Implements priority: Monthly Quota -> Bonus Tokens
 * Uses transaction to prevent race conditions
 */
export async function recordUsage(params: RecordUsageParams): Promise<void> {
    const { orgId, projectId, stageKey, jobId, provider, model, inputTokens, outputTokens } = params;
    const totalTokens = inputTokens + outputTokens;

    await prisma.$transaction(async (tx) => {
        // 1. Lock/Get Organization current state
        const org = await tx.organization.findUnique({
            where: { id: orgId },
            select: {
                monthlyTokenLimit: true,
                monthlyTokensUsed: true,
                bonusTokens: true,
            },
        });

        if (!org) {
            throw new Error(`Org ${orgId} not found while recording usage`);
        }

        // 2. Calculate consumption split
        const monthlyAvailable = Math.max(0, org.monthlyTokenLimit - org.monthlyTokensUsed);

        // Consume from monthly quota first
        const monthlyConsumption = Math.min(totalTokens, monthlyAvailable);

        // Consume remainder from bonus
        const bonusConsumption = Math.max(0, totalTokens - monthlyConsumption);

        // 3. Atomic update
        await tx.organization.update({
            where: { id: orgId },
            data: {
                monthlyTokensUsed: {
                    increment: monthlyConsumption,
                },
                bonusTokens: {
                    decrement: bonusConsumption,
                },
            },
        });

        // 4. Create usage record
        await tx.usage.create({
            data: {
                orgId,
                projectId,
                stageKey,
                jobId,
                provider,
                model,
                inputTokens,
                outputTokens,
                totalTokens,
            },
        });

        console.log(
            `[Usage] Recorded ${totalTokens} tokens for org ${orgId} (Monthly: ${monthlyConsumption}, Bonus: ${bonusConsumption})`
        );
    });
}

/**
 * Get usage summary for display
 */
export async function getUsageSummary(orgId: string): Promise<UsageSummary> {
    // Check for reset first
    await resetMonthlyUsageIfNeeded(orgId);

    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: {
            plan: true,
            monthlyTokenLimit: true,
            bonusTokens: true,
            monthlyTokensUsed: true,
            tokenResetDate: true,
        },
    });

    if (!org) {
        throw new Error("Organization not found");
    }

    const monthlyRemaining = Math.max(0, org.monthlyTokenLimit - org.monthlyTokensUsed);
    const totalAvailable = monthlyRemaining + org.bonusTokens;
    const totalLimit = org.monthlyTokenLimit + org.bonusTokens; // Not strictly a "limit" as bonus varies, but helpful for UI bars

    // Percent used: (Total Limit - Total Available) / Total Limit
    // Or just based on monthly? Let's do Monthly Usage % for the main bar usually
    // But user requested "Este ciclo: X, Extra: Y, Total: Z"
    // We send raw data and let UI handle display

    const resetDate = new Date(org.tokenResetDate);
    resetDate.setDate(resetDate.getDate() + 30);
    const daysUntilReset = Math.max(
        0,
        Math.ceil((resetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    );

    return {
        limit: org.monthlyTokenLimit, // Base monthly limit
        used: org.monthlyTokensUsed,  // Monthly used
        remaining: totalAvailable,    // Total available (Monthly + Bonus)
        bonusTokens: org.bonusTokens,
        percentUsed: org.monthlyTokenLimit > 0 ? (org.monthlyTokensUsed / org.monthlyTokenLimit) * 100 : 0,
        resetDate,
        daysUntilReset,
        plan: org.plan,
        canPurchaseMore: PURCHASABLE_PLANS.includes(org.plan),
    };
}

/**
 * Reset monthly usage if 30 days have passed
 */
export async function resetMonthlyUsageIfNeeded(orgId: string): Promise<boolean> {
    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: {
            tokenResetDate: true,
        },
    });

    if (!org) return false;

    const resetDate = new Date(org.tokenResetDate);
    const now = new Date();

    // Calculate difference in milliseconds
    const diffTime = Math.abs(now.getTime() - resetDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Check if 30 days passed since last reset date
    // Note: We compare against resetDate directly
    if (now >= resetDate && diffDays >= 30) {
        // Calculate new reset date: old reset date + 30 days
        // This keeps the cycle consistent even if the job runs late
        const newResetDate = new Date(resetDate);
        newResetDate.setDate(newResetDate.getDate() + 30);

        // If new reset date is still in the past (e.g. inactive for months), set to now
        const effectiveResetDate = newResetDate > now ? newResetDate : now;

        await prisma.organization.update({
            where: { id: orgId },
            data: {
                monthlyTokensUsed: 0,
                tokenResetDate: effectiveResetDate,
                // Bonus tokens are NOT reset, they carry over
            },
        });
        console.log(`[Usage] Reset monthly usage for org ${orgId}`);
        return true;
    }

    return false;
}

/**
 * Add bonus tokens (for purchases)
 */
export async function addBonusTokens(
    orgId: string,
    tokens: number
): Promise<{ newTotal: number }> {
    const org = await prisma.organization.update({
        where: { id: orgId },
        data: {
            bonusTokens: {
                increment: tokens,
            },
        },
        select: {
            bonusTokens: true,
        },
    });

    console.log(`[Usage] Added ${tokens} bonus tokens to org ${orgId}`);
    return { newTotal: org.bonusTokens };
}

/**
 * Set plan token limit (for admin)
 */
export async function setOrganizationTokenLimit(
    orgId: string,
    limit: number
): Promise<void> {
    await prisma.organization.update({
        where: { id: orgId },
        data: {
            monthlyTokenLimit: limit,
        },
    });
}

/**
 * Get estimated tokens for a stage (rough estimation)
 */
export function estimateTokensForStage(stageKey: string): number {
    // Rough estimates based on typical stage complexity
    const estimates: Record<string, number> = {
        naming: 1500,
        manifesto: 2500,
        voice: 2000,
        tagline: 1500,
        palette: 1000,
        typography: 1000,
        logo: 500,
        visual_identity: 3000,
    };

    return estimates[stageKey] || 2000;
}
