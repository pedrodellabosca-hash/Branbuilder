import { createRequire } from "module";
import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    ImageRun,
} from "docx";
import { BusinessPlanSectionKey, Prisma } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const PDFDocument = require("pdfkit/js/pdfkit.standalone.js");

export type BusinessPlanDocument = {
    businessPlanId: string;
    projectId: string;
    projectName: string | null;
    ventureSnapshotId: string;
    snapshotVersion: number;
    updatedAt: Date;
    sections: Array<{
        key: string;
        title: string;
        content: Prisma.JsonValue;
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

const LOGO_CANDIDATES = [
    "public/brandforge-logo.png",
    "public/brandforge-logo.jpg",
    "public/brandforge-logo.jpeg",
    "public/logo.png",
    "public/logo.jpg",
    "public/logo.jpeg",
];

function getSectionTitle(key: string, fallback: string) {
    return SECTION_TITLES[key as BusinessPlanSectionKey] ?? fallback ?? key;
}

function getAppName() {
    return process.env.APP_NAME || "BrandForge";
}

function getLogoBuffer() {
    for (const relPath of LOGO_CANDIDATES) {
        const fullPath = path.resolve(process.cwd(), relPath);
        if (fs.existsSync(fullPath)) {
            try {
                const buffer = fs.readFileSync(fullPath);
                return { buffer };
            } catch {
                return null;
            }
        }
    }
    return null;
}

function renderSectionContent(content: Prisma.JsonValue) {
    if (typeof content === "string") {
        return content;
    }
    if (content && typeof content === "object" && !Array.isArray(content)) {
        const record = content as Record<string, unknown>;
        if (typeof record.text === "string") {
            return record.text;
        }
        if (typeof record.markdown === "string") {
            return record.markdown;
        }
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
        const logo = getLogoBuffer();
        if (logo) {
            doc.image(logo.buffer, { width: 120 });
            doc.moveDown(0.5);
        }
        doc.font("Helvetica-Bold").fontSize(22).text("Business Plan");
        doc.moveDown(0.5);
        doc.font("Helvetica").fontSize(11);
        doc.text(`Project: ${document.projectName ?? document.projectId}`);
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
            const contentRecord =
                section.content && typeof section.content === "object" && !Array.isArray(section.content)
                    ? (section.content as Record<string, unknown>)
                    : null;
            if (contentRecord && typeof contentRecord.markdown === "string") {
                renderPdfBlocks(doc, parseMarkdownBlocks(contentRecord.markdown));
            } else if (contentRecord && typeof contentRecord.text === "string") {
                renderPdfBlocks(doc, parseMarkdownBlocks(contentRecord.text));
            } else {
                renderPdfBlocks(doc, [{ type: "code", text: content }]);
            }
            doc.addPage();
        }

        const range = doc.bufferedPageRange();
        const footerWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const footerText = `Generated by ${getAppName()} — ${new Date().toISOString()}`;
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
            doc.text(footerText, doc.page.margins.left, footerY, {
                width: footerWidth,
                align: "left",
            });
            doc.text(`Page ${i + 1}`, doc.page.margins.left, footerY, {
                width: footerWidth,
                align: "right",
            });
        }

        doc.end();
        return done;
    }

    async exportDocx(document: BusinessPlanDocument): Promise<Buffer> {
        const logo = getLogoBuffer();
        const coverItems: Paragraph[] = [];
        if (logo) {
            coverItems.push(
                new Paragraph({
                    children: [
                        new ImageRun({
                            data: logo.buffer,
                            transformation: { width: 120, height: 40 },
                            type: "png",
                        }),
                    ],
                })
            );
        }

        const paragraphs: Paragraph[] = [
            ...coverItems,
            new Paragraph({
                text: "Business Plan",
                heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({ text: `Project: ${document.projectName ?? document.projectId}` }),
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
            const contentRecord =
                section.content && typeof section.content === "object" && !Array.isArray(section.content)
                    ? (section.content as Record<string, unknown>)
                    : null;
            if (contentRecord && typeof contentRecord.markdown === "string") {
                for (const block of parseMarkdownBlocks(contentRecord.markdown)) {
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
            } else if (contentRecord && typeof contentRecord.text === "string") {
                for (const block of parseMarkdownBlocks(contentRecord.text)) {
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

        paragraphs.push(
            new Paragraph({
                text: `Generated by ${getAppName()} — ${new Date().toISOString()}`,
            })
        );

        const doc = new Document({
            sections: [{ children: paragraphs }],
        });

        return Packer.toBuffer(doc);
    }
}

export const businessPlanExportService = new BusinessPlanExportService();
