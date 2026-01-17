/**
 * Prompt Registry
 * 
 * Central registry for all stage prompts.
 * Use getStagePrompt(stageKey) to get the appropriate prompt module.
 */

import type { StagePrompt } from "./types";
import { namingPrompt } from "./stages/naming";
import { manifestoPrompt } from "./stages/manifesto";
import { voicePrompt } from "./stages/voice";
import { taglinePrompt } from "./stages/tagline";
import { contextPrompt } from "./stages/context";
import { defaultPrompt } from "./stages/default";
import { ventureIntakePrompt } from "./stages/venture-intake";
import { ventureValidationPrompt } from "./stages/venture-validation";
import { venturePersonaPrompt } from "./stages/venture-persona";
import { venturePlanPrompt } from "./stages/venture-plan";

// Registry of all stage prompts
const promptRegistry: Record<string, StagePrompt> = {
    context: contextPrompt,
    naming: namingPrompt,
    manifesto: manifestoPrompt,
    voice: voicePrompt,
    tagline: taglinePrompt,
    venture_intake: ventureIntakePrompt,
    venture_idea_validation: ventureValidationPrompt,
    venture_buyer_persona: venturePersonaPrompt,
    venture_business_plan: venturePlanPrompt,
};

/**
 * Get the prompt module for a stage
 * Returns default prompt if stage has no specific prompt
 */
export function getStagePrompt(stageKey: string): StagePrompt {
    const prompt = promptRegistry[stageKey.toLowerCase()];

    if (prompt) {
        return prompt;
    }

    console.log(`[PromptRegistry] No specific prompt for "${stageKey}", using default`);
    return defaultPrompt;
}

/**
 * Check if a stage has a specific prompt
 */
export function hasStagePrompt(stageKey: string): boolean {
    return stageKey.toLowerCase() in promptRegistry;
}

/**
 * Get list of all registered stage keys
 */
export function getRegisteredStageKeys(): string[] {
    return Object.keys(promptRegistry);
}

// Re-export types
export type { StagePrompt, PromptContext, ParseResult } from "./types";
