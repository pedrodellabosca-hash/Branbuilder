/**
 * Stage Output Schemas
 * 
 * Zod validation schemas for each stage's expected output format.
 * Used to validate AI responses before saving to database.
 */

import { z } from "zod";

// =============================================================================
// STAGE KEYS
// =============================================================================

export const STAGE_KEYS = [
    "naming",
    "manifesto",
    "voice",
    "tagline",
    "palette",
    "typography",
    "logo",
    "visual_identity",
] as const;

export type StageKey = (typeof STAGE_KEYS)[number];

export function isValidStageKey(key: string): key is StageKey {
    return STAGE_KEYS.includes(key as StageKey);
}

// =============================================================================
// INDIVIDUAL STAGE SCHEMAS
// =============================================================================

/**
 * Naming stage output schema
 */
export const NamingOutputSchema = z.object({
    title: z.string().optional(),
    options: z.array(
        z.object({
            name: z.string(),
            rationale: z.string().optional(),
        })
    ).min(1),
    recommendation: z.string().optional(),
});

export type NamingOutput = z.infer<typeof NamingOutputSchema>;

/**
 * Manifesto stage output schema
 */
export const ManifestoOutputSchema = z.object({
    title: z.string().optional(),
    content: z.string(),
    values: z.array(z.string()).optional(),
    principles: z.array(z.string()).optional(),
});

export type ManifestoOutput = z.infer<typeof ManifestoOutputSchema>;

/**
 * Voice stage output schema
 */
export const VoiceOutputSchema = z.object({
    title: z.string().optional(),
    tone: z.string(),
    personality: z.string().optional(),
    dos: z.array(z.string()).optional(),
    donts: z.array(z.string()).optional(),
    examples: z.array(z.string()).optional(),
});

export type VoiceOutput = z.infer<typeof VoiceOutputSchema>;

/**
 * Tagline stage output schema
 */
export const TaglineOutputSchema = z.object({
    title: z.string().optional(),
    options: z.array(
        z.object({
            tagline: z.string(),
            rationale: z.string().optional(),
            useCase: z.string().optional(),
        })
    ).min(1),
    recommendation: z.string().optional(),
});

export type TaglineOutput = z.infer<typeof TaglineOutputSchema>;

/**
 * Passthrough schema for stages not yet modeled
 * TODO: Add proper schemas for palette, typography, logo, visual_identity
 */
export const PassthroughOutputSchema = z.any();

// =============================================================================
// SCHEMA REGISTRY
// =============================================================================

export const StageOutputSchemas: Record<StageKey, z.ZodSchema<unknown>> = {
    naming: NamingOutputSchema,
    manifesto: ManifestoOutputSchema,
    voice: VoiceOutputSchema,
    tagline: TaglineOutputSchema,
    // TODO: Add proper schemas for these stages
    palette: PassthroughOutputSchema,
    typography: PassthroughOutputSchema,
    logo: PassthroughOutputSchema,
    visual_identity: PassthroughOutputSchema,
};

/**
 * Get the Zod schema for a stage key
 */
export function getStageSchema(stageKey: string): z.ZodSchema<unknown> {
    if (isValidStageKey(stageKey)) {
        return StageOutputSchemas[stageKey];
    }
    return PassthroughOutputSchema;
}

/**
 * Validate output against stage schema
 */
export function validateStageOutput(
    stageKey: string,
    data: unknown
): { ok: true; data: unknown } | { ok: false; error: string } {
    const schema = getStageSchema(stageKey);
    const result = schema.safeParse(data);

    if (result.success) {
        return { ok: true, data: result.data };
    }

    return {
        ok: false,
        error: result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ")
    };
}
