import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import PDFDocument from "pdfkit";
import { prisma } from "@/lib/db";
import { buildVentureExportMarkdown } from "@/lib/venture/renderVentureExport";

const PAGE_MARGIN = 50;

function extractMarkdownMeta(markdown: string) {
    const lines = markdown.split("\n");
    const projectLine = lines.find((line) => line.startsWith("**Proyecto:**"));
    const exportLine = lines.find((line) => line.startsWith("**Exportado:**"));
    const projectName = projectLine?.replace("**Proyecto:**", "").trim();
    const exportDate = exportLine?.replace("**Exportado:**", "").trim();
    return { projectName, exportDate };
}

async function renderMarkdownToPdf(markdown: string, projectName: string | null, exportDate: string | null) {
    const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN, bufferPages: true });
    const chunks: Buffer[] = [];

    const done = new Promise<Buffer>((resolve, reject) => {
        doc.on("data", (chunk) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);
    });

    doc.font("Helvetica-Bold").fontSize(20).fillColor("#111827");
    doc.text("Fundamentos del negocio");
    doc.moveDown(0.3);

    doc.font("Helvetica").fontSize(12).fillColor("#111827");
    doc.text(`Proyecto: ${projectName || "N/A"}`);
    if (exportDate) {
        doc.text(`Exportado: ${exportDate}`);
    }
    doc.moveDown(1);

    doc.font("Helvetica").fontSize(10).fillColor("#0f172a");
    doc.text(markdown, {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
    });

    const range = doc.bufferedPageRange();
    const footerWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    for (let i = 0; i < range.count; i++) {
        doc.switchToPage(i);
        const footerY = doc.page.height - doc.page.margins.bottom + 10;
        doc.font("Helvetica").fontSize(9).fillColor("#6b7280");
        doc.text("Generado por BrandForge", doc.page.margins.left, footerY, {
            width: footerWidth,
            align: "left",
        });
        doc.text(`Pagina ${i + 1}/${range.count}`, doc.page.margins.left, footerY, {
            width: footerWidth,
            align: "right",
        });
    }

    doc.end();
    return done;
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
        return NextResponse.json({ error: "Organizacion no encontrada" }, { status: 404 });
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

    const { markdown, filename } = await buildVentureExportMarkdown(project);
    const { projectName, exportDate } = extractMarkdownMeta(markdown);
    const pdfBuffer = await renderMarkdownToPdf(
        markdown,
        projectName ?? project.name,
        exportDate ?? null
    );
    const pdfFilename = filename.replace(/\.md$/i, ".pdf");

    return new NextResponse(pdfBuffer, {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${pdfFilename}"`,
        },
    });
}
