
"use client";

import { useState, useEffect } from "react";
import { Shield, Lock, Save, Loader2 } from "lucide-react";

export default function OrgSecurityPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState<any>({});

    useEffect(() => {
        Promise.all([
            fetch("/api/org-admin/security").then(res => res.json()),
            fetch("/api/org-admin/sso/config").then(res => res.json())
        ]).then(([policy, sso]) => {
            // Merge responses
            // Policy has booleans. SSO has strings.
            // Be careful if endpoint returns empty obj
            setConfig({ ...policy, ...sso });
            setLoading(false);
        });
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            // Save Policy
            await fetch("/api/org-admin/security", {
                method: "PATCH",
                body: JSON.stringify(config),
            });

            // Save SSO Config (only if fields present)
            if (config.entryPoint || config.issuer) {
                await fetch("/api/org-admin/sso/config", {
                    method: "POST",
                    body: JSON.stringify(config), // It accepts subset
                });
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-slate-400">Loading policy settings...</div>;

    return (
        <div className="max-w-3xl">
            <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Shield className="w-6 h-6 text-purple-500" />
                Security Policies
            </h1>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-6">

                {/* MFA Policy */}
                <div className="flex items-start justify-between pb-6 border-b border-slate-800">
                    <div>
                        <h3 className="font-semibold text-white mb-1">Enforce Multi-Factor Authentication</h3>
                        <p className="text-sm text-slate-400 max-w-md">
                            Require all members of this organization to set up MFA.
                            Users without MFA will be blocked from accessing the dashboard until they configure it.
                        </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={config.mfaRequired || false}
                            onChange={(e) => setConfig({ ...config, mfaRequired: e.target.checked })}
                        />
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                </div>

                {/* SSO Policy (Placeholder for T7) */}
                <div className="flex items-start justify-between pb-6 border-b border-slate-800 opacity-50 pointer-events-none">
                    <div>
                        <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
                            Enforce Single Sign-On (SSO) <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">PRO</span>
                        </h3>
                        <p className="text-sm text-slate-400 max-w-md">
                            Require login via configured Identity Provider (SAML).
                        </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={config.ssoRequired || false}
                            onChange={(e) => setConfig({ ...config, ssoRequired: e.target.checked })}
                        />
                        <div className="w-11 h-6 bg-slate-700 rounded-full peer after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5"></div>
                    </label>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    )
}
