
"use client";

import { AlertCircle, Zap, Shield, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface TokenLimitErrorPayload {
    canPurchaseMore: boolean;
    suggestUpgrade: boolean;
    remainingTokens: number;
    estimatedTokens: number;
    reset: {
        date: string; // ISO string from JSON
        daysRemaining: number;
    };
}

interface TokenLimitBannerProps {
    error: TokenLimitErrorPayload;
    onPurchaseAddon?: () => Promise<void>;
}

export function TokenLimitBanner({ error, onPurchaseAddon }: TokenLimitBannerProps) {
    const router = useRouter();
    const [isPurchasing, setIsPurchasing] = useState(false);

    const handlePurchase = async () => {
        if (!onPurchaseAddon) return;

        setIsPurchasing(true);
        try {
            await onPurchaseAddon();
            // Parent normally handles refresh, but we can do it here too just in case
            router.refresh();
        } finally {
            setIsPurchasing(false);
        }
    };

    return (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
                <div className="p-2 bg-red-500/20 rounded-md shrink-0">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-white">Límite de Tokens Alcanzado</h3>
                    <p className="text-xs text-slate-300 mt-1">
                        Esta operación requiere aproximadamente <span className="text-white font-medium">{error.estimatedTokens?.toLocaleString()}</span> tokens,
                        pero solo tienes <span className="text-red-400 font-medium">{error.remainingTokens?.toLocaleString()}</span> disponibles.
                    </p>

                    {error.reset && (
                        <p className="text-xs text-slate-400 mt-1">
                            Tu cuota se reinicia en {error.reset.daysRemaining} días.
                        </p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 pl-[3.25rem]">
                {error.canPurchaseMore ? (
                    <button
                        onClick={handlePurchase}
                        disabled={isPurchasing}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-2 rounded-md transition-colors disabled:opacity-50"
                    >
                        {isPurchasing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                        {isPurchasing ? "Procesando..." : "Comprar 500k Tokens ($10)"}
                    </button>
                ) : (
                    <button
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-2 rounded-md transition-colors"
                        onClick={() => alert("Upgrade flow not implemented yet")}
                    >
                        <Shield className="w-3 h-3" />
                        Upgrade Plan
                    </button>
                )}
            </div>
        </div>
    );
}
