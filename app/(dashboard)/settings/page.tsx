
import { requireOrg } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function SettingsPage() {
    const { org } = await requireOrg();

    const percentUsed = Math.min(100, Math.round((org.monthlyTokensUsed / org.monthlyTokenLimit) * 100));

    return (
        <div className="space-y-6 max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold text-white">Configuración de Organización</h1>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="bg-slate-900 border-slate-800 text-slate-100">
                    <CardHeader>
                        <CardTitle>Información General</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <div className="text-sm text-slate-400">Nombre</div>
                            <div className="font-medium">{org.name}</div>
                        </div>
                        <div>
                            <div className="text-sm text-slate-400">Slug</div>
                            <div className="font-mono text-sm bg-slate-950 px-2 py-1 rounded w-fit">{org.slug}</div>
                        </div>
                        <div>
                            <div className="text-sm text-slate-400">ID de Organización</div>
                            <div className="font-mono text-xs text-slate-500">{org.id}</div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 text-slate-100">
                    <CardHeader>
                        <CardTitle>Plan y Consumo</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-400">Plan Actual</span>
                            <Badge variant={org.plan === "PRO" ? "default" : "secondary"}>
                                {org.plan}
                            </Badge>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Tokens Mensuales</span>
                                <span>{org.monthlyTokensUsed.toLocaleString()} / {org.monthlyTokenLimit.toLocaleString()}</span>
                            </div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 transition-all"
                                    style={{ width: `${percentUsed}%` }}
                                />
                            </div>
                            <p className="text-xs text-slate-500 text-right">
                                Se reinician el {org.tokenResetDate.toLocaleDateString()}
                            </p>
                        </div>

                        <div className="flex justify-between items-center pt-2">
                            <span className="text-sm text-slate-400">Tokens Bono</span>
                            <span className="font-mono">{org.bonusTokens.toLocaleString()}</span>
                        </div>

                        {org.plan === "BASIC" && (
                            <div className="pt-4 border-t border-slate-800">
                                <div className="rounded-lg bg-slate-950 p-4 border border-blue-900/50">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="font-medium text-blue-400">Plan PRO</h4>
                                            <p className="text-xs text-slate-500 mt-1">
                                                500,000 tokens/mes + Soporte Prioritario
                                            </p>
                                        </div>
                                    </div>
                                    <UpgradeButton planId="PRO" currentPlan={org.plan} />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

import { UpgradeButton } from "@/components/billing/UpgradeButton";
