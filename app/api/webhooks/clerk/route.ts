import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";

export async function POST(req: Request) {
    // Get the headers
    const headerPayload = await headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
        return new Response("Error: Missing svix headers", { status: 400 });
    }

    // Get the body
    const payload = await req.json();
    const body = JSON.stringify(payload);

    // Create a new Svix instance with your secret.
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || "");

    let evt: WebhookEvent;

    // Verify the payload with the headers
    try {
        evt = wh.verify(body, {
            "svix-id": svix_id,
            "svix-timestamp": svix_timestamp,
            "svix-signature": svix_signature,
        }) as WebhookEvent;
    } catch (err) {
        console.error("Error verifying webhook:", err);
        return new Response("Error: Verification failed", { status: 400 });
    }

    // Handle the webhook
    const eventType = evt.type;

    try {
        switch (eventType) {
            case "organization.created": {
                const { id, name, slug } = evt.data;

                // Check if org already exists
                const existing = await prisma.organization.findUnique({
                    where: { clerkOrgId: id },
                });

                if (!existing) {
                    await prisma.organization.create({
                        data: {
                            clerkOrgId: id,
                            name,
                            slug: slug || slugify(name),
                        },
                    });
                    console.log(`[Webhook] Organization created: ${name} (${id})`);
                }
                break;
            }

            case "organization.updated": {
                const { id, name, slug } = evt.data;

                await prisma.organization.update({
                    where: { clerkOrgId: id },
                    data: {
                        name,
                        slug: slug || slugify(name),
                    },
                });
                console.log(`[Webhook] Organization updated: ${name} (${id})`);
                break;
            }

            case "organization.deleted": {
                const { id } = evt.data;

                // Soft delete - just mark projects as deleted
                const org = await prisma.organization.findUnique({
                    where: { clerkOrgId: id },
                });

                if (org) {
                    await prisma.project.updateMany({
                        where: { orgId: org.id },
                        data: { status: "DELETED" },
                    });
                    // You might want to keep the org for audit purposes
                    // or actually delete it depending on your needs
                    console.log(`[Webhook] Organization deleted: ${id}`);
                }
                break;
            }

            case "organizationMembership.created": {
                const { organization, public_user_data, role } = evt.data;

                if (!organization || !public_user_data) break;

                const org = await prisma.organization.findUnique({
                    where: { clerkOrgId: organization.id },
                });

                if (!org) {
                    // Org not synced yet, create it first
                    await prisma.organization.create({
                        data: {
                            clerkOrgId: organization.id,
                            name: organization.name,
                            slug: organization.slug || slugify(organization.name),
                        },
                    });
                }

                const orgId = org?.id || (await prisma.organization.findUnique({
                    where: { clerkOrgId: organization.id },
                }))?.id;

                if (!orgId) break;

                // Map Clerk role to our role
                let mappedRole: "OWNER" | "ADMIN" | "MEMBER" = "MEMBER";
                if (role === "org:admin") mappedRole = "ADMIN";
                // Note: Clerk doesn't have a built-in 'owner' role, 
                // the creator is typically the first admin

                // Check if this is the first member (creator = owner)
                const memberCount = await prisma.orgMember.count({
                    where: { orgId },
                });

                if (memberCount === 0) {
                    mappedRole = "OWNER";
                }

                await prisma.orgMember.upsert({
                    where: {
                        orgId_userId: {
                            orgId,
                            userId: public_user_data.user_id,
                        },
                    },
                    create: {
                        orgId,
                        userId: public_user_data.user_id,
                        email: public_user_data.identifier || "",
                        role: mappedRole,
                        acceptedAt: new Date(),
                    },
                    update: {
                        role: mappedRole,
                    },
                });

                console.log(
                    `[Webhook] Member added to org: ${public_user_data.identifier} -> ${organization.name}`
                );
                break;
            }

            case "organizationMembership.updated": {
                const { organization, public_user_data, role } = evt.data;

                if (!organization || !public_user_data) break;

                const org = await prisma.organization.findUnique({
                    where: { clerkOrgId: organization.id },
                });

                if (!org) break;

                let mappedRole: "OWNER" | "ADMIN" | "MEMBER" = "MEMBER";
                if (role === "org:admin") mappedRole = "ADMIN";

                await prisma.orgMember.update({
                    where: {
                        orgId_userId: {
                            orgId: org.id,
                            userId: public_user_data.user_id,
                        },
                    },
                    data: { role: mappedRole },
                });

                console.log(
                    `[Webhook] Member role updated: ${public_user_data.identifier} -> ${mappedRole}`
                );
                break;
            }

            case "organizationMembership.deleted": {
                const { organization, public_user_data } = evt.data;

                if (!organization || !public_user_data) break;

                const org = await prisma.organization.findUnique({
                    where: { clerkOrgId: organization.id },
                });

                if (!org) break;

                await prisma.orgMember.delete({
                    where: {
                        orgId_userId: {
                            orgId: org.id,
                            userId: public_user_data.user_id,
                        },
                    },
                });

                // Also remove from all projects in this org
                await prisma.projectMember.deleteMany({
                    where: {
                        project: { orgId: org.id },
                        userId: public_user_data.user_id,
                    },
                });

                console.log(
                    `[Webhook] Member removed from org: ${public_user_data.identifier}`
                );
                break;
            }

            default:
                console.log(`[Webhook] Unhandled event type: ${eventType}`);
        }

        return new Response("Webhook processed", { status: 200 });
    } catch (error) {
        console.error(`[Webhook] Error processing ${eventType}:`, error);
        return new Response("Error processing webhook", { status: 500 });
    }
}
