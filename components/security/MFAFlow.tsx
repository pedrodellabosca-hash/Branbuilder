
"use client";

import { useState } from "react";
import { Shield, Smartphone, ArrowRight, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import Image from "next/image";

interface MFAFlowProps {
    initialEnabled: boolean;
}

export function MFAFlow({ initialEnabled }: MFAFlowProps) {
    const [enabled, setEnabled] = useState(initialEnabled);
    const [step, setStep] = useState<"IDLE" | "SETUP" | "VERIFY" | "SUCCESS">("IDLE");
    const [setupData, setSetupData] = useState<{ secret: string; qrCode: string } | null>(null);
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const startSetup = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/security/mfa/setup", { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error iniciando setup");

            setSetupData(data);
            setStep("SETUP");
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const verifySetup = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/security/mfa/verify", {
                method: "POST",
                body: JSON.stringify({ token: code }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Código incorrecto");

            setEnabled(true);
            setStep("SUCCESS");
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    if (enabled && step !== "SUCCESS") {
        return (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">MFA Activado</h3>
                        <p className="text-sm text-slate-400">Tu cuenta está protegida con autenticación de dos factores.</p>
                    </div>
                </div>
                {/* Disable button logic would go here */}
            </div>
        );
    }

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                    <h3 className="font-semibold text-white">Autenticación de Dos Factores (MFA)</h3>
                    <p className="text-sm text-slate-400">Protege tu cuenta generando códigos desde tu celular.</p>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {error}
                </div>
            )}

            {step === "IDLE" && (
                <button
                    onClick={startSetup}
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                    Configurar MFA
                </button>
            )}

            {step === "SETUP" && setupData && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="flex flex-col items-center p-4 bg-white rounded-lg">
                            <Image src={setupData.qrCode} alt="QR Code" width={192} height={192} />
                        </div>
                        <div className="space-y-4">
                            <div className="text-sm text-slate-300">
                                1. Abre tu app de autenticación (Google Authenticator, Authy, etc).
                            </div>
                            <div className="text-sm text-slate-300">
                                2. Escanea el código QR o ingresa este código manualmente:
                            </div>
                            <code className="block w-full p-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-400 font-mono break-all select-all">
                                {setupData.secret}
                            </code>
                            <div className="text-sm text-slate-300">
                                3. Ingresa el código de 6 dígitos que aparece en tu app:
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="123456"
                                    className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white w-32 tracking-wider text-center"
                                />
                                <button
                                    onClick={verifySetup}
                                    disabled={loading || code.length !== 6}
                                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verificar y Activar"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {step === "SUCCESS" && (
                <div className="flex flex-col items-center justify-center py-6 text-center animate-in fade-in zoom-in duration-300">
                    <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                    <h4 className="text-lg font-bold text-white mb-2">¡Todo listo!</h4>
                    <p className="text-slate-400 max-w-sm">MFA ha sido habilitado correctamente. Usalo la próxima vez que inicies sesión.</p>
                </div>
            )}
        </div>
    );
}
