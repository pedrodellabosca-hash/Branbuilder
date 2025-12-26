
import { getModelsResponse, getDefaultsByPreset } from "../lib/ai/model-registry";

async function main() {
    console.log("🚀 Testing Model Registry...");

    const response = await getModelsResponse();
    console.log(`Active Provider: ${response.activeProvider}`);
    console.log(`Total Models: ${response.models.length}`);

    // Verify key models exist
    const signatures = [
        "gpt-4o",
        "gpt-4o-mini",
        "claude-3-5-sonnet-latest"
    ];

    const missing = signatures.filter(id => !response.models.find(m => m.id === id));
    if (missing.length > 0) {
        console.error("❌ Missing models:", missing);
        process.exit(1);
    }
    console.log("✅ New models found.");

    // Verify Defaults
    const defaults = getDefaultsByPreset();
    console.log("Defaults:", JSON.stringify(defaults, null, 2));

    if (defaults.fast.model !== "gpt-4o-mini") {
        console.error("❌ Fast preset incorrect:", defaults.fast.model);
        process.exit(1);
    }
    if (defaults.balanced.model !== "gpt-4o") {
        console.error("❌ Balanced preset incorrect:", defaults.balanced.model);
        process.exit(1);
    }
    if (defaults.quality.model !== "gpt-4o") {
        console.error("❌ Quality preset incorrect:", defaults.quality.model);
        process.exit(1);
    }

    console.log("✅ Registry Verification Passed.");
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
