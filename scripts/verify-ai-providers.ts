
import dotenv from "dotenv";
import path from "path";
import { getAIProvider, resetAIProvider } from "../lib/ai";

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function main() {
    console.log("🤖 Verifying AI Providers...");

    // 1. Verify OpenAI
    console.log("\n--- Testing OpenAI Provider ---");
    resetAIProvider();

    const openai = getAIProvider("OPENAI");
    const openaiStatus = await openai.checkStatus();

    console.log(`Status: ${openaiStatus.ready ? "✅ Ready" : "❌ Not Ready"}`);
    if (openaiStatus.error) console.log(`Error: ${openaiStatus.error}`);

    if (openaiStatus.ready) {
        try {
            console.log("Generating completion...");
            const response = await openai.complete({
                messages: [{ role: "user", content: "Say 'OpenAI is working' in 3 words" }],
                maxTokens: 50,
                temperature: 0.7
            });
            console.log(`Output: "${response.content}" (Tokens: ${response.usage?.totalTokens})`);
        } catch (e: any) {
            console.error(`❌ OpenAI Generation Failed: ${e.message}`);
        }
    }

    // 2. Verify Anthropic
    console.log("\n--- Testing Anthropic Provider ---");
    resetAIProvider();

    const anthropic = getAIProvider("ANTHROPIC");
    const anthropicStatus = await anthropic.checkStatus();

    console.log(`Status: ${anthropicStatus.ready ? "✅ Ready" : "❌ Not Ready"}`);
    if (anthropicStatus.error) console.log(`Error: ${anthropicStatus.error}`);

    if (anthropicStatus.ready) {
        try {
            console.log("Generating completion...");
            const response = await anthropic.complete({
                messages: [{ role: "user", content: "Say 'Anthropic is working' in 3 words" }],
                maxTokens: 50,
                temperature: 0.7
            });
            console.log(`Output: "${response.content}" (Tokens: ${response.usage?.totalTokens})`);
        } catch (e: any) {
            console.error(`❌ Anthropic Generation Failed: ${e.message}`);
        }
    }

    console.log("\n✅ Verification Complete");
}

main();
