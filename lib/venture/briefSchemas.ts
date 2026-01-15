import { z } from "zod";

export const VentureIntakeBriefSchema = z.object({
    problem: z.string().optional(),
    targetMarket: z.string().optional(),
    productService: z.string().optional(),
    constraints: z.string().optional(),
});

export const VentureValidationBriefSchema = z.object({
    hypotheses: z.string().optional(),
    competitors: z.string().optional(),
    channels: z.string().optional(),
    pricingAssumptions: z.string().optional(),
});

export const VenturePersonaBriefSchema = z.object({
    personaSummary: z.string().optional(),
    pains: z.string().optional(),
    desires: z.string().optional(),
    objections: z.string().optional(),
});

export const VenturePlanBriefSchema = z.object({
    objective: z.string().optional(),
    revenueModel: z.string().optional(),
    goToMarket: z.string().optional(),
    opsAssumptions: z.string().optional(),
});

export const VentureBriefSchemas = {
    venture_intake: VentureIntakeBriefSchema,
    venture_idea_validation: VentureValidationBriefSchema,
    venture_buyer_persona: VenturePersonaBriefSchema,
    venture_business_plan: VenturePlanBriefSchema,
};

export type VentureBriefByStage = {
    venture_intake: z.infer<typeof VentureIntakeBriefSchema>;
    venture_idea_validation: z.infer<typeof VentureValidationBriefSchema>;
    venture_buyer_persona: z.infer<typeof VenturePersonaBriefSchema>;
    venture_business_plan: z.infer<typeof VenturePlanBriefSchema>;
};

export function getVentureBriefSchema(stageKey: string) {
    return VentureBriefSchemas[stageKey as keyof typeof VentureBriefSchemas] ?? null;
}
