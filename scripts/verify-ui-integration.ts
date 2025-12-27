
import { moduleEngine } from "@/lib/modules/ModuleEngine";

async function main() {
    console.log("Testing Module Engine Integration...");

    // Simulate a request parameters
    const params = {
        projectId: "test-project-id", // Use a valid ID from your DB if needed, or mock
        stageKey: "naming",
        userId: "user_123",
        orgId: "org_123",
        regenerate: true,
        config: {
            preset: "balanced"
        }
    };

    try {
        // We can't really run this without a real DB connection and valid IDs unless we mock database calls.
        // However, we can at least check if the function executes and hits the first DB check.
        // If it fails with "Project not found", that confirms the engine delegated correctly to runStage.

        console.log("Calling moduleEngine.runStage...");
        // This is expected to fail with "Organization not found" or "Project not found" since we used fake IDs,
        // but that proves the delegation worked.
        const result = await moduleEngine.runStage(params as any);

        console.log("Result:", result);
    } catch (error) {
        console.error("Execution error:", error);
    }
}

main().catch(console.error);
