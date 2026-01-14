
import { NextResponse } from "next/server";

export interface TokenLimitErrorPayload {
    error: "TOKEN_LIMIT_REACHED";
    message: string;
    plan: "BASIC" | "MID" | "PRO";
    canPurchaseMore: boolean;
    suggestUpgrade: boolean;
    remainingTokens: number;
    estimatedTokens: number;
    reset: {
        date: Date;
        daysRemaining: number;
    };
}

export function createTokenLimitResponse(data: Omit<TokenLimitErrorPayload, "error" | "message">) {
    const payload: TokenLimitErrorPayload = {
        error: "TOKEN_LIMIT_REACHED",
        message: "Organization token budget exceeded",
        ...data
    };

    return NextResponse.json(payload, { status: 402 });
}
