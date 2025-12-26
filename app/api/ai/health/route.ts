
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    // 1. Check Provider
    const provider = process.env.AI_PROVIDER || "MOCK";

    // 2. If MOCK, always ready
    if (provider === "MOCK") {
        return NextResponse.json({
            provider: "MOCK",
            ready: true,
            error: null
        });
    }

    // 3. If OPENAI, check key
    if (provider === "OPENAI") {
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({
                provider: "OPENAI",
                ready: false,
                error: "OPENAI_API_KEY is missing"
            });
        }

        if (apiKey.startsWith("sk-placeholder") || apiKey === "sk-YOUR_OPENAI_KEY") {
            return NextResponse.json({
                provider: "OPENAI",
                ready: false,
                error: "OPENAI_API_KEY is set to default placeholder"
            });
        }

        // Basic format check
        if (!apiKey.startsWith("sk-")) {
            return NextResponse.json({
                provider: "OPENAI",
                ready: false,
                error: "Invalid OPENAI_API_KEY format (must start with sk-)"
            });
        }

        return NextResponse.json({
            provider: "OPENAI",
            ready: true,
            error: null
        });
    }

    // Unknown provider
    return NextResponse.json({
        provider,
        ready: false,
        error: "Unknown provider configuration"
    });
}
