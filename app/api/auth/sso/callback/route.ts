
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSamlStrategy } from "@/lib/security/saml";
import { createCustomSession } from "@/lib/auth/custom-session";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
    try {
        // Parse form data (SAML Response is form-urlencoded)
        const formData = await req.formData();
        const samlResponse = formData.get("SAMLResponse") as string;

        // We typically need to know WHICH org this is for.
        // Usually RelayState is used. For MVP, we might need a way to detect it.
        // If we don't have RelayState, we are in trouble if multiple orgs use same Issuer (unlikely but possible).
        // Let's assume Issuer in response matches our config.

        // LIMITATION: node-saml validatePostResponse needs the specific strategy (which needs cert).
        // If we don't know the Org, we can't look up the cert.
        // Solution: User RelayState during Login.

        // Wait! We didn't set RelayState in Login. 
        // Let's assume for now we look up config by Issuer if possible?
        // node-saml doesn't decode before verify.

        // Better approach: Rely on RelayState being "orgId".
        const relayState = formData.get("RelayState") as string;
        if (!relayState) {
            return NextResponse.json({ error: "Missing RelayState (OrgId)" }, { status: 400 });
        }

        const orgId = relayState;
        const strategy = await getSamlStrategy(orgId);

        if (!strategy) {
            return NextResponse.json({ error: "Invalid Org Context" }, { status: 400 });
        }

        const result = await strategy.validatePostResponseAsync({ SAMLResponse: samlResponse });
        const profile = result.profile;

        if (!profile || !profile.nameID) {
            return NextResponse.json({ error: "Invalid SAML Profile" }, { status: 401 });
        }

        const email = profile.email || profile.nameID;

        // Find or Provison User
        // Since we are bypassing Clerk for SSO users (Custom Session), we need a "Shadow User".
        // But our schema links to Clerk User IDs.
        // Ideally, we should create a Clerk user via API.
        // For this MVP (Custom Session), we will just map by Email if exists, or fail.

        const member = await prisma.orgMember.findFirst({
            where: {
                orgId,
                email: email
            }
        });

        if (!member) {
            // JIT Provisioning (Optional - disabled for now)
            return NextResponse.json({ error: "User not found in organization" }, { status: 403 });
        }

        // Create Session
        await createCustomSession(member.userId, orgId, email);

        await writeAuditLog({
            orgId,
            userId: member.userId,
            action: "LOGIN_SUCCESS",
            resource: "sso",
            resourceId: orgId,
            metadata: { method: "SAML" }
        });

        // Redirect to dashboard
        return NextResponse.redirect(new URL("/dashboard", req.url));

    } catch (error) {
        console.error("SAML Callback Error:", error);
        return NextResponse.json({ error: "SSO Validation Failed" }, { status: 500 });
    }
}
