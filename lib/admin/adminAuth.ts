
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

const SUPERADMIN_USER_IDS = (process.env.SUPERADMIN_USER_IDS || "").split(",").map(s => s.trim()).filter(Boolean);

export async function isSuperAdmin(userId: string) {
    return SUPERADMIN_USER_IDS.includes(userId);
}

export async function requireSuperAdmin() {
    const { userId } = await auth();
    if (!userId || !await isSuperAdmin(userId)) {
        return { error: NextResponse.json({ error: "Forbidden: Superadmin only" }, { status: 403 }), userId: null };
    }
    return { error: null, userId };
}

export async function requireOrgAdmin() {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
        return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), userId: null, orgId: null };
    }

    const member = await prisma.orgMember.findUnique({
        where: {
            orgId_userId: {
                orgId,
                userId
            }
        }
    });

    if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
        return { error: NextResponse.json({ error: "Forbidden: Org Admin only" }, { status: 403 }), userId: null, orgId: null };
    }

    return { error: null, userId, orgId };
}
