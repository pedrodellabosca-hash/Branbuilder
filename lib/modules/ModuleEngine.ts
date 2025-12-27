import { runStage, type RunStageParams, type RunStageResult } from "@/lib/stages/runStage";
import { type PresetLevel } from "@/lib/ai/presets";

/**
 * EngineRunParams definition matching standard runStage needs
 * plus any engine-specific context we might need later.
 */
export interface EngineRunParams {
    projectId: string;
    stageKey: string;
    userId: string;
    orgId: string;
    regenerate?: boolean;
    config?: {
        preset?: PresetLevel;
        provider?: string;
        model?: string;
        temperature?: number;
    };
}

/**
 * Standardized result from the engine.
 * Currently mirrors RunStageResult but allows for extension.
 */
export interface EngineRunResult extends RunStageResult {
    // Add any engine-specific metadata here in the future
    engineContext?: {
        module: "A" | "B";
        workflowVersion: string;
    };
}

export class ModuleEngine {
    /**
     * Main entry point to run a stage through the engine.
     * Orchestrates the context resolution and delegates to the appropriate runner.
     */
    async runStage(params: EngineRunParams): Promise<EngineRunResult> {
        const { projectId, stageKey, userId, orgId, regenerate, config } = params;

        console.log(`[ModuleEngine] Running stage ${stageKey} for project ${projectId}`);

        // 1. Resolve Context (Placeholder for future workflow logic)
        // In the future, we might look up a WorkflowSet here to determine *which* prompt version to use
        // or if there are pre-conditions. For now, we rely on the standard "hardcoded" flow.
        const moduleType = this.resolveModule(stageKey);

        // 2. Delegate to AI Runner
        // tailoredParams maps the generic engine params to the specific runner params
        const runnerParams: RunStageParams = {
            projectId,
            stageKey,
            userId,
            orgId,
            regenerate,
            // Spread config (preset, provider, etc.)
            ...config,
        };

        try {
            // Execute
            const result = await runStage(runnerParams);

            // 3. Format Output
            // Attach engine metadata
            return {
                ...result,
                engineContext: {
                    module: moduleType,
                    workflowVersion: "standard-v1", // Hardcoded for now
                },
            };
        } catch (error) {
            console.error(`[ModuleEngine] Execution failed:`, error);
            // Return failure result matching the interface
            return {
                success: false,
                jobId: "",
                status: "FAILED",
                error: error instanceof Error ? error.message : "Unknown engine error",
            };
        }
    }

    /**
     * Helper to determine module from stageKey.
     * This mirrors the logic in runStage.ts for now.
     * TODO: Centralize this in a shared config or database lookup.
     */
    private resolveModule(stageKey: string): "A" | "B" {
        const moduleAMappings = ["context", "naming", "manifesto", "voice", "tagline"];
        const moduleBMappings = ["palette", "typography", "logo", "visual_identity"];

        if (moduleAMappings.includes(stageKey)) return "A";
        if (moduleBMappings.includes(stageKey)) return "B";

        // Default or unknown
        return "A";
    }
}

// Singleton instance for easy import
export const moduleEngine = new ModuleEngine();
