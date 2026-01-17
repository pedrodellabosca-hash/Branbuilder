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
    "venture_intake",
    "venture_idea_validation",
    "venture_buyer_persona",
    "venture_business_plan",
    "context",
    "naming",
    "manifesto",
    "voice",
    "tagline",
    "palette",
    "typography",
    "logo",
    "visual_identity",
] as const;

// ... (schema registry updates below) ...
// (I will do a separate replace for the STAGE_KEYS array to avoid context drift, 
// wait, I can do it here if I am careful. But the file is long. I'll split schema vs keys.)


export type StageKey = (typeof STAGE_KEYS)[number];

export function isValidStageKey(key: string): key is StageKey {
    return STAGE_KEYS.includes(key as StageKey);
}

// =============================================================================
// INDIVIDUAL STAGE SCHEMAS
// =============================================================================

/**
 * Context stage output schema
 */
export const ContextOutputSchema = z.object({
    marketSummary: z.string(),
    targetAudience: z.object({
        demographics: z.string(),
        psychographics: z.string(),
        painPoints: z.array(z.string()),
        needs: z.array(z.string()),
    }),
    competitorAnalysis: z.object({
        direct: z.array(z.string()),
        indirect: z.array(z.string()),
        differentiation: z.string(),
    }),
    positioningStatement: z.string(),
});

export type ContextOutput = z.infer<typeof ContextOutputSchema>;

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
 * Venture Intake schema
 */
export const VentureIntakeSchema = z.object({
    business_idea: z.string().min(1),
    target_market: z.object({
        segment: z.string().optional(),
        geography: z.string().optional(),
        demographics: z.string().optional(),
        psychographics: z.string().optional(),
        pain_points: z.array(z.string()).optional(),
        needs: z.array(z.string()).optional(),
    }).optional(),
    product_service: z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        differentiation: z.string().optional(),
    }).optional(),
    pricing_model: z.object({
        type: z.string().optional(),
        price_range: z.string().optional(),
    }).optional(),
    competitive_advantage: z.string().optional(),
    channels: z.array(z.string()).optional(),
    traction: z.object({
        users: z.string().optional(),
        revenue: z.string().optional(),
        proof: z.string().optional(),
    }).optional(),
    founders: z.array(z.object({
        name: z.string().optional(),
        role: z.string().optional(),
        background: z.string().optional(),
    })).optional(),
    constraints: z.array(z.string()).optional(),
    goals: z.array(z.string()).optional(),
});

export type VentureIntakeOutput = z.infer<typeof VentureIntakeSchema>;

/**
 * Venture Validation schema
 */
export const VentureValidationSchema = z.object({
    summary: z.string().min(1),
    market_size: z.object({
        tam: z.string().optional(),
        sam: z.string().optional(),
        som: z.string().optional(),
    }).optional(),
    competition: z.array(z.string()).optional(),
    risks: z.array(z.string()).optional(),
    assumptions: z.array(z.string()).optional(),
    recommendation: z.string().optional(),
    viability_score: z.number().min(0).max(10).optional(),
});

export type VentureValidationOutput = z.infer<typeof VentureValidationSchema>;

/**
 * Venture Persona schema
 */
export const VenturePersonaSchema = z.object({
    personas: z.array(z.object({
        name: z.string(),
        role: z.string().optional(),
        goals: z.array(z.string()).optional(),
        pains: z.array(z.string()).optional(),
        behaviors: z.array(z.string()).optional(),
        motivations: z.array(z.string()).optional(),
    })).min(1),
    notes: z.string().optional(),
});

export type VenturePersonaOutput = z.infer<typeof VenturePersonaSchema>;

/**
 * Venture Plan schema
 */
export const VenturePlanSchema = z.object({
    executive_summary: z.string().min(1),
    problem: z.string().optional(),
    solution: z.string().optional(),
    market: z.string().optional(),
    business_model: z.string().optional(),
    go_to_market: z.string().optional(),
    operations: z.string().optional(),
    financials: z.string().optional(),
    milestones: z.array(z.string()).optional(),
    risks: z.array(z.string()).optional(),
});

export type VenturePlanOutput = z.infer<typeof VenturePlanSchema>;

/**
 * Passthrough schema for stages not yet modeled
 * TODO: Add proper schemas for palette, typography, logo, visual_identity
 */
export const PassthroughOutputSchema = z.any();

// =============================================================================
// SCHEMA REGISTRY
// =============================================================================

export const StageOutputSchemas: Record<StageKey, z.ZodSchema<unknown>> = {
    venture_intake: VentureIntakeSchema,
    venture_idea_validation: VentureValidationSchema,
    venture_buyer_persona: VenturePersonaSchema,
    venture_business_plan: VenturePlanSchema,
    context: ContextOutputSchema,
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
