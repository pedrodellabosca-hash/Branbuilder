import { Readable } from "stream";

/**
 * Storage Provider Interface
 * 
 * Abstraction for S3-compatible storage services.
 * Allows switching between local filesystem (dev) and cloud storage (prod).
 */
export interface StorageProvider {
    /**
     * Upload a file to storage
     * @param key Storage key (path)
     * @param data File data as Buffer or Readable stream
     * @param contentType MIME type
     * @param metadata Optional metadata
     * @returns Object with etag and any provider-specific info
     */
    putObject(
        key: string,
        data: Buffer | Readable,
        contentType: string,
        metadata?: Record<string, string>
    ): Promise<{ etag?: string }>;

    /**
     * Get a file as a readable stream
     * @param key Storage key
     * @returns Readable stream or null if not found
     */
    getObjectStream(key: string): Promise<Readable | null>;

    /**
     * Get file metadata without downloading
     * @param key Storage key
     * @returns Metadata or null if not found
     */
    headObject(key: string): Promise<{
        size: number;
        contentType: string;
        lastModified: Date;
        metadata?: Record<string, string>;
    } | null>;

    /**
     * Delete a file from storage
     * @param key Storage key
     */
    deleteObject(key: string): Promise<void>;

    /**
     * Check if an object exists
     * @param key Storage key
     */
    objectExists(key: string): Promise<boolean>;

    /**
     * Generate a URL for downloading (presigned or direct)
     * @param key Storage key
     * @param expiresIn Expiration time in seconds (for presigned URLs)
     * @returns URL string
     */
    getDownloadUrl(key: string, expiresIn?: number): Promise<string>;

    /**
     * Generate a URL for uploading (presigned)
     * Only applicable for cloud providers
     */
    getUploadUrl?(
        key: string,
        contentType: string,
        expiresIn?: number
    ): Promise<string>;
}

/**
 * Storage configuration
 */
export interface StorageConfig {
    provider: "local" | "r2" | "s3";
    basePath?: string; // For local provider
    bucket?: string; // For cloud providers
    endpoint?: string; // For R2/S3
    accessKeyId?: string;
    secretAccessKey?: string;
    region?: string;
    publicBaseUrl?: string; // Base URL for public access
}

/**
 * Result of a file upload operation
 */
export interface UploadResult {
    key: string;
    size: number;
    contentType: string;
    etag?: string;
}

/**
 * Options for uploading files
 */
export interface UploadOptions {
    contentType?: string;
    metadata?: Record<string, string>;
}
