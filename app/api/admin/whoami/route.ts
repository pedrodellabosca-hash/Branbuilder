
import { auth } from "@clerk/nextjs/server";
import { isSuperAdmin } from "@/lib/admin/adminAuth";
import { NextResponse } from "next/server";

export async function GET() {
    const { userId } = await auth();
    const isSuper = userId ? await isSuperAdmin(userId) : false;

    return NextResponse.json({
        ok: true,
        userId: userId || null,
        isSuperAdmin: isSuper,
        envHasSuperAdmin: !!process.env.SUPERADMIN_USER_IDS
    });
}
