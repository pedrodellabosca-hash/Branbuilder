
import { requireOrg } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function MembersPage() {
    const { org } = await requireOrg();

    // Fetch members with role
    const members = await prisma.orgMember.findMany({
        where: { orgId: org.id },
        orderBy: { role: 'asc' }, // OWNER first usually, but enum order might vary
    });

    return (
        <div className="space-y-6 max-w-4xl mx-auto p-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white">Miembros del Equipo</h1>
                {/* TODO: Add Invite Button (Phase 4/5) */}
            </div>

            <Card className="bg-slate-900 border-slate-800 text-slate-100">
                <CardHeader>
                    <CardTitle>Usuarios Activos ({members.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {members.map((member) => (
                            <div key={member.id} className="flex justify-between items-center p-3 hover:bg-slate-800/50 rounded-lg transition-colors border border-transparent hover:border-slate-800">
                                <div>
                                    <div className="font-medium text-white">{member.email}</div>
                                    <div className="text-xs text-slate-500">Unido el {member.createdAt.toLocaleDateString()}</div>
                                </div>
                                <Badge variant="outline" className="uppercase text-xs min-w-[80px] justify-center">
                                    {member.role}
                                </Badge>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
