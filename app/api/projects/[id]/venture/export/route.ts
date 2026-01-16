import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { getVentureSnapshot } from "@/lib/venture/getVentureSnapshot";
import { evaluateBriefQuality } from "@/lib/venture/briefQuality";
import { redactSecrets } from "@/lib/security/redactSecrets";

const MAX_MD_CHARS = 200000;

const VENTURE_ORDER = [
    "venture_intake",
    "venture_idea_validation",
    "venture_buyer_persona",
    "venture_business_plan",
] as const;

const VENTURE_LABELS: Record<(typeof VENTURE_ORDER)[number], string> = {
    venture_intake: "Intake",
    venture_idea_validation: "Validación de idea",
    venture_buyer_persona: "Buyer Persona",
    venture_business_plan: "Business Plan",
};

function renderValue(value: unknown, depth = 0): string {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value.trim();
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (Array.isArray(value)) {
        return value
            .map((item) => renderValue(item, depth + 1))
            .filter(Boolean)
            .map((item) => `${"  ".repeat(depth)}- ${item}`)
            .join("\n");
    }
    if (typeof value === "object") {
        return Object.entries(value as Record<string, unknown>)
            .map(([key, val]) => {
                const rendered = renderValue(val, depth + 1);
                if (!rendered) return "";
                if (typeof val === "object" && val !== null) {
                    return `${"  ".repeat(depth)}- ${key}:\n${rendered}`;
                }
                return `${"  ".repeat(depth)}- ${key}: ${rendered}`;
            })
            .filter(Boolean)
            .join("\n");
    }
    return "";
}

function renderContentMarkdown(content: unknown): string {
    if (content === null || content === undefined) return "(Sin output generado aún)";
    if (typeof content === "string") {
        return content.trim().length ? content : "(Sin output generado aún)";
    }
    const rendered = renderValue(content);
    return rendered.trim().length ? rendered : "(Sin output generado aún)";
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId, orgId } = await auth();
    const { id: projectId } = await params;

    if (!userId || !orgId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const org = await prisma.organization.findUnique({
        where: { clerkOrgId: orgId },
        select: { id: true },
    });

    if (!org) {
        return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
    }

    const project = await prisma.project.findFirst({
        where: {
            id: projectId,
            orgId: org.id,
            status: { not: "DELETED" },
        },
        select: { id: true, name: true },
    });

    if (!project) {
        return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    const stages = await prisma.stage.findMany({
        where: {
            projectId,
            stageKey: { in: VENTURE_ORDER },
        },
        include: {
            outputs: {
                orderBy: { updatedAt: "desc" },
                take: 1,
                include: {
                    versions: {
                        orderBy: { version: "desc" },
                        take: 1,
                        select: { version: true, content: true, createdAt: true },
                    },
                },
            },
        },
    });

    const snapshot = await getVentureSnapshot(projectId);

    const stageMap = new Map(stages.map((stage) => [stage.stageKey, stage]));
    const exportDate = new Date().toISOString();

    const lines: string[] = [];
    lines.push(`# Fundamentos del negocio`);
    lines.push(``);
    lines.push(`**Proyecto:** ${project.name}`);
    lines.push(`**Project ID:** ${project.id}`);
    lines.push(`**Exportado:** ${exportDate}`);
    lines.push(``);
    lines.push(`## Estado del bloque`);

    for (const key of VENTURE_ORDER) {
        const stage = stageMap.get(key);
        const stageSnapshot = snapshot.stages[key];
        const latestVersion = stage?.outputs[0]?.versions[0]?.version ?? null;
        lines.push(`- ${VENTURE_LABELS[key]} (${key})`);
        lines.push(`  - status: ${stage?.status ?? "N/A"}`);
        lines.push(`  - hasOutput: ${stageSnapshot.hasOutput ? "true" : "false"}`);
        lines.push(`  - latestVersion: ${latestVersion ?? "N/A"}`);
    }

    for (const key of VENTURE_ORDER) {
        const stage = stageMap.get(key);
        const stageSnapshot = snapshot.stages[key];
        const brief = (stage?.config as { brief?: Record<string, string> } | null)?.brief;
        const quality = brief ? evaluateBriefQuality(key, brief) : null;
        const outputContent = stageSnapshot.latestContent;
        const briefSafe = brief ? redactSecrets(brief) : null;
        const outputSafe = redactSecrets(outputContent);

        lines.push(``);
        lines.push(`## ${VENTURE_LABELS[key]}`);
        lines.push(``);
        lines.push(`### Brief`);
        if (briefSafe) {
            const briefRendered = renderValue(briefSafe);
            lines.push(briefRendered ? briefRendered : "(Sin brief guardado)");
        } else {
            lines.push("(Sin brief guardado)");
        }
        if (quality && quality.score < 60) {
            lines.push(``);
            lines.push(`**Notas:** Score ${quality.score}. ${quality.suggestions.join(" ")}`);
        }

        lines.push(``);
        lines.push(`### Output`);
        lines.push(renderContentMarkdown(outputSafe));
    }

    const slug = slugify(project.name) || project.id;
    const filename = `venture-fundamentos-${slug || project.id}.md`;

    let markdown = lines.join("\n");
    if (markdown.length > MAX_MD_CHARS) {
        markdown =
            markdown.slice(0, MAX_MD_CHARS) +
            "\n\n---\n[TRUNCADO: el export excedía el límite de tamaño]\n";
    }

    return new NextResponse(markdown, {
        headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
        },
    });
}
