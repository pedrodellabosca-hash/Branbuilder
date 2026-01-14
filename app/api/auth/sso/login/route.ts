
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSamlStrategy } from "@/lib/security/saml";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");

    if (!slug) {
        return NextResponse.json({ error: "Organization slug required" }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({ where: { slug } });
    if (!org) {
        return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const strategy = await getSamlStrategy(org.id);
    if (!strategy) {
        return NextResponse.json({ error: "SSO not configured for this organization" }, { status: 400 });
    }

    try {
        // Pass OrgId as RelayState to persist context across redirect
        // Signature: (requestId, host, options) - Using empty strings as placeholders
        const redirectUrl = await strategy.getAuthorizeUrlAsync("", "", {
            additionalParams: { RelayState: org.id }
        });
        return NextResponse.redirect(redirectUrl);
    } catch (error) {
        console.error("SAML Login Error:", error);
        return NextResponse.json({ error: "Failed to initiate SSO" }, { status: 500 });
    }
}
