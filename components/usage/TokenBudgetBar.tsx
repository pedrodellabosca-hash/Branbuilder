"use client";

import { useEffect, useState } from "react";

interface UsageData {
    tokens: {
        used: number;
        limit: number;
        remaining: number;
        bonus: number;
        percentUsed: number;
    };
    reset: {
        date: string;
        daysRemaining: number;
    };
    plan: string;
    canPurchaseMore: boolean;
}

interface TokenBudgetProps {
    compact?: boolean;
    className?: string;
}

export function TokenBudgetBar({ compact = false, className = "" }: TokenBudgetProps) {
    const [usage, setUsage] = useState<UsageData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchUsage() {
            try {
                const res = await fetch("/api/usage");
                if (res.ok) {
                    const data = await res.json();
                    setUsage(data);
                }
            } catch (error) {
                console.error("Failed to fetch usage:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchUsage();
    }, []);

    if (loading) {
        return (
            <div className={`animate-pulse bg-zinc-800 rounded-lg h-8 ${className}`} />
        );
    }

    if (!usage) {
        return null;
    }

    const { tokens, reset, plan, canPurchaseMore } = usage;
    const progressColor =
        tokens.percentUsed >= 90 ? "bg-red-500" :
            tokens.percentUsed >= 70 ? "bg-yellow-500" :
                "bg-emerald-500";

    const formatNumber = (n: number) => {
        if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
        if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
        return n.toString();
    };

    if (compact) {
        return (
            <div className={`flex items-center gap-2 text-sm ${className}`}>
                <div className="w-20 h-2 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full ${progressColor} transition-all`}
                        style={{ width: `${Math.min(100, tokens.percentUsed)}%` }}
                    />
                </div>
                <span className="text-zinc-400 whitespace-nowrap">
                    {formatNumber(tokens.remaining)} tokens
                </span>
            </div>
        );
    }

    return (
        <div className={`bg-zinc-900 border border-zinc-800 rounded-xl p-4 ${className}`}>
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-zinc-300">Token Usage</h3>
                <span className="text-xs text-zinc-500 uppercase px-2 py-0.5 rounded bg-zinc-800">{plan} PLAN</span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden mb-3 relative">
                <div
                    className={`h-full ${progressColor} transition-all duration-500`}
                    style={{ width: `${Math.min(100, tokens.percentUsed)}%` }}
                />
            </div>

            {/* Stats Breakdown */}
            <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                <div className="p-2 rounded bg-zinc-800/50 border border-zinc-800/50">
                    <div className="text-zinc-500 mb-0.5">Este ciclo</div>
                    <div className="font-medium text-zinc-300">
                        {formatNumber(tokens.used)} <span className="text-zinc-600">/ {formatNumber(tokens.limit)}</span>
                    </div>
                </div>
                <div className="p-2 rounded bg-zinc-800/50 border border-zinc-800/50">
                    <div className="text-zinc-500 mb-0.5">Extra (Bonus)</div>
                    <div className="font-medium text-emerald-400">
                        +{formatNumber(tokens.bonus)}
                    </div>
                </div>
                <div className="p-2 rounded bg-zinc-800/50 border border-zinc-800/50">
                    <div className="text-zinc-500 mb-0.5">Total Disp.</div>
                    <div className="font-medium text-white">
                        {formatNumber(tokens.remaining)}
                    </div>
                </div>
            </div>

            {/* Reset info */}
            <div className="pt-2 border-t border-zinc-800 flex justify-between items-center text-xs text-zinc-500">
                <span>Resets in {reset.daysRemaining} days</span>
                {canPurchaseMore && (
                    <button className="text-emerald-400 hover:text-emerald-300 transition-colors font-medium">
                        + Add Tokens
                    </button>
                )}
                {!canPurchaseMore && tokens.percentUsed >= 80 && (
                    <button className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
                        Upgrade Plan
                    </button>
                )}
            </div>
        </div>
    );
}

export function TokenEstimate({ stageKey }: { stageKey: string }) {
    // Rough estimates
    const estimates: Record<string, number> = {
        naming: 1500,
        manifesto: 2500,
        voice: 2000,
        tagline: 1500,
        palette: 1000,
        typography: 1000,
        logo: 500,
        visual_identity: 3000,
    };

    const estimate = estimates[stageKey] || 2000;

    return (
        <span className="text-xs text-zinc-500">
            ~{estimate.toLocaleString()} tokens
        </span>
    );
}
