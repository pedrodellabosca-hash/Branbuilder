import { createRequire } from "module";
import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
} from "docx";
import { BusinessPlanSectionKey } from "@prisma/client";

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

const SECTION_TITLES: Record<BusinessPlanSectionKey, string> = {
    EXECUTIVE_SUMMARY: "Executive Summary",
    PROBLEM: "Problem",
    SOLUTION: "Solution",
    MARKET: "Market Analysis",
    COMPETITION: "Competition",
    GO_TO_MARKET: "Go-To-Market",
    OPERATIONS: "Operations",
    FINANCIALS: "Financials",
    RISKS: "Risks",
};

function getSectionTitle(key: string, fallback: string) {
    return SECTION_TITLES[key as BusinessPlanSectionKey] ?? fallback ?? key;
}

function renderSectionContent(content: Record<string, unknown>) {
    if (typeof content?.text === "string") {
        return content.text;
    }
    if (typeof content?.markdown === "string") {
        return content.markdown;
    }
    return JSON.stringify(content ?? {}, null, 2);
}

type MarkdownBlock =
    | { type: "heading"; text: string }
    | { type: "bullet"; text: string }
    | { type: "paragraph"; text: string }
    | { type: "code"; text: string };

function parseMarkdownBlocks(value: string): MarkdownBlock[] {
    const lines = value.split("\n");
    const blocks: MarkdownBlock[] = [];
    let buffer: string[] = [];

    const flushParagraph = () => {
        if (buffer.length) {
            blocks.push({ type: "paragraph", text: buffer.join(" ").trim() });
            buffer = [];
        }
    };

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            flushParagraph();
            continue;
        }
        if (trimmed.startsWith("# ")) {
            flushParagraph();
            blocks.push({ type: "heading", text: trimmed.slice(2).trim() });
            continue;
        }
        if (trimmed.startsWith("- ")) {
            flushParagraph();
            blocks.push({ type: "bullet", text: trimmed.slice(2).trim() });
            continue;
        }
        buffer.push(trimmed);
    }
    flushParagraph();

    return blocks;
}

function renderPdfBlocks(doc: any, blocks: MarkdownBlock[]) {
    for (const block of blocks) {
        if (block.type === "heading") {
            doc.font("Helvetica-Bold").fontSize(12).text(block.text);
            doc.moveDown(0.2);
            continue;
        }
        if (block.type === "bullet") {
            doc.font("Helvetica").fontSize(10).text(`• ${block.text}`, {
                indent: 12,
            });
            continue;
        }
        if (block.type === "code") {
            doc.font("Courier").fontSize(9).text(block.text);
            doc.moveDown(0.2);
            continue;
        }
        doc.font("Helvetica").fontSize(10).text(block.text, { paragraphGap: 4 });
    }
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

        // Cover page
        doc.font("Helvetica-Bold").fontSize(22).text("Business Plan");
        doc.moveDown(0.5);
        doc.font("Helvetica").fontSize(11);
        doc.text(`Project ID: ${document.projectId}`);
        doc.text(`BusinessPlan ID: ${document.businessPlanId}`);
        doc.text(`Snapshot Version: ${document.snapshotVersion}`);
        doc.text(`Updated At: ${document.updatedAt.toISOString()}`);
        doc.moveDown(0.8);
        doc.moveTo(doc.page.margins.left, doc.y)
            .lineTo(doc.page.width - doc.page.margins.right, doc.y)
            .strokeColor("#e2e8f0")
            .stroke();
        doc.addPage();

        // Table of contents
        doc.font("Helvetica-Bold").fontSize(16).text("Contents");
        doc.moveDown(0.5);
        doc.font("Helvetica").fontSize(11);
        for (const section of document.sections) {
            const title = getSectionTitle(section.key, section.title);
            doc.text(`• ${title}`);
        }
        doc.addPage();

        for (const section of document.sections) {
            const title = getSectionTitle(section.key, section.title);
            doc.font("Helvetica-Bold").fontSize(16).text(title);
            doc.moveDown(0.4);
            const content = renderSectionContent(section.content);
            if (typeof section.content?.markdown === "string") {
                renderPdfBlocks(doc, parseMarkdownBlocks(section.content.markdown));
            } else if (typeof section.content?.text === "string") {
                renderPdfBlocks(doc, parseMarkdownBlocks(section.content.text));
            } else {
                renderPdfBlocks(doc, [{ type: "code", text: content }]);
            }
            doc.addPage();
        }

        const range = doc.bufferedPageRange();
        const footerWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        for (let i = 1; i < range.count; i++) {
            doc.switchToPage(i);
            const headerY = doc.page.margins.top - 30;
            const footerY = doc.page.height - doc.page.margins.bottom + 10;
            doc.font("Helvetica").fontSize(9).fillColor("#6b7280");
            doc.text(
                `Business Plan — v${document.snapshotVersion}`,
                doc.page.margins.left,
                headerY,
                { width: footerWidth, align: "left" }
            );
            doc.text(`Page ${i + 1}`, doc.page.margins.left, footerY, {
                width: footerWidth,
                align: "right",
            });
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
            new Paragraph({ text: `Project ID: ${document.projectId}` }),
            new Paragraph({ text: `BusinessPlan ID: ${document.businessPlanId}` }),
            new Paragraph({ text: `Snapshot Version: ${document.snapshotVersion}` }),
            new Paragraph({ text: `Updated At: ${document.updatedAt.toISOString()}` }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "Contents", heading: HeadingLevel.HEADING_2 }),
        ];

        for (const section of document.sections) {
            const title = getSectionTitle(section.key, section.title);
            paragraphs.push(
                new Paragraph({
                    text: title,
                    bullet: { level: 0 },
                })
            );
        }

        paragraphs.push(new Paragraph({ text: "" }));

        for (const section of document.sections) {
            const title = getSectionTitle(section.key, section.title);
            paragraphs.push(
                new Paragraph({
                    text: title,
                    heading: HeadingLevel.HEADING_1,
                })
            );
            const content = renderSectionContent(section.content);
            if (typeof section.content?.markdown === "string") {
                for (const block of parseMarkdownBlocks(section.content.markdown)) {
                    if (block.type === "heading") {
                        paragraphs.push(
                            new Paragraph({
                                text: block.text,
                                heading: HeadingLevel.HEADING_2,
                            })
                        );
                        continue;
                    }
                    if (block.type === "bullet") {
                        paragraphs.push(
                            new Paragraph({
                                text: block.text,
                                bullet: { level: 0 },
                            })
                        );
                        continue;
                    }
                    paragraphs.push(new Paragraph({ text: block.text }));
                }
            } else if (typeof section.content?.text === "string") {
                for (const block of parseMarkdownBlocks(section.content.text)) {
                    if (block.type === "heading") {
                        paragraphs.push(
                            new Paragraph({
                                text: block.text,
                                heading: HeadingLevel.HEADING_2,
                            })
                        );
                        continue;
                    }
                    if (block.type === "bullet") {
                        paragraphs.push(
                            new Paragraph({
                                text: block.text,
                                bullet: { level: 0 },
                            })
                        );
                        continue;
                    }
                    paragraphs.push(new Paragraph({ text: block.text }));
                }
            } else {
                paragraphs.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: content,
                                font: "Courier New",
                            }),
                        ],
                    })
                );
            }
            paragraphs.push(new Paragraph({ text: "" }));
        }

        const doc = new Document({
            sections: [{ children: paragraphs }],
        });

        return Packer.toBuffer(doc);
    }
}

export const businessPlanExportService = new BusinessPlanExportService();
