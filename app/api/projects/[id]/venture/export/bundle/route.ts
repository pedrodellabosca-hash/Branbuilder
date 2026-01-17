import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiAuth } from "@/lib/auth/getApiAuth";
import { buildVentureExportMarkdown } from "@/lib/venture/renderVentureExport";
import {
    extractMarkdownMeta,
    renderVentureExportPdf,
} from "@/lib/venture/renderVentureExportPdf";
import yazl from "yazl";

export const runtime = "nodejs";

function buildReadme(projectName: string, exportDate: string | null, isTruncated: boolean) {
    const lines: string[] = [];
    lines.push("BrandForge - Fundamentos del negocio");
    lines.push(`Proyecto: ${projectName}`);
    if (exportDate) {
        lines.push(`Exportado: ${exportDate}`);
    }
    if (isTruncated) {
        lines.push("Nota: El export MD fue truncado por limite de tamaño.");
    }
    lines.push("");
    return lines.join("\n");
}

async function buildZipBuffer(files: Array<{ name: string; content: Buffer }>): Promise<Buffer> {
    const zip = new yazl.ZipFile();
    const chunks: Buffer[] = [];

    const done = new Promise<Buffer>((resolve, reject) => {
        zip.outputStream.on("data", (chunk) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        zip.outputStream.on("end", () => resolve(Buffer.concat(chunks)));
        zip.outputStream.on("error", reject);
    });

    for (const file of files) {
        zip.addBuffer(file.content, file.name);
    }

    zip.end();
    return done;
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authContext = await getApiAuth(request);
    const { id: projectId } = await params;

    if (!authContext) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId, orgId, source } = authContext;

    const org = await prisma.organization.findUnique({
        where: { clerkOrgId: orgId },
        select: { id: true },
    });

    let project = null as { id: string; name: string } | null;
    if (org) {
        project = await prisma.project.findFirst({
            where: {
                id: projectId,
                orgId: org.id,
                status: { not: "DELETED" },
            },
            select: { id: true, name: true },
        });
    } else if (source === "e2e") {
        project = await prisma.project.findFirst({
            where: {
                id: projectId,
                status: { not: "DELETED" },
            },
            select: { id: true, name: true },
        });
    }

    if (!project) {
        return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    const { markdown, filename } = await buildVentureExportMarkdown(project);
    const meta = extractMarkdownMeta(markdown);
    const pdfBuffer = await renderVentureExportPdf(markdown, {
        projectName: meta.projectName ?? project.name,
        exportDate: meta.exportDate,
    });

    const baseName = filename.replace(/\.md$/i, "");
    const isTruncated = markdown.includes("[TRUNCADO:");
    const readme = buildReadme(project.name, meta.exportDate, isTruncated);
    const zipBuffer = await buildZipBuffer([
        { name: `${baseName}.md`, content: Buffer.from(markdown, "utf8") },
        { name: `${baseName}.pdf`, content: pdfBuffer },
        { name: "README.txt", content: Buffer.from(readme, "utf8") },
    ]);

    const body = new Uint8Array(zipBuffer);
    return new NextResponse(body, {
        headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="${baseName}.zip"`,
        },
    });
}
