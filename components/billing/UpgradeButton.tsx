
"use client";

import { useState } from "react";
import { Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UpgradeButtonProps {
    planId: "PRO" | "BASIC";
    currentPlan: string;
}

export function UpgradeButton({ planId, currentPlan }: UpgradeButtonProps) {
    const [loading, setLoading] = useState(false);

    if (currentPlan === planId) {
        return (
            <Button disabled variant="outline" className="w-full">
                {planId} Activo
            </Button>
        );
    }

    const handleUpgrade = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/billing/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    planId,
                    successUrl: window.location.href,
                    cancelUrl: window.location.href,
                }),
            });

            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                console.error("Checkout failed:", data.error);
                alert("Error iniciando checkout: " + (data.error || "Unknown"));
            }
        } catch (error) {
            console.error("Checkout error:", error);
            alert("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
            {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
                <CreditCard className="w-4 h-4 mr-2" />
            )}
            Mejorar a {planId}
        </Button>
    );
}
