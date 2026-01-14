import fs from "fs";
import path from "path";

const promptFiles = [
    "lib/prompts/stages/venture-intake.ts",
    "lib/prompts/stages/venture-validation.ts",
    "lib/prompts/stages/venture-persona.ts",
    "lib/prompts/stages/venture-plan.ts",
];

function requireFiles(): void {
    const missing = promptFiles.filter((file) => !fs.existsSync(path.resolve(process.cwd(), file)));
    if (missing.length > 0) {
        console.error("❌ Venture prompt wrappers missing:");
        for (const file of missing) {
            console.error(`- ${file}`);
        }
        process.exit(1);
    }
}

async function main() {
    console.log("🧪 Venture Prompt Verification");
    requireFiles();

    const {
        ventureIntakePrompt
    } = await import("../lib/prompts/stages/venture-intake");
    const {
        ventureValidationPrompt
    } = await import("../lib/prompts/stages/venture-validation");
    const {
        venturePersonaPrompt
    } = await import("../lib/prompts/stages/venture-persona");
    const {
        venturePlanPrompt
    } = await import("../lib/prompts/stages/venture-plan");

    const prompts = [
        { prompt: ventureIntakePrompt, signature: "AGENTE DE INTAKE PLANLY" },
        { prompt: ventureValidationPrompt, signature: "BUSINESS VIABILITY ARCHITECT V3.2" },
        { prompt: venturePersonaPrompt, signature: "HUNTER V3" },
        { prompt: venturePlanPrompt, signature: "UNIFIED BUSINESS ARCHITECT" },
    ];

    for (const entry of prompts) {
        const messages = entry.prompt.buildMessages({
            stageName: "Venture",
            stageKey: entry.prompt.stageKey,
            isRegenerate: false,
            projectName: "Venture Test",
        });
        const system = messages.find((m) => m.role === "system")?.content || "";
        if (!system.includes(entry.signature)) {
            console.error(`❌ Missing signature for ${entry.prompt.id}: ${entry.signature}`);
            process.exit(1);
        }
    }

    console.log("✅ Venture prompt signatures loaded.");
}

main().catch((error) => {
    console.error("❌ Venture prompt verification failed:", error);
    process.exit(1);
});
