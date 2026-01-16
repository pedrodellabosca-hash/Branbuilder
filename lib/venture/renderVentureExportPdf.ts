import PDFDocument from "pdfkit";

const PAGE_MARGIN = 50;

export type VenturePdfMeta = {
    projectName: string | null;
    exportDate: string | null;
};

export function extractMarkdownMeta(markdown: string): VenturePdfMeta {
    const lines = markdown.split("\n");
    const projectLine = lines.find((line) => line.startsWith("**Proyecto:**"));
    const exportLine = lines.find((line) => line.startsWith("**Exportado:**"));
    const projectName = projectLine?.replace("**Proyecto:**", "").trim() || null;
    const exportDate = exportLine?.replace("**Exportado:**", "").trim() || null;
    return { projectName, exportDate };
}

export async function renderVentureExportPdf(
    markdown: string,
    meta: VenturePdfMeta
): Promise<Buffer> {
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
    doc.text(`Proyecto: ${meta.projectName || "N/A"}`);
    if (meta.exportDate) {
        doc.text(`Exportado: ${meta.exportDate}`);
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
