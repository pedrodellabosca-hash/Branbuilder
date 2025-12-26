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

    const totalLimit = freshOrg.monthlyTokenLimit + freshOrg.bonusTokens;
    const remaining = totalLimit - freshOrg.monthlyTokensUsed;
    const allowed = remaining >= estimatedTokens;
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
        remaining: Math.max(0, remaining),
        limit: totalLimit,
        used: freshOrg.monthlyTokensUsed,
        bonusTokens: freshOrg.bonusTokens,
        canPurchaseMore,
        suggestUpgrade,
        resetDate,
        daysUntilReset,
    };
}

/**
 * Record actual token usage after AI call
 */
export async function recordUsage(params: RecordUsageParams): Promise<void> {
    const { orgId, projectId, stageKey, jobId, provider, model, inputTokens, outputTokens } = params;
    const totalTokens = inputTokens + outputTokens;

    // Create usage record
    await prisma.usage.create({
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
            // Cost estimation can be added later based on admin pricing
        },
    });

    // Increment monthly usage counter
    await prisma.organization.update({
        where: { id: orgId },
        data: {
            monthlyTokensUsed: {
                increment: totalTokens,
            },
        },
    });

    console.log(
        `[Usage] Recorded ${totalTokens} tokens for org ${orgId} (${provider}/${model})`
    );
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

    const totalLimit = org.monthlyTokenLimit + org.bonusTokens;
    const remaining = Math.max(0, totalLimit - org.monthlyTokensUsed);
    const percentUsed = totalLimit > 0 ? (org.monthlyTokensUsed / totalLimit) * 100 : 0;

    const resetDate = new Date(org.tokenResetDate);
    resetDate.setDate(resetDate.getDate() + 30);
    const daysUntilReset = Math.max(
        0,
        Math.ceil((resetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    );

    return {
        limit: totalLimit,
        used: org.monthlyTokensUsed,
        remaining,
        bonusTokens: org.bonusTokens,
        percentUsed: Math.min(100, percentUsed),
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
            monthlyTokensUsed: true,
        },
    });

    if (!org) return false;

    const daysSinceReset = Math.floor(
        (Date.now() - org.tokenResetDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceReset >= 30) {
        await prisma.organization.update({
            where: { id: orgId },
            data: {
                monthlyTokensUsed: 0,
                tokenResetDate: new Date(),
                // Keep bonusTokens - they don't reset
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
