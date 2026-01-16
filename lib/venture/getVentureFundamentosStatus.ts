import { getVentureSnapshot, type VentureSnapshot } from "@/lib/venture/getVentureSnapshot";

const VENTURE_ORDER = [
    "venture_intake",
    "venture_idea_validation",
    "venture_buyer_persona",
    "venture_business_plan",
] as const;

export type VentureFundamentosStatus = {
    done: boolean;
    approved: boolean;
};

export function getVentureFundamentosStatusFromSnapshot(
    snapshot: VentureSnapshot
): VentureFundamentosStatus {
    const done = VENTURE_ORDER.every(
        (key) => snapshot.stages[key].approved || snapshot.stages[key].hasOutput
    );
    const approved = VENTURE_ORDER.every((key) => snapshot.stages[key].approved);
    return { done, approved };
}

export async function getVentureFundamentosStatus(
    projectId: string
): Promise<VentureFundamentosStatus> {
    const snapshot = await getVentureSnapshot(projectId);
    return getVentureFundamentosStatusFromSnapshot(snapshot);
}
