import { moduleEngine } from "@/lib/modules/ModuleEngine";

async function main() {
    console.log("🔍 Verifying Module Engine...");

    const dummyParams = {
        projectId: "proj_dummy_123", // Non-existent
        stageKey: "naming",
        userId: "user_dummy_123",
        orgId: "org_dummy_123",
    };

    try {
        console.log("🚀 Invoking moduleEngine.runStage()...");
        const result = await moduleEngine.runStage(dummyParams);

        console.log("✅ Result received:", result);

        if (result.status === "FAILED" && (result.error?.includes("Organization") || result.error?.includes("Project"))) {
            console.log("✅ SUCCESS: Engine delegated to runner (Runner rejected invalid ID as expected).");
            console.log("Engine Context:", result.engineContext);
        } else {
            console.warn("⚠️ Unexpected result:", result);
        }

    } catch (err) {
        console.log("❌ Unexpected internal error:", err);
    }
}

main();
