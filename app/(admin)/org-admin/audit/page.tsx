
import { PrismaClient } from "@prisma/client";
import { requireOrg, hasOrgRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldAlert, User, Activity, Search } from "lucide-react";

/**
 * Audit Log Viewer for Org Admins
 */
export default async function OrgAuditLogPage() {
    const { org, user, role } = await requireOrg();

    // Enforce Org Admin
    if (!hasOrgRole(role, "ADMIN")) {
        return (
            <div className="p-8 text-red-400">
                You do not have permission to view audit logs.
            </div>
        );
    }

    const prisma = new PrismaClient();
    const logs = await prisma.auditLog.findMany({
        where: { orgId: org.id },
        orderBy: { createdAt: "desc" },
        take: 50,
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                        <ShieldAlert className="w-6 h-6 text-blue-400" />
                        Audit Logs
                    </h1>
                    <p className="text-slate-400">Security and access events for {org.name}</p>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-950 text-slate-400 font-medium border-b border-slate-800">
                        <tr>
                            <th className="px-4 py-3">Time</th>
                            <th className="px-4 py-3">Actor</th>
                            <th className="px-4 py-3">Action</th>
                            <th className="px-4 py-3">Resource</th>
                            <th className="px-4 py-3">Metadata</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-500">
                                    No audit events found.
                                </td>
                            </tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-800/50">
                                    <td className="px-4 py-3 text-slate-400 tabular-nums">
                                        {log.createdAt.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-slate-300">
                                        <div className="flex items-center gap-2">
                                            <User className="w-3 h-3 text-slate-500" />
                                            {log.userId ? log.userId.slice(-6) : "System"}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-1 rounded bg-slate-800 text-slate-200 font-mono text-xs border border-slate-700">
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-400">
                                        {log.resource} {log.resourceId && <span className="text-slate-600">({log.resourceId.slice(0, 8)})</span>}
                                    </td>
                                    <td className="px-4 py-3 text-xs font-mono text-slate-500 max-w-xs truncate">
                                        {JSON.stringify(log.metadata)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
