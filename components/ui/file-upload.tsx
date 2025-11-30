"use client";

import React, { useCallback, useState } from "react";
import { Upload, X, Image, FileText, Loader2 } from "lucide-react";
import { Button } from "./button";

interface FileUploadProps {
  onUpload: (result: { url: string; filename: string; size: number; type: string }) => void;
  onError?: (error: string) => void;
  type?: "avatar" | "message" | "group-avatar";
  accept?: string;
  maxSize?: number;
  className?: string;
  children?: React.ReactNode;
  showPreview?: boolean;
  currentImage?: string;
}

export function FileUpload({
  onUpload,
  onError,
  type = "message",
  accept = "image/*",
  maxSize = 10 * 1024 * 1024,
  className = "",
  children,
  showPreview = false,
  currentImage,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);

  const handleFile = useCallback(
    async (file: File) => {
      if (file.size > maxSize) {
        onError?.(`File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`);
        return;
      }

      // Show preview for images
      if (showPreview && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(file);
      }

      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", type);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Upload failed");
        }

        const result = await response.json();
        onUpload(result);
      } catch (error) {
        onError?.(error instanceof Error ? error.message : "Upload failed");
        setPreview(currentImage || null);
      } finally {
        setIsUploading(false);
      }
    },
    [maxSize, onError, onUpload, showPreview, type, currentImage]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const clearPreview = useCallback(() => {
    setPreview(currentImage || null);
  }, [currentImage]);

  if (children) {
    return (
      <label className={`cursor-pointer ${className}`}>
        <input
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
          disabled={isUploading}
        />
        {isUploading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          children
        )}
      </label>
    );
  }

  return (
    <div className={className}>
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {showPreview && preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="max-h-48 mx-auto rounded-lg object-cover"
            />
            <button
              onClick={clearPreview}
              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center cursor-pointer">
            <input
              type="file"
              accept={accept}
              onChange={handleInputChange}
              className="hidden"
              disabled={isUploading}
            />
            {isUploading ? (
              <Loader2 className="h-12 w-12 text-gray-400 animate-spin" />
            ) : (
              <>
                <Upload className="h-12 w-12 text-gray-400 mb-3" />
                <p className="text-sm text-gray-600 text-center">
                  <span className="font-medium text-blue-600 hover:text-blue-500">
                    Click to upload
                  </span>{" "}
                  or drag and drop
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {type === "avatar" || type === "group-avatar"
                    ? "PNG, JPG, GIF up to 10MB"
                    : "Images, PDF, Documents up to 10MB"}
                </p>
              </>
            )}
          </label>
        )}
      </div>
    </div>
  );
}

interface ImagePreviewProps {
  url: string;
  filename?: string;
  onRemove?: () => void;
  size?: "sm" | "md" | "lg";
}

export function ImagePreview({ url, filename, onRemove, size = "md" }: ImagePreviewProps) {
  const sizes = {
    sm: "h-16 w-16",
    md: "h-24 w-24",
    lg: "h-32 w-32",
  };

  return (
    <div className="relative group">
      <img
        src={url}
        alt={filename || "Image"}
        className={`${sizes[size]} object-cover rounded-lg`}
      />
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

interface FilePreviewProps {
  url: string;
  filename: string;
  size: number;
  type: string;
  onRemove?: () => void;
}

export function FilePreview({ url, filename, size, type, onRemove }: FilePreviewProps) {
  const isImage = type.startsWith("image/");
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isImage) {
    return <ImagePreview url={url} filename={filename} onRemove={onRemove} />;
  }

  return (
    <div className="relative group flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
      <FileText className="h-8 w-8 text-gray-400" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{filename}</p>
        <p className="text-xs text-gray-500">{formatSize(size)}</p>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="p-1 text-gray-400 hover:text-red-500"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
