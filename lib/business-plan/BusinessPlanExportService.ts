import { createRequire } from "module";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

const require = createRequire(import.meta.url);
const PDFDocument = require("pdfkit/js/pdfkit.standalone.js");

export type BusinessPlanDocument = {
    businessPlanId: string;
    projectId: string;
    ventureSnapshotId: string;
    snapshotVersion: number;
    updatedAt: Date;
    sections: Array<{
        key: string;
        title: string;
        content: Record<string, unknown>;
    }>;
};

function renderSectionContent(content: Record<string, unknown>) {
    if (typeof content?.text === "string") {
        return content.text;
    }
    if (typeof content?.markdown === "string") {
        return content.markdown;
    }
    return JSON.stringify(content ?? {}, null, 2);
}

export class BusinessPlanExportService {
    async exportPdf(document: BusinessPlanDocument): Promise<Buffer> {
        const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
        const chunks: Buffer[] = [];

        const done = new Promise<Buffer>((resolve, reject) => {
            doc.on("data", (chunk: Buffer) => chunks.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(chunks)));
            doc.on("error", reject);
        });

        doc.font("Helvetica-Bold").fontSize(18).text("Business Plan");
        doc.moveDown(0.4);
        doc.font("Helvetica").fontSize(11);
        doc.text(`BusinessPlan ID: ${document.businessPlanId}`);
        doc.text(`Snapshot Version: ${document.snapshotVersion}`);
        doc.text(`Updated At: ${document.updatedAt.toISOString()}`);
        doc.moveDown(1);

        for (const section of document.sections) {
            doc.font("Helvetica-Bold").fontSize(13).text(section.title || section.key);
            doc.moveDown(0.2);
            doc.font("Helvetica").fontSize(10).text(renderSectionContent(section.content));
            doc.moveDown(0.8);
        }

        doc.end();
        return done;
    }

    async exportDocx(document: BusinessPlanDocument): Promise<Buffer> {
        const paragraphs: Paragraph[] = [
            new Paragraph({
                text: "Business Plan",
                heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
                children: [
                    new TextRun(`BusinessPlan ID: ${document.businessPlanId}`),
                ],
            }),
            new Paragraph({
                children: [
                    new TextRun(`Snapshot Version: ${document.snapshotVersion}`),
                ],
            }),
            new Paragraph({
                children: [
                    new TextRun(`Updated At: ${document.updatedAt.toISOString()}`),
                ],
            }),
            new Paragraph({ text: "" }),
        ];

        for (const section of document.sections) {
            paragraphs.push(
                new Paragraph({
                    text: section.title || section.key,
                    heading: HeadingLevel.HEADING_2,
                })
            );
            paragraphs.push(
                new Paragraph({
                    children: [new TextRun(renderSectionContent(section.content))],
                })
            );
            paragraphs.push(new Paragraph({ text: "" }));
        }

        const doc = new Document({
            sections: [{ children: paragraphs }],
        });

        return Packer.toBuffer(doc);
    }
}

export const businessPlanExportService = new BusinessPlanExportService();
