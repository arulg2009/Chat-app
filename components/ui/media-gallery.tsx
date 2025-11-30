"use client";

import React, { useState, useEffect } from "react";
import { X, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

interface ImageViewerProps {
  images: { url: string; id: string; createdAt: string; sender?: { name: string | null } }[];
  initialIndex: number;
  onClose: () => void;
}

export function ImageViewer({ images, initialIndex, onClose }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);

  const currentImage = images[currentIndex];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goToPrevious();
      if (e.key === "ArrowRight") goToNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    setZoom(1);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    setZoom(1);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(currentImage.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `image-${currentImage.id}.jpg`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const toggleZoom = () => {
    setZoom((prev) => (prev === 1 ? 2 : 1));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 text-white">
        <div>
          <p className="text-sm opacity-80">
            {currentIndex + 1} of {images.length}
          </p>
          {currentImage.sender?.name && (
            <p className="text-xs opacity-60">Shared by {currentImage.sender.name}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleZoom}
            className="p-2 hover:bg-white/10 rounded-lg transition"
          >
            {zoom === 1 ? <ZoomIn className="w-5 h-5" /> : <ZoomOut className="w-5 h-5" />}
          </button>
          <button
            onClick={handleDownload}
            className="p-2 hover:bg-white/10 rounded-lg transition"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Image */}
      <div className="flex-1 flex items-center justify-center overflow-hidden relative">
        {images.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition z-10"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition z-10"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          </>
        )}
        <img
          src={currentImage.url}
          alt="Full size"
          className="max-h-full max-w-full object-contain transition-transform duration-200"
          style={{ transform: `scale(${zoom})` }}
          onClick={toggleZoom}
        />
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="p-4 flex justify-center gap-2 overflow-x-auto">
          {images.map((img, idx) => (
            <button
              key={img.id}
              onClick={() => {
                setCurrentIndex(idx);
                setZoom(1);
              }}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition ${
                idx === currentIndex ? "border-white" : "border-transparent opacity-50 hover:opacity-75"
              }`}
            >
              <img src={img.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface MediaGalleryProps {
  type: "conversation" | "group";
  id: string;
}

export function MediaGallery({ type, id }: MediaGalleryProps) {
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [filter, setFilter] = useState<"all" | "image" | "file">("image");

  useEffect(() => {
    fetchMedia();
  }, [id, filter]);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const endpoint = type === "conversation" 
        ? `/api/conversations/${id}/media?type=${filter}`
        : `/api/groups/${id}/media?type=${filter}`;
      
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        setMedia(data);
      }
    } catch (error) {
      console.error("Error fetching media:", error);
    } finally {
      setLoading(false);
    }
  };

  const openViewer = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  const images = media.filter((m) => m.type === "image").map((m) => ({
    url: m.content,
    id: m.id,
    createdAt: m.createdAt,
    sender: m.sender,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { value: "image", label: "Photos" },
          { value: "file", label: "Files" },
          { value: "all", label: "All" },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value as typeof filter)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === tab.value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Media Grid */}
      {media.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No {filter === "all" ? "media" : filter === "image" ? "photos" : "files"} shared yet
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {media.map((item, idx) => (
            <div
              key={item.id}
              className="aspect-square rounded-lg overflow-hidden cursor-pointer group relative bg-gray-100"
              onClick={() => item.type === "image" && openViewer(images.findIndex((i) => i.id === item.id))}
            >
              {item.type === "image" ? (
                <>
                  <img
                    src={item.content}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center p-2">
                    <div className="w-10 h-10 mx-auto mb-1 bg-gray-200 rounded-lg flex items-center justify-center">
                      📄
                    </div>
                    <p className="text-xs text-gray-600 truncate">File</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Image Viewer */}
      {viewerOpen && images.length > 0 && (
        <ImageViewer
          images={images}
          initialIndex={viewerIndex}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </div>
  );
}
