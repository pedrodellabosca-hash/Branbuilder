
import { PrismaClient } from "@prisma/client";
import { SAML, SamlConfig } from "@node-saml/node-saml";
import { prisma } from "@/lib/db";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function getSamlStrategy(orgId: string) {
    // @ts-ignore
    // @ts-ignore
    const config = await prisma.organizationSSOConfig.findUnique({
        where: { orgId }
    });

    if (!config) return null;

    return new SAML({
        callbackUrl: `${APP_URL}/api/auth/sso/callback`,
        entryPoint: config.entryPoint,
        issuer: config.issuer,
        // @ts-ignore
        cert: config.cert,
        // Optional: specific settings for specialized IDPs
        identifierFormat: null,
    });
}
