import { prisma } from "@/lib/db";
import { type EffectiveConfig } from "@/lib/ai/config";
import { PRESET_MULTIPLIERS } from "@/lib/ai/model-registry";

export interface CreateVersionParams {
    outputId: string;
    content: any;
    provider: string;
    model: string;
    promptSetVersion: string;
    effectiveConfig: EffectiveConfig;
    userId: string;
    // Metadata
    latencyMs: number;
    tokensIn: number;
    tokensOut: number;
    totalTokens: number;
    validationError?: string | null;
}

export class OutputService {
    /**
     * Ensures an Output record exists for the given project/stage.
     */
    async ensureOutput(projectId: string, stageId: string, stageName: string, stageKey: string) {
        let output = await prisma.output.findFirst({
            where: {
                projectId,
                stageId,
            },
        });

        if (!output) {
            output = await prisma.output.create({
                data: {
                    projectId,
                    stageId,
                    name: `Output de ${stageName}`,
                    outputKey: `${stageKey}_output`,
                },
            });
        }

        return output;
    }

    /**
     * Creates a new version for an output with full tracking metadata.
     */
    async createVersion(params: CreateVersionParams) {
        const {
            outputId, content, provider, model, promptSetVersion,
            effectiveConfig, userId,
            latencyMs, tokensIn, tokensOut, totalTokens, validationError
        } = params;

        // Get next version number
        const latestVersion = await prisma.outputVersion.findFirst({
            where: { outputId },
            orderBy: { version: "desc" },
        });
        const newVersionNumber = (latestVersion?.version || 0) + 1;

        // Determine multiplier and cost
        const preset = effectiveConfig.preset || "fast"; // Default if missing
        const multiplier = PRESET_MULTIPLIERS[preset] || 1.0;
        const billedTokens = Math.ceil(totalTokens * multiplier);

        // Create output version
        const version = await prisma.outputVersion.create({
            data: {
                outputId,
                version: newVersionNumber,
                content: content,
                provider,
                model,
                promptSetVersion,
                generationParams: {
                    latencyMs,
                    tokensIn,
                    tokensOut,
                    totalTokens,
                    preset,
                    validated: !validationError,
                    validationError: validationError || undefined,
                    fallbackWarning: effectiveConfig.fallbackWarning,
                    // Billing info
                    multiplier,
                    billedTokens,
                },
                createdBy: userId,
                type: "GENERATED",
                status: validationError ? "GENERATED" : "GENERATED", // Could potentially use a different status for invalid outputs
            },
        });

        return version;
    }
}

export const outputService = new OutputService();
