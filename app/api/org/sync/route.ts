import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";

/**
 * POST /api/org/sync
 * 
 * Sincroniza la organización de Clerk con nuestra base de datos.
 * Debe llamarse cuando el usuario selecciona una organización.
 */
export async function POST(request: NextRequest) {
    try {
        const { userId, orgId, orgRole } = await auth();
        const user = await currentUser();

        if (!userId || !user) {
            return NextResponse.json(
                { error: "No autorizado", code: "UNAUTHORIZED" },
                { status: 401 }
            );
        }

        if (!orgId) {
            return NextResponse.json(
                { error: "No hay organización seleccionada", code: "NO_ORG" },
                { status: 400 }
            );
        }

        const userEmail = user.emailAddresses[0]?.emailAddress || "";
        const orgName = "Mi Organización";
        const orgSlug = slugify(orgName) + "-" + orgId.slice(-6);

        // Upsert organization
        const org = await prisma.organization.upsert({
            where: { clerkOrgId: orgId },
            update: {},
            create: {
                clerkOrgId: orgId,
                name: orgName,
                slug: orgSlug,
                plan: "BASIC",
            },
        });

        // Determine role from Clerk orgRole
        const dbRole = mapClerkRoleToDbRole(orgRole || "org:member");

        // Upsert member
        await prisma.orgMember.upsert({
            where: {
                orgId_userId: {
                    orgId: org.id,
                    userId: userId,
                },
            },
            update: {
                role: dbRole,
                email: userEmail,
            },
            create: {
                orgId: org.id,
                userId: userId,
                email: userEmail,
                role: dbRole,
            },
        });

        // Audit Log (Fire and forget)
        const { writeAuditLog } = await import("@/lib/audit");
        // @ts-ignore
        writeAuditLog({
            orgId: org.id,
            userId: userId,
            // @ts-ignore
            action: "ORG_SWITCHED" as any,
            resource: "organization",
            resourceId: org.id,
            metadata: {
                clerkOrgId: orgId,
                syncType: "upsert",
                userRole: dbRole
            }
        });

        return NextResponse.json({
            ok: true,
            orgId: orgId,
            orgDbId: org.id,
            orgName: org.name,
            plan: org.plan,
        });
    } catch (error) {
        console.error("Error syncing organization:", error);
        return NextResponse.json(
            { error: "Error sincronizando organización", code: "SYNC_ERROR" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/org/sync
 * 
 * Obtiene el estado de sincronización de la org actual.
 */
export async function GET(request: NextRequest) {
    try {
        const { userId, orgId } = await auth();

        if (!userId) {
            return NextResponse.json(
                { error: "No autorizado", code: "UNAUTHORIZED" },
                { status: 401 }
            );
        }

        if (!orgId) {
            return NextResponse.json({ synced: false, reason: "NO_ORG_SELECTED" });
        }

        const org = await prisma.organization.findUnique({
            where: { clerkOrgId: orgId },
            select: {
                id: true,
                name: true,
                plan: true,
                _count: {
                    select: {
                        projects: true,
                        members: true,
                    },
                },
            },
        });

        if (!org) {
            return NextResponse.json({
                synced: false,
                reason: "ORG_NOT_IN_DB",
                clerkOrgId: orgId,
            });
        }

        return NextResponse.json({
            synced: true,
            orgId: orgId,
            orgDbId: org.id,
            orgName: org.name,
            plan: org.plan,
            projectCount: org._count.projects,
            memberCount: org._count.members,
        });
    } catch (error) {
        console.error("Error checking org sync:", error);
        return NextResponse.json(
            { error: "Error verificando sincronización", code: "CHECK_ERROR" },
            { status: 500 }
        );
    }
}

function mapClerkRoleToDbRole(clerkRole: string): "OWNER" | "ADMIN" | "MEMBER" {
    switch (clerkRole) {
        case "org:admin":
            return "OWNER";
        default:
            return "MEMBER";
    }
}
