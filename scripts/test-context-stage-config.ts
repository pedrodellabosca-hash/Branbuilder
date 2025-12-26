// @ts-nocheck
import { getStagePrompt } from "../lib/prompts";
import { resolveEffectiveConfig } from "../lib/ai/resolve-config";
import { validateStageOutput } from "../lib/stages/schemas";

async function main() {
    console.log("🚀 Testing Context Stage Configuration...");

    const stageKey = "context";

    // 1. Test Prompt Retrieval
    try {
        const prompt = getStagePrompt(stageKey);
        if (prompt.id.startsWith("context")) {
            console.log(`✅ Prompt found: ${prompt.id} v${prompt.version}`);
        } else {
            console.error(`❌ Prompt mismatch. Expected context, got ${prompt.id}`);
            process.exit(1);
        }
    } catch (e) {
        console.error("❌ Failed to get prompt:", e);
        process.exit(1);
    }

    // 2. Test Configuration Resolution
    try {
        const config = resolveEffectiveConfig({
            stageKey,
            preset: "balanced",
            provider: "OPENAI", // Optional overrides
        });

        console.log(`✅ Config resolved: Preset=${config.preset}, MaxTokens=${config.resolvedMaxTokens}, Estimated=${config.estimatedTokens}`);

        if (config.estimatedTokens > 0) {
            console.log("✅ Token estimation working.");
        } else {
            console.error("❌ Token estimation failed/zero.");
            process.exit(1);
        }
    } catch (e) {
        console.error("❌ Failed to resolve config:", e);
        process.exit(1);
    }

    // 3. Test Output Validation
    const validOutput = {
        marketSummary: "Market is growing.",
        targetAudience: {
            demographics: "Gen Z",
            psychographics: "Tech savvy",
            painPoints: ["Price", "Speed"],
            needs: ["Quality"]
        },
        competitorAnalysis: {
            direct: ["Comp A"],
            indirect: ["Comp B"],
            differentiation: "Better UI"
        },
        positioningStatement: "We are the best."
    };

    const validation = validateStageOutput(stageKey, validOutput);
    if (validation.ok) {
        console.log("✅ Validation passed for valid output.");
    } else {
        console.error("❌ Validation failed for valid output:", validation.error);
        process.exit(1);
    }

    console.log("✨ Context Stage Verification Complete!");
}

main();
