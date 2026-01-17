import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { BusinessPlanPageClient } from "@/components/business-plan/BusinessPlanPageClient";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function BusinessPlanPage({ params }: PageProps) {
    const { userId, orgId } = await auth();
    const { id: projectId } = await params;

    if (!userId) {
        redirect("/sign-in");
    }

    if (!orgId) {
        redirect("/projects");
    }

    const org = await prisma.organization.findUnique({
        where: { clerkOrgId: orgId },
        select: { id: true },
    });

    if (!org) {
        notFound();
    }

    const project = await prisma.project.findFirst({
        where: { id: projectId, orgId: org.id, status: { not: "DELETED" } },
        select: { id: true },
    });

    if (!project) {
        notFound();
    }

    return (
        <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
            <BusinessPlanPageClient projectId={project.id} />
        </div>
    );
}
