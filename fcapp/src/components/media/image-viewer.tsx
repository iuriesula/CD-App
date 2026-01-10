"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface ImageViewerProps {
  imageUrl: string;
  imageName: string;
  images?: { url: string; name: string; id: string }[];
  currentIndex?: number;
  onClose: () => void;
  onNavigate?: (index: number) => void;
}

export function ImageViewer({
  imageUrl,
  imageName,
  images = [],
  currentIndex = 0,
  onClose,
  onNavigate,
}: ImageViewerProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageInfo, setImageInfo] = useState<{ width: number; height: number; size: string } | null>(null);

  const hasMultipleImages = images.length > 1;
  const currentImage = hasMultipleImages ? images[currentIndex] : { url: imageUrl, name: imageName };

  useEffect(() => {
    // Reset position and scale when image changes
    setScale(1);
    setPosition({ x: 0, y: 0 });

    // Load image info
    const img = new Image();
    img.src = currentImage.url;
    img.onload = () => {
      setImageInfo({
        width: img.naturalWidth,
        height: img.naturalHeight,
        size: `${img.naturalWidth} × ${img.naturalHeight}`,
      });
    };
  }, [currentImage.url]);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 5));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.25));
  };

  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleNext = () => {
    if (hasMultipleImages && currentIndex < images.length - 1) {
      onNavigate?.(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (hasMultipleImages && currentIndex > 0) {
      onNavigate?.(currentIndex - 1);
    }
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = currentImage.url;
    link.download = currentImage.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowLeft") handlePrevious();
    if (e.key === "ArrowRight") handleNext();
    if (e.key === "+") handleZoomIn();
    if (e.key === "-") handleZoomOut();
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, images]);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <h2 className="text-white font-medium truncate max-w-md">{currentImage.name}</h2>
          {imageInfo && (
            <span className="text-gray-400 text-sm">
              {imageInfo.size}
            </span>
          )}
          {hasMultipleImages && (
            <span className="text-gray-400 text-sm">
              {currentIndex + 1} / {images.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
            <button
              onClick={handleZoomOut}
              disabled={scale <= 0.25}
              className="p-2 hover:bg-white/10 rounded disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
              title="Zoom out (-)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
              </svg>
            </button>

            <span className="text-white text-sm px-2 min-w-[60px] text-center">
              {Math.round(scale * 100)}%
            </span>

            <button
              onClick={handleZoomIn}
              disabled={scale >= 5}
              className="p-2 hover:bg-white/10 rounded disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
              title="Zoom in (+)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
              </svg>
            </button>

            <button
              onClick={handleResetZoom}
              className="p-2 hover:bg-white/10 rounded text-white transition-colors ml-1"
              title="Reset zoom"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {/* Download */}
          <button
            onClick={handleDownload}
            className="p-2 hover:bg-white/10 rounded text-white transition-colors"
            title="Download"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded text-white transition-colors"
            title="Close (Esc)"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Image Container */}
      <div
        className="flex-1 flex items-center justify-center relative overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
      >
        <img
          src={currentImage.url}
          alt={currentImage.name}
          className="max-w-none select-none transition-transform duration-200"
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            maxHeight: scale === 1 ? "90%" : "none",
            maxWidth: scale === 1 ? "90%" : "none",
          }}
          draggable={false}
        />

        {/* Navigation Arrows */}
        {hasMultipleImages && (
          <>
            {currentIndex > 0 && (
              <button
                onClick={handlePrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                title="Previous (←)"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {currentIndex < images.length - 1 && (
              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                title="Next (→)"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 bg-black/50 backdrop-blur-sm text-center">
        <p className="text-gray-400 text-sm">
          Use mouse wheel or +/- to zoom • Drag to pan when zoomed • Arrow keys to navigate
        </p>
      </div>
    </div>
  );
}
