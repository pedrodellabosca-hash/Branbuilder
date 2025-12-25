"use client";

import { useState, useRef, useCallback } from "react";
import {
    Upload,
    File,
    FileImage,
    FileText,
    Trash2,
    Download,
    Loader2,
    AlertCircle,
    X,
    FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LibraryFile {
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    status: string;
    uploadedBy: string;
    createdAt: string;
}

interface ProjectFilesProps {
    projectId: string;
    initialFiles: LibraryFile[];
}

export function ProjectFiles({ projectId, initialFiles }: ProjectFilesProps) {
    const [files, setFiles] = useState<LibraryFile[]>(initialFiles);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = useCallback(
        async (selectedFiles: FileList) => {
            if (selectedFiles.length === 0) return;

            setError(null);
            setIsUploading(true);
            setUploadProgress(0);

            const uploadedFiles: LibraryFile[] = [];

            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];
                setUploadProgress(Math.round((i / selectedFiles.length) * 100));

                try {
                    const formData = new FormData();
                    formData.append("file", file);

                    const response = await fetch(`/api/projects/${projectId}/files`, {
                        method: "POST",
                        body: formData,
                    });

                    if (!response.ok) {
                        const data = await response.json();
                        throw new Error(data.error || "Error subiendo archivo");
                    }

                    const newFile = await response.json();
                    uploadedFiles.push({
                        ...newFile,
                        originalName: newFile.filename,
                    });
                } catch (err) {
                    setError(
                        err instanceof Error ? err.message : "Error subiendo archivos"
                    );
                    break;
                }
            }

            if (uploadedFiles.length > 0) {
                setFiles((prev) => [...uploadedFiles, ...prev]);
            }

            setIsUploading(false);
            setUploadProgress(100);
        },
        [projectId]
    );

    const handleDelete = async (fileId: string) => {
        setIsDeleting(true);
        setError(null);

        try {
            const response = await fetch(`/api/projects/${projectId}/files/${fileId}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Error eliminando archivo");
            }

            setFiles((prev) => prev.filter((f) => f.id !== fileId));
            setDeleteConfirm(null);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Error eliminando archivo"
            );
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDownload = (fileId: string, filename: string) => {
        // Open download URL in new tab
        const link = document.createElement("a");
        link.href = `/api/projects/${projectId}/files/${fileId}/download`;
        link.download = filename;
        link.click();
    };

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            const droppedFiles = e.dataTransfer.files;
            handleUpload(droppedFiles);
        },
        [handleUpload]
    );

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const getFileIcon = (mimeType: string) => {
        if (mimeType.startsWith("image/")) {
            return <FileImage className="w-5 h-5 text-blue-400" />;
        }
        if (mimeType.includes("pdf") || mimeType.includes("document")) {
            return <FileText className="w-5 h-5 text-red-400" />;
        }
        return <File className="w-5 h-5 text-slate-400" />;
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatDate = (dateStr: string): string => {
        return new Date(dateStr).toLocaleDateString("es-ES", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <FolderOpen className="w-5 h-5 text-amber-500" />
                    <h2 className="text-lg font-semibold text-white">Archivos</h2>
                    <span className="text-sm text-slate-400">({files.length})</span>
                </div>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg text-sm font-medium transition-colors"
                >
                    {isUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Upload className="w-4 h-4" />
                    )}
                    Subir
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => e.target.files && handleUpload(e.target.files)}
                />
            </div>

            {/* Error message */}
            {error && (
                <div className="flex items-center gap-2 px-5 py-3 bg-red-500/10 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Upload progress */}
            {isUploading && (
                <div className="px-5 py-3 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        <div className="flex-1">
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 transition-all"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>
                        <span className="text-sm text-slate-400">{uploadProgress}%</span>
                    </div>
                </div>
            )}

            {/* Files list or dropzone */}
            {files.length === 0 ? (
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-slate-700 m-4 rounded-lg"
                >
                    <Upload className="w-10 h-10 text-slate-500 mb-3" />
                    <p className="text-slate-400 text-center mb-2">
                        Arrastra archivos aquí o
                    </p>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-blue-400 hover:text-blue-300 font-medium"
                    >
                        selecciona desde tu computadora
                    </button>
                </div>
            ) : (
                <div className="divide-y divide-slate-800">
                    {files.map((file) => (
                        <div
                            key={file.id}
                            className="flex items-center gap-3 px-5 py-3 hover:bg-slate-800/50 transition-colors"
                        >
                            {getFileIcon(file.mimeType)}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                    {file.originalName}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {formatFileSize(file.size)} • {formatDate(file.createdAt)}
                                </p>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => handleDownload(file.id, file.originalName)}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                    title="Descargar"
                                >
                                    <Download className="w-4 h-4" />
                                </button>
                                {deleteConfirm === file.id ? (
                                    <div className="flex items-center gap-1 bg-red-500/20 rounded-lg px-2 py-1">
                                        <button
                                            onClick={() => handleDelete(file.id)}
                                            disabled={isDeleting}
                                            className="text-xs text-red-400 hover:text-red-300 font-medium"
                                        >
                                            {isDeleting ? "..." : "Confirmar"}
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirm(null)}
                                            className="text-slate-400 hover:text-white"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setDeleteConfirm(file.id)}
                                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Drop zone overlay for existing files */}
            {files.length > 0 && (
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="py-3 px-5 border-t border-slate-800 text-center"
                >
                    <p className="text-xs text-slate-500">
                        Arrastra archivos aquí para subirlos
                    </p>
                </div>
            )}
        </div>
    );
}
