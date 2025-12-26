
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Load .env
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    console.error("❌ Error: .env file not found. Please copy .env.example to .env");
    process.exit(1);
}

async function main() {
    console.log("🔍 Verifying OpenAI Configuration...");

    // 1. Check AI_PROVIDER
    const provider = process.env.AI_PROVIDER;
    console.log(`\n• AI_PROVIDER: ${provider || "Not set (defaults to MOCK)"}`);

    if (provider !== "OPENAI") {
        console.warn("⚠️ Warning: AI_PROVIDER is not set to 'OPENAI'. Current mode: " + (provider || "MOCK"));
        console.warn("  To enable OpenAI, set AI_PROVIDER=OPENAI in your .env file.");
    }

    // 2. Check API Key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.error("❌ Error: OPENAI_API_KEY is missing in .env");
        process.exit(1);
    }

    if (apiKey === "sk-YOUR_OPENAI_KEY") {
        console.error("❌ Error: OPENAI_API_KEY is set to the default placeholder. Please add your real key.");
        process.exit(1);
    }

    if (!apiKey.startsWith("sk-")) {
        console.warn("⚠️ Warning: OPENAI_API_KEY does not start with 'sk-'. It might be invalid.");
    } else {
        const masked = apiKey.substring(0, 3) + "..." + apiKey.substring(apiKey.length - 4);
        console.log(`• OPENAI_API_KEY: Present (${masked})`);
    }

    // 3. Test Connection (Accessing local API if running, or calling OpenAI directly if not)
    // For simplicity validation, we'll try a direct fetch to the endpoint if user wants, 
    // but better to check if we can make a simple request to OpenAI models endpoint.
    // However, since we want to avoid external deps here if possible, let's just check the Local API status.

    console.log("\n📡 Checking System Connectivity...");

    try {
        const port = process.env.PORT || 3000;
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`;
        const healthUrl = `${baseUrl}/api/models`;

        console.log(`  Fetching ${healthUrl}...`);

        const response = await fetch(healthUrl);
        if (response.ok) {
            const data = await response.json();
            const openaiModels = data.models?.filter((m: any) => m.provider === "OPENAI");

            console.log("✅ API Connectivity: OK");
            console.log(`• Available OpenAI Models: ${openaiModels?.length || 0}`);

            if (provider === "OPENAI" && (!openaiModels || openaiModels.length === 0)) {
                console.warn("⚠️ Warning: Provider is OPENAI but no models returned. Check API Key validity.");
            } else if (openaiModels && openaiModels.length > 0) {
                console.log("✨ SUCCESS: OpenAI appears to be configured and reachable via local API.");
            }

        } else {
            console.warn(`⚠️ API Warning: Could not reach ${healthUrl} (Status: ${response.status}). Is the dev server running?`);
            console.log("  (Run 'npm run dev' in another terminal to verify full end-to-end)");
        }
    } catch (e) {
        console.warn("⚠️ connectivity check skipped: Dev server not running or unreachable.");
        console.log("  (Run 'npm run dev' to verify end-to-end integration)");
    }
}

main().catch(console.error);
