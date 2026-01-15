import { getVentureSnapshot } from "@/lib/venture/getVentureSnapshot";

const VENTURE_ORDER = [
    "venture_intake",
    "venture_idea_validation",
    "venture_buyer_persona",
    "venture_business_plan",
] as const;

type VentureStageKey = (typeof VENTURE_ORDER)[number];

type NextStageResult = {
    nextStageKey?: VentureStageKey;
    done: boolean;
    doneApproved: boolean;
};

export async function getNextVentureStage(projectId: string): Promise<NextStageResult> {
    const snapshot = await getVentureSnapshot(projectId);
    const stages = snapshot.stages;

    const done = VENTURE_ORDER.every((key) => stages[key].approved || stages[key].hasOutput);
    const doneApproved = VENTURE_ORDER.every((key) => stages[key].approved);

    const nextStageKey = VENTURE_ORDER.find(
        (key) => !(stages[key].approved || stages[key].hasOutput)
    );

    return {
        nextStageKey,
        done,
        doneApproved,
    };
}
