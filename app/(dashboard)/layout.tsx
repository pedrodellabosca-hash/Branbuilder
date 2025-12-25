"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    OrganizationSwitcher,
    UserButton,
    useOrganization,
} from "@clerk/nextjs";
import {
    FolderKanban,
    Users,
    Settings,
    Shield,
    CreditCard,
    Menu,
    X,
    Plus,
    Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
    { name: "Proyectos", href: "/projects", icon: FolderKanban },
    { name: "Miembros", href: "/members", icon: Users },
    { name: "Seguridad", href: "/security", icon: Shield },
    { name: "Billing", href: "/billing", icon: CreditCard },
    { name: "Configuración", href: "/settings", icon: Settings },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();
    const { organization, isLoaded } = useOrganization();

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-64 transform bg-slate-900 border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Logo */}
                <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">BF</span>
                        </div>
                        <span className="text-lg font-semibold text-white">BrandForge</span>
                    </Link>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden text-slate-400 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Organization Switcher */}
                <div className="px-4 py-4 border-b border-slate-800">
                    <OrganizationSwitcher
                        appearance={{
                            elements: {
                                rootBox: "w-full",
                                organizationSwitcherTrigger:
                                    "w-full justify-between bg-slate-800 border-slate-700 text-white hover:bg-slate-700 px-3 py-2 rounded-lg",
                                organizationPreviewMainIdentifier: "text-white",
                                organizationPreviewSecondaryIdentifier: "text-slate-400",
                                organizationSwitcherTriggerIcon: "text-slate-400",
                            },
                        }}
                        afterCreateOrganizationUrl="/"
                        afterSelectOrganizationUrl="/"
                        hidePersonal={true}
                        createOrganizationMode="modal"
                    />
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-4 space-y-1">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-blue-600 text-white"
                                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                                )}
                            >
                                <item.icon className="w-5 h-5" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* Quick Actions */}
                <div className="p-4 border-t border-slate-800">
                    <Link
                        href="/projects/new"
                        className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Nuevo Proyecto
                    </Link>
                </div>
            </aside>

            {/* Main content */}
            <div className="lg:pl-64">
                {/* Top bar */}
                <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl px-4 lg:px-8">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden text-slate-400 hover:text-white"
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    <div className="flex-1 lg:flex-none" />

                    <div className="flex items-center gap-4">
                        {/* Notifications */}
                        <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" />
                        </button>

                        {/* User */}
                        <UserButton
                            appearance={{
                                elements: {
                                    avatarBox: "w-8 h-8",
                                },
                            }}
                            afterSignOutUrl="/sign-in"
                        />
                    </div>
                </header>

                {/* Page content */}
                <main className="p-4 lg:p-8">
                    {isLoaded && !organization ? (
                        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-6">
                                <FolderKanban className="w-8 h-8 text-slate-400" />
                            </div>
                            <h2 className="text-xl font-semibold text-white mb-2">
                                Selecciona una organización
                            </h2>
                            <p className="text-slate-400 mb-6 max-w-sm">
                                Para empezar a trabajar, selecciona o crea una organización
                                usando el selector en la barra lateral.
                            </p>
                        </div>
                    ) : (
                        children
                    )}
                </main>
            </div>
        </div>
    );
}
