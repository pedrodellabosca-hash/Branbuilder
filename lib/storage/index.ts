import { v4 as uuidv4 } from "uuid";
import path from "path";
import { StorageProvider, UploadResult, UploadOptions } from "./types";
import { LocalStorageProvider } from "./local";

/**
 * StorageService
 * 
 * High-level storage service that wraps the provider and adds
 * organization/project-aware key generation.
 */
class StorageServiceClass {
    private provider: StorageProvider;

    constructor() {
        // For now, always use local storage
        // TODO: In production, check env and use R2StorageProvider
        this.provider = new LocalStorageProvider();
    }

    /**
     * Generate a storage key for a file
     * Format: {orgId}/{projectId}/{uuid}-{sanitizedFilename}
     */
    generateKey(
        orgId: string,
        projectId: string,
        originalFilename: string
    ): string {
        const uuid = uuidv4();
        const ext = path.extname(originalFilename);
        const baseName = path.basename(originalFilename, ext);
        const sanitized = baseName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);
        return `${orgId}/${projectId}/${uuid}-${sanitized}${ext}`;
    }

    /**
     * Upload a file buffer
     */
    async uploadBuffer(
        orgId: string,
        projectId: string,
        filename: string,
        buffer: Buffer,
        options?: UploadOptions
    ): Promise<UploadResult> {
        const key = this.generateKey(orgId, projectId, filename);
        const contentType = options?.contentType || this.inferMimeType(filename);

        const result = await this.provider.putObject(
            key,
            buffer,
            contentType,
            options?.metadata
        );

        return {
            key,
            size: buffer.length,
            contentType,
            etag: result.etag,
        };
    }

    /**
     * Get a file as a readable stream
     */
    async getStream(key: string) {
        return this.provider.getObjectStream(key);
    }

    /**
     * Get file metadata
     */
    async getMetadata(key: string) {
        return this.provider.headObject(key);
    }

    /**
     * Delete a file
     */
    async delete(key: string) {
        return this.provider.deleteObject(key);
    }

    /**
     * Check if file exists
     */
    async exists(key: string) {
        return this.provider.objectExists(key);
    }

    /**
     * Get download URL for a file
     */
    async getDownloadUrl(key: string, expiresIn?: number) {
        return this.provider.getDownloadUrl(key, expiresIn);
    }

    private inferMimeType(filename: string): string {
        const ext = path.extname(filename).toLowerCase();
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

// Export singleton instance
export const storage = new StorageServiceClass();

// Re-export types
export type { StorageProvider, UploadResult, UploadOptions } from "./types";
