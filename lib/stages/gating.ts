import { type StageKey } from "./schemas";

export const STAGE_DEPENDENCIES: Record<string, StageKey[]> = {
    venture_idea_validation: ["venture_intake"],
    venture_buyer_persona: ["venture_idea_validation"],
    venture_business_plan: ["venture_buyer_persona"],
};

export function getMissingDependencies(stageKey: StageKey, completedStages: StageKey[]): StageKey[] {
    const deps = STAGE_DEPENDENCIES[stageKey] || [];
    return deps.filter((dep) => !completedStages.includes(dep));
}
