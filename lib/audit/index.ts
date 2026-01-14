
import { prisma } from "@/lib/db";
import { AuditAction } from "@prisma/client";

/**
 * Fire-and-forget audit log writer.
 * Returns the promise so it can be awaited if critical, 
 * but usually should be called without await to avoid latency.
 */
export async function writeAuditLog({
    orgId,
    userId,
    action,
    resource,
    resourceId,
    metadata,
    ip,
    userAgent
}: {
    orgId: string;
    userId?: string;
    action: AuditAction;
    resource: string;
    resourceId?: string;
    metadata?: any;
    ip?: string;
    userAgent?: string;
}) {
    try {
        await prisma.auditLog.create({
            data: {
                orgId,
                userId,
                // userEmail: fetch? No, slow. Store ID for now or relies on join
                action,
                resource,
                resourceId,
                metadata: metadata ?? {},
                ipAddress: ip,
                userAgent
            }
        });
    } catch (error) {
        console.error("Failed to write audit log:", error);
        // Fail safe - do not crash request
    }
}
