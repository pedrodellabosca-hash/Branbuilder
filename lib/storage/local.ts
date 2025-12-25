import { Readable } from "stream";
import { createReadStream, createWriteStream, promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { pipeline } from "stream/promises";
import { StorageProvider } from "./types";

/**
 * Local Filesystem Storage Provider
 * 
 * For development use. Files are stored in ./storage directory.
 * In production, use R2StorageProvider instead.
 */
export class LocalStorageProvider implements StorageProvider {
    private basePath: string;
    private publicBaseUrl: string;

    constructor(basePath?: string, publicBaseUrl?: string) {
        this.basePath = basePath || path.join(process.cwd(), "storage");
        this.publicBaseUrl = publicBaseUrl || "/api/files";
    }

    private getFilePath(key: string): string {
        // Sanitize key to prevent directory traversal
        const sanitizedKey = key.replace(/\.\./g, "").replace(/^\//, "");
        return path.join(this.basePath, sanitizedKey);
    }

    private async ensureDirectory(filePath: string): Promise<void> {
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
    }

    async putObject(
        key: string,
        data: Buffer | Readable,
        contentType: string,
        metadata?: Record<string, string>
    ): Promise<{ etag?: string }> {
        const filePath = this.getFilePath(key);
        await this.ensureDirectory(filePath);

        // Calculate ETag (MD5 hash)
        let etag: string | undefined;

        if (Buffer.isBuffer(data)) {
            // Write buffer directly
            await fs.writeFile(filePath, data);
            etag = crypto.createHash("md5").update(data).digest("hex");
        } else {
            // Stream data to file
            const writeStream = createWriteStream(filePath);
            await pipeline(data, writeStream);

            // Calculate etag after write
            const fileBuffer = await fs.readFile(filePath);
            etag = crypto.createHash("md5").update(fileBuffer).digest("hex");
        }

        // Store metadata in a sidecar file
        if (metadata || contentType) {
            const metaPath = filePath + ".meta.json";
            await fs.writeFile(
                metaPath,
                JSON.stringify({
                    contentType,
                    metadata,
                    lastModified: new Date().toISOString(),
                })
            );
        }

        return { etag };
    }

    async getObjectStream(key: string): Promise<Readable | null> {
        const filePath = this.getFilePath(key);

        try {
            await fs.access(filePath);
            return createReadStream(filePath);
        } catch {
            return null;
        }
    }

    async headObject(key: string): Promise<{
        size: number;
        contentType: string;
        lastModified: Date;
        metadata?: Record<string, string>;
    } | null> {
        const filePath = this.getFilePath(key);

        try {
            const stats = await fs.stat(filePath);

            // Try to read metadata
            let contentType = "application/octet-stream";
            let metadata: Record<string, string> | undefined;

            try {
                const metaPath = filePath + ".meta.json";
                const metaContent = await fs.readFile(metaPath, "utf-8");
                const meta = JSON.parse(metaContent);
                contentType = meta.contentType || contentType;
                metadata = meta.metadata;
            } catch {
                // No metadata file, infer content type from extension
                const ext = path.extname(key).toLowerCase();
                contentType = this.inferContentType(ext);
            }

            return {
                size: stats.size,
                contentType,
                lastModified: stats.mtime,
                metadata,
            };
        } catch {
            return null;
        }
    }

    async deleteObject(key: string): Promise<void> {
        const filePath = this.getFilePath(key);

        try {
            await fs.unlink(filePath);

            // Also delete metadata file if exists
            try {
                await fs.unlink(filePath + ".meta.json");
            } catch {
                // Ignore if no metadata file
            }
        } catch {
            // Ignore if file doesn't exist
        }
    }

    async objectExists(key: string): Promise<boolean> {
        const filePath = this.getFilePath(key);

        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    async getDownloadUrl(key: string, expiresIn?: number): Promise<string> {
        // For local storage, we return an API endpoint URL
        // The key format is: {orgId}/{projectId}/{filename}
        // We'll use the LibraryFile ID in the actual URL
        return `${this.publicBaseUrl}/${encodeURIComponent(key)}/download`;
    }

    private inferContentType(ext: string): string {
        const mimeTypes: Record<string, string> = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
            ".svg": "image/svg+xml",
            ".pdf": "application/pdf",
            ".doc": "application/msword",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".xls": "application/vnd.ms-excel",
            ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".ppt": "application/vnd.ms-powerpoint",
            ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            ".txt": "text/plain",
            ".json": "application/json",
            ".mp4": "video/mp4",
            ".mp3": "audio/mpeg",
            ".zip": "application/zip",
        };
        return mimeTypes[ext] || "application/octet-stream";
    }
}
