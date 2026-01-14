"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Activity, Database, Settings, Terminal, BarChart3, Shield, PlayCircle } from "lucide-react";
import { adminCopy } from "@/lib/admin/adminCopy";

interface SidebarProps {
    role: "SUPERADMIN" | "ORG_ADMIN";
}

export function Sidebar({ role }: SidebarProps) {
    const pathname = usePathname();

    const links = role === "SUPERADMIN" ? [
        { href: "/admin/health", label: adminCopy.sidebar.menu.health, icon: Activity },
        { href: "/admin/jobs", label: adminCopy.sidebar.menu.jobs, icon: Terminal },
        { href: "/admin/actions", label: adminCopy.sidebar.menu.actions, icon: PlayCircle }, // New V3 Link
    ] : [
        { href: "/org-admin/usage", label: adminCopy.sidebar.org.usage, icon: BarChart3 },
        { href: "/org-admin/models", label: adminCopy.sidebar.org.models, icon: Settings },
        { href: "/org-admin/prompts", label: adminCopy.sidebar.org.prompts, icon: Database },
        { href: "/org-admin/audit", label: "Audit Logs", icon: Shield },
        { href: "/org-admin/security", label: "Security", icon: Lock },
    ];

    return (
        <div className="w-64 border-r border-slate-800 bg-slate-900 flex flex-col">
            <div className="p-6 border-b border-slate-800">
                <div className="flex items-center gap-2 font-bold text-white mb-1">
                    <Shield className="w-5 h-5 text-purple-500" />
                    <span>BrandForge</span>
                </div>
                <div className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                    {role === "SUPERADMIN" ? "Superadmin" : adminCopy.sidebar.org.title}
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-1">
                {links.map(link => {
                    const Icon = link.icon as any;
                    const isActive = pathname.startsWith(link.href);

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                                ? "bg-purple-500/10 text-purple-400"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {link.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-800">
                <Link
                    href="/dashboard"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-300 transition-colors"
                >
                    ← {adminCopy.sidebar.menu.backToApp}
                </Link>
            </div>
        </div>
    );
}
