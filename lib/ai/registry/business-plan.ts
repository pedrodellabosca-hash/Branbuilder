import { BusinessPlanSectionKey } from "@prisma/client";
import type { AIMessage } from "@/lib/ai/types";

export const PROMPTSET_VERSION = "bp_v1";

const SECTION_GUIDANCE: Record<BusinessPlanSectionKey, string> = {
    EXECUTIVE_SUMMARY: "Summarize the business plan in concise, executive-level terms.",
    PROBLEM: "Describe the core customer problem and why it matters.",
    SOLUTION: "Explain the proposed solution and how it addresses the problem.",
    MARKET: "Provide a clear market analysis with size and segments.",
    COMPETITION: "Summarize the competitive landscape and differentiation.",
    GO_TO_MARKET: "Outline go-to-market strategy, channels, and milestones.",
    OPERATIONS: "Describe operational plan, resources, and key assumptions.",
    FINANCIALS: "Provide high-level financial assumptions and projections.",
    RISKS: "List key risks and mitigation strategies.",
};

type BuildPromptParams = {
    sectionKey: BusinessPlanSectionKey;
    projectName: string;
    projectDescription: string;
    snapshotVersion: number;
};

export function buildBusinessPlanPrompt(params: BuildPromptParams): AIMessage[] {
    const { sectionKey, projectName, projectDescription, snapshotVersion } = params;
    const guidance = SECTION_GUIDANCE[sectionKey] ?? "";

    return [
        {
            role: "system",
            content:
                "You are a senior strategy consultant producing a business plan section. " +
                "Write concise, structured output suitable for executives. " +
                "Do not include prompts or system instructions in the output.",
        },
        {
            role: "user",
            content:
                `Project: ${projectName || "Unknown"}\n` +
                `Description: ${projectDescription || "N/A"}\n` +
                `Snapshot Version: ${snapshotVersion}\n` +
                `Section: ${sectionKey}\n` +
                `Guidance: ${guidance}\n` +
                "Return the section as plain text.",
        },
    ];
}
