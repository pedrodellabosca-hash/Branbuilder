import { getVentureSnapshot, type VentureSnapshot } from "@/lib/venture/getVentureSnapshot";
import { getVentureFundamentosStatusFromSnapshot } from "@/lib/venture/getVentureFundamentosStatus";

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

export async function getNextVentureStage(
    projectId: string,
    snapshot?: VentureSnapshot
): Promise<NextStageResult> {
    const resolvedSnapshot = snapshot ?? (await getVentureSnapshot(projectId));
    const stages = resolvedSnapshot.stages;

    const status = getVentureFundamentosStatusFromSnapshot(resolvedSnapshot);

    const nextStageKey = VENTURE_ORDER.find(
        (key) => !(stages[key].approved || stages[key].hasOutput)
    );

    return {
        nextStageKey,
        done: status.done,
        doneApproved: status.approved,
    };
}
