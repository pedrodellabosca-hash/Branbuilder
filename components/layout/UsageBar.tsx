
"use client";

import { useEffect, useState } from "react";
import { Zap, AlertTriangle, PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface UsageData {
    tokens: {
        percentUsed: number;
        remaining: number;
        used: number;
        limit: number;
        bonus: number;
    };
    plan: "BASIC" | "MID" | "PRO";
    canPurchaseMore: boolean;
    reset: {
        daysRemaining: number;
        date: string;
    };
}

export function UsageBar() {
    const [usage, setUsage] = useState<UsageData | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchUsage = async () => {
        try {
            const res = await fetch("/api/usage");
            if (res.ok) {
                const data = await res.json();
                setUsage(data);
            }
        } catch (e) {
            console.error("Failed to fetch usage:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsage();
        // Poll every 60s to update
        const interval = setInterval(fetchUsage, 60000);
        return () => clearInterval(interval);
    }, []);

    if (loading || !usage) return null;

    const { tokens, plan, reset } = usage;
    const isCritical = tokens.remaining <= 0;
    const isLow = tokens.percentUsed >= 80;

    const colorClass = isCritical
        ? "bg-red-500"
        : isLow
            ? "bg-yellow-500"
            : "bg-blue-500";

    const handleAddTokens = async () => {
        if (!confirm("Confirm simulated purchase of 500,000 tokens?")) return;
        try {
            const res = await fetch("/api/usage/addon", { method: "POST" });
            if (res.ok) {
                alert("Tokens added successfully!");
                fetchUsage();
                router.refresh();
            } else {
                const err = await res.json();
                alert(`Error: ${err.error}`);
            }
        } catch (e) {
            alert("Purchase failed");
        }
    };

    return (
        <div className="w-full bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-4 flex-1">
                <div className="flex items-center gap-2">
                    <Zap className={`w-3 h-3 ${isCritical ? "text-red-400" : "text-blue-400"}`} />
                    <span className="font-medium text-white">Plan {plan}</span>
                </div>

                {/* Progress Bar Container */}
                <div className="flex-1 max-w-xs relative h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className={`absolute top-0 left-0 h-full ${colorClass} transition-all duration-500`}
                        style={{ width: `${Math.min(100, tokens.percentUsed)}%` }}
                    />
                </div>

                <span>
                    {tokens.used.toLocaleString()} / {tokens.limit.toLocaleString()}
                    {tokens.bonus > 0 && <span className="text-green-400 ml-1">+{tokens.bonus.toLocaleString()} Extra</span>}
                </span>
            </div>

            <div className="flex items-center gap-4">
                <span className="text-slate-500">
                    Reset: {reset.daysRemaining}d
                </span>

                {isCritical && plan === "BASIC" && (
                    <button className="text-red-400 font-bold hover:underline flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Upgrade
                    </button>
                )}

                {(isCritical || isLow) && usage.canPurchaseMore && (
                    <button
                        onClick={handleAddTokens}
                        className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                    >
                        <PlusCircle className="w-3 h-3" /> Add Tokens
                    </button>
                )}
            </div>
        </div>
    );
}
