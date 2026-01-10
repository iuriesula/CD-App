"use client";

import { useState, useEffect, useRef, DragEvent } from "react";
import { useRouter } from "next/navigation";
import { ImageViewer } from "@/components/media/image-viewer";

interface MediaItem {
  id: string;
  name: string;
  type: string;
  url: string;
  mimeType: string | null;
  size: number | null;
  folder: string | null;
  createdAt: string;
}

interface Dealership {
  id: string;
  name: string;
  city?: string;
  state?: string;
}

export default function MediaPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);

  // Modals
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDealershipSelector, setShowDealershipSelector] = useState(false);

  const [newFolderName, setNewFolderName] = useState("");
  const [renameTarget, setRenameTarget] = useState<MediaItem | null>(null);
  const [renameName, setRenameName] = useState("");
  const [moveTarget, setMoveTarget] = useState<MediaItem | null>(null);
  const [moveDestination, setMoveDestination] = useState<string | null>(null);
  const [viewerImageIndex, setViewerImageIndex] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);

  const [dealershipId, setDealershipId] = useState<string | null>(null);
  const [selectedDealership, setSelectedDealership] = useState<Dealership | null>(null);
  const [isAgencyAdmin, setIsAgencyAdmin] = useState(false);
  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [dealershipSearchQuery, setDealershipSearchQuery] = useState("");
  const [folders, setFolders] = useState<MediaItem[]>([]);

  // Fetch session to get dealership ID or check if agency admin
  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.session?.role === "agency_admin") {
          setIsAgencyAdmin(true);
          // Fetch dealerships for agency admin
          fetchDealerships();
        } else if (data.session?.dealershipId) {
          setDealershipId(data.session.dealershipId);
        } else {
          console.error("No dealership ID found in session and not agency admin");
        }
      })
      .catch((error) => {
        console.error("Failed to fetch session:", error);
      });
  }, []);

  // Fetch dealerships for agency admin
  const fetchDealerships = async () => {
    try {
      const res = await fetch("/api/dealerships");
      const data = await res.json();
      if (data.dealerships) {
        setDealerships(data.dealerships);
        setShowDealershipSelector(true);
      }
    } catch (error) {
      console.error("Failed to fetch dealerships:", error);
    }
  };

  // Handle dealership selection
  const handleSelectDealership = (dealership: Dealership) => {
    setDealershipId(dealership.id);
    setSelectedDealership(dealership);
    setShowDealershipSelector(false);
  };

  // Fetch media items
  const fetchMedia = async () => {
    if (!dealershipId) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentFolder) {
        params.set("folder", currentFolder);
      }

      const res = await fetch(`/api/dealerships/${dealershipId}/media?${params}`);
      const data = await res.json();

      if (data.media) {
        setMedia(data.media);
      }
    } catch (error) {
      console.error("Failed to fetch media:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all folders for move modal
  const fetchAllFolders = async () => {
    if (!dealershipId) return;

    try {
      const res = await fetch(`/api/dealerships/${dealershipId}/media`);
      const data = await res.json();

      if (data.media) {
        const allFolders = data.media.filter((item: MediaItem) => item.type === "folder");
        setFolders(allFolders);
      }
    } catch (error) {
      console.error("Failed to fetch folders:", error);
    }
  };

  useEffect(() => {
    if (dealershipId) {
      fetchMedia();
      fetchAllFolders();
    }
  }, [dealershipId, currentFolder]);

  // Breadcrumb navigation
  const getFolderPath = (): string[] => {
    if (!currentFolder) return [];
    return currentFolder.split("/");
  };

  const navigateToFolder = (folderPath: string | null) => {
    setCurrentFolder(folderPath);
    setSelectedItems(new Set());
  };

  const navigateToBreadcrumb = (index: number) => {
    const path = getFolderPath();
    if (index === -1) {
      navigateToFolder(null);
    } else {
      const newPath = path.slice(0, index + 1).join("/");
      navigateToFolder(newPath);
    }
  };

  // File upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      console.log("No files selected");
      return;
    }

    if (!dealershipId) {
      alert("Dealership ID not found. Please refresh the page.");
      console.error("No dealershipId available for upload");
      return;
    }

    console.log(`Uploading ${files.length} file(s) to dealership ${dealershipId}`);
    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`Uploading file ${i + 1}/${files.length}:`, file.name, file.type, file.size);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "general");
      formData.append("name", file.name);
      if (currentFolder) {
        formData.append("folder", currentFolder);
      }

      try {
        const res = await fetch(`/api/dealerships/${dealershipId}/media`, {
          method: "POST",
          body: formData,
        });

        console.log(`Upload response for ${file.name}:`, res.status);

        if (!res.ok) {
          const error = await res.json();
          console.error(`Upload error for ${file.name}:`, error);
          alert(`Failed to upload ${file.name}: ${error.error}`);
        } else {
          console.log(`Successfully uploaded ${file.name}`);
        }
      } catch (error) {
        console.error(`Upload failed for ${file.name}:`, error);
        alert(`Failed to upload ${file.name}: ${String(error)}`);
      }
    }

    setUploading(false);
    fetchMedia();
  };

  // Handle folder upload (preserves folder structure)
  const handleFolderUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    if (!dealershipId) {
      alert("Dealership ID not found. Please refresh the page.");
      return;
    }

    setUploading(true);

    // Build folder structure from files
    const folderStructure = new Map<string, boolean>(); // path -> created
    const filesByPath: { file: File; folderPath: string }[] = [];

    // Analyze all files to extract folder structure
    for (let i = 0; i < files.length; i++) {
      const file = files[i] as File & { webkitRelativePath?: string };
      const relativePath = file.webkitRelativePath || file.name;
      const pathParts = relativePath.split("/");

      // If file is in a subfolder, extract the folder path
      if (pathParts.length > 1) {
        // Build folder path progressively (e.g., "folder1", "folder1/subfolder")
        let accumulatedPath = "";
        for (let j = 0; j < pathParts.length - 1; j++) {
          accumulatedPath = accumulatedPath ? `${accumulatedPath}/${pathParts[j]}` : pathParts[j];
          folderStructure.set(accumulatedPath, false);
        }

        // Store file with its folder path
        const folderPath = pathParts.slice(0, -1).join("/");
        filesByPath.push({ file, folderPath });
      } else {
        // File in root
        filesByPath.push({ file, folderPath: "" });
      }
    }

    // Create folders first (in order)
    const sortedFolders = Array.from(folderStructure.keys()).sort((a, b) => {
      // Sort by depth (shallow first)
      const depthA = a.split("/").length;
      const depthB = b.split("/").length;
      return depthA - depthB;
    });

    for (const folderPath of sortedFolders) {
      const pathParts = folderPath.split("/");
      const folderName = pathParts[pathParts.length - 1];
      const parentPath = pathParts.slice(0, -1).join("/");

      // Calculate full folder path (currentFolder + uploaded folder structure)
      const fullParentPath = currentFolder
        ? parentPath
          ? `${currentFolder}/${parentPath}`
          : currentFolder
        : parentPath || null;

      const formData = new FormData();
      formData.append("type", "folder");
      formData.append("name", folderName);
      if (fullParentPath) {
        formData.append("folder", fullParentPath);
      }

      try {
        const res = await fetch(`/api/dealerships/${dealershipId}/media`, {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          folderStructure.set(folderPath, true);
        }
      } catch (error) {
        console.error(`Failed to create folder ${folderPath}:`, error);
      }
    }

    // Upload files
    for (const { file, folderPath } of filesByPath) {
      const fullFolderPath = currentFolder
        ? folderPath
          ? `${currentFolder}/${folderPath}`
          : currentFolder
        : folderPath || null;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "general");
      formData.append("name", file.name);
      if (fullFolderPath) {
        formData.append("folder", fullFolderPath);
      }

      try {
        const res = await fetch(`/api/dealerships/${dealershipId}/media`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const error = await res.json();
          console.error(`Failed to upload ${file.name}:`, error);
        }
      } catch (error) {
        console.error(`Upload failed for ${file.name}:`, error);
      }
    }

    setUploading(false);
    fetchMedia();
  };

  // Drag & Drop
  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    handleFileUpload(files);
  };

  // Create folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      alert("Please enter a folder name");
      return;
    }

    if (!dealershipId) {
      alert("Dealership ID not found. Please refresh the page.");
      console.error("No dealershipId available");
      return;
    }

    console.log("Creating folder:", newFolderName.trim(), "in", currentFolder || "root");

    const formData = new FormData();
    formData.append("type", "folder");
    formData.append("name", newFolderName.trim());
    if (currentFolder) {
      formData.append("folder", currentFolder);
    }

    try {
      const res = await fetch(`/api/dealerships/${dealershipId}/media`, {
        method: "POST",
        body: formData,
      });

      console.log("Create folder response status:", res.status);

      if (res.ok) {
        setShowNewFolderModal(false);
        setNewFolderName("");
        fetchMedia();
        fetchAllFolders();
      } else {
        const error = await res.json();
        console.error("Create folder error:", error);
        alert(error.error || "Failed to create folder");
      }
    } catch (error) {
      console.error("Failed to create folder:", error);
      alert("Failed to create folder: " + String(error));
    }
  };

  // Rename item
  const handleRename = async () => {
    if (!renameTarget || !renameName.trim() || !dealershipId) return;

    try {
      const res = await fetch(`/api/dealerships/${dealershipId}/media`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaId: renameTarget.id,
          name: renameName.trim(),
        }),
      });

      if (res.ok) {
        setShowRenameModal(false);
        setRenameTarget(null);
        setRenameName("");
        fetchMedia();
        fetchAllFolders();
      } else {
        const error = await res.json();
        alert(error.error);
      }
    } catch (error) {
      console.error("Failed to rename:", error);
      alert("Failed to rename item");
    }
  };

  // Move item
  const handleMove = async () => {
    if (!moveTarget || !dealershipId) return;

    try {
      const res = await fetch(`/api/dealerships/${dealershipId}/media`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaId: moveTarget.id,
          folder: moveDestination || null,
        }),
      });

      if (res.ok) {
        setShowMoveModal(false);
        setMoveTarget(null);
        setMoveDestination(null);
        fetchMedia();
      } else {
        const error = await res.json();
        alert(error.error);
      }
    } catch (error) {
      console.error("Failed to move:", error);
      alert("Failed to move item");
    }
  };

  // Delete item
  const handleDelete = async () => {
    if (!deleteTarget || !dealershipId) return;

    try {
      const res = await fetch(
        `/api/dealerships/${dealershipId}/media?mediaId=${deleteTarget.id}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        setShowDeleteConfirm(false);
        setDeleteTarget(null);
        fetchMedia();
        fetchAllFolders();
      } else {
        const error = await res.json();
        alert(error.error);
      }
    } catch (error) {
      console.error("Failed to delete:", error);
      alert("Failed to delete item");
    }
  };

  // Open item (folder or file)
  const handleOpenItem = (item: MediaItem) => {
    if (item.type === "folder") {
      const newPath = currentFolder ? `${currentFolder}/${item.name}` : item.name;
      navigateToFolder(newPath);
    } else if (item.mimeType?.startsWith("image/")) {
      // Get all images in current view for navigation
      const images = filteredMedia.filter(m => m.mimeType?.startsWith("image/"));
      const index = images.findIndex(img => img.id === item.id);
      setViewerImageIndex(index >= 0 ? index : 0);
      setShowImageViewer(true);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Filter media by search
  const filteredMedia = media.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter dealerships by search
  const filteredDealerships = dealerships.filter((d) =>
    d.name.toLowerCase().includes(dealershipSearchQuery.toLowerCase()) ||
    d.city?.toLowerCase().includes(dealershipSearchQuery.toLowerCase()) ||
    d.state?.toLowerCase().includes(dealershipSearchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Media Library</h1>
            <p className="text-gray-600">
              {selectedDealership ? (
                <>
                  Managing media for <strong>{selectedDealership.name}</strong>
                </>
              ) : (
                "Manage your dealership's files and folders"
              )}
            </p>
          </div>
          {isAgencyAdmin && selectedDealership && (
            <button
              onClick={() => setShowDealershipSelector(true)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Change Dealership
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      {dealershipId && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Left: Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNewFolderModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Folder
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {uploading ? "Uploading..." : "Upload Files"}
              </button>

              <button
                onClick={() => folderInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11v6m-3-3h6" />
                </svg>
                {uploading ? "Uploading..." : "Upload Folder"}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />

              <input
                ref={folderInputRef}
                type="file"
                {...({ webkitdirectory: "", directory: "" } as any)}
                multiple
                onChange={(e) => handleFolderUpload(e.target.files)}
                className="hidden"
              />
            </div>

          {/* Right: Search & View Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />

            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded ${viewMode === "grid" ? "bg-white shadow-sm" : "hover:bg-gray-200"}`}
                title="Grid View"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded ${viewMode === "list" ? "bg-white shadow-sm" : "hover:bg-gray-200"}`}
                title="List View"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      {dealershipId && currentFolder && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <button
            onClick={() => navigateToBreadcrumb(-1)}
            className="text-blue-600 hover:underline"
          >
            Home
          </button>
          {getFolderPath().map((folder, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-gray-400">/</span>
              <button
                onClick={() => navigateToBreadcrumb(index)}
                className="text-blue-600 hover:underline"
              >
                {folder}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Content Area */}
      {dealershipId ? (
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`bg-white rounded-lg shadow-sm border-2 ${
          isDragging ? "border-blue-500 border-dashed bg-blue-50" : "border-gray-200"
        } p-6 min-h-[500px] relative`}
      >
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading...</div>
          </div>
        ) : filteredMedia.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <p className="text-lg mb-2">
              {searchQuery ? "No items match your search" : "This folder is empty"}
            </p>
            <p className="text-sm">
              {!searchQuery && "Drag and drop files here or click Upload Files"}
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredMedia.map((item) => (
              <div
                key={item.id}
                className="group relative border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                onDoubleClick={() => handleOpenItem(item)}
              >
                {/* Thumbnail */}
                <div className="aspect-square mb-2 flex items-center justify-center bg-gray-50 rounded">
                  {item.type === "folder" ? (
                    <svg className="w-16 h-16 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                    </svg>
                  ) : item.mimeType?.startsWith("image/") ? (
                    <img
                      src={item.url}
                      alt={item.name}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <svg className="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                    </svg>
                  )}
                </div>

                {/* Name */}
                <p className="text-sm font-medium truncate text-center" title={item.name}>
                  {item.name}
                </p>

                {/* Size (for files) */}
                {item.type !== "folder" && (
                  <p className="text-xs text-gray-500 text-center mt-1">
                    {formatFileSize(item.size)}
                  </p>
                )}

                {/* Context Menu Button */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Show context menu
                        const menu = e.currentTarget.nextElementSibling as HTMLElement;
                        menu.classList.toggle("hidden");
                      }}
                      className="p-1 bg-white rounded shadow-md hover:bg-gray-100"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    <div className="hidden absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenameTarget(item);
                          setRenameName(item.name);
                          setShowRenameModal(true);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                      >
                        Rename
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMoveTarget(item);
                          setMoveDestination(null);
                          setShowMoveModal(true);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                      >
                        Move
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(item);
                          setShowDeleteConfirm(true);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-gray-200">
              <tr className="text-left text-sm text-gray-600">
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Size</th>
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMedia.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onDoubleClick={() => handleOpenItem(item)}
                >
                  <td className="py-3 flex items-center gap-2">
                    {item.type === "folder" ? (
                      <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                      </svg>
                    )}
                    <span className="font-medium">{item.name}</span>
                  </td>
                  <td className="py-3 text-sm text-gray-600">
                    {item.type === "folder" ? "Folder" : item.mimeType || "-"}
                  </td>
                  <td className="py-3 text-sm text-gray-600">{formatFileSize(item.size)}</td>
                  <td className="py-3 text-sm text-gray-600">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenameTarget(item);
                          setRenameName(item.name);
                          setShowRenameModal(true);
                        }}
                        className="p-1 hover:bg-gray-200 rounded"
                        title="Rename"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(item);
                          setShowDeleteConfirm(true);
                        }}
                        className="p-1 hover:bg-red-100 rounded text-red-600"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Drag & Drop Overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-blue-50 bg-opacity-90 border-2 border-dashed border-blue-500 rounded-lg flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <svg className="w-16 h-16 text-blue-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-lg font-medium text-blue-700">Drop files to upload</p>
            </div>
          </div>
        )}
      </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Dealership Selected</h3>
          <p className="text-gray-600 mb-4">Please select a dealership to manage its media library</p>
          {isAgencyAdmin && (
            <button
              onClick={() => setShowDealershipSelector(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Select Dealership
            </button>
          )}
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New Folder</h2>
            <input
              type="text"
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowNewFolderModal(false);
                  setNewFolderName("");
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && renameTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Rename {renameTarget.type === "folder" ? "Folder" : "File"}</h2>
            <input
              type="text"
              placeholder="New name"
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowRenameModal(false);
                  setRenameTarget(null);
                  setRenameName("");
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                disabled={!renameName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Modal */}
      {showMoveModal && moveTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Move {moveTarget.name}</h2>
            <p className="text-sm text-gray-600 mb-4">Select destination folder:</p>

            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg mb-4">
              <button
                onClick={() => setMoveDestination(null)}
                className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${
                  moveDestination === null ? "bg-blue-50 text-blue-700" : ""
                }`}
              >
                📁 Root
              </button>
              {folders.map((folder) => {
                const folderPath = folder.folder ? `${folder.folder}/${folder.name}` : folder.name;
                return (
                  <button
                    key={folder.id}
                    onClick={() => setMoveDestination(folderPath)}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${
                      moveDestination === folderPath ? "bg-blue-50 text-blue-700" : ""
                    }`}
                  >
                    📁 {folderPath}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowMoveModal(false);
                  setMoveTarget(null);
                  setMoveDestination(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleMove}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Move Here
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-red-600">Delete {deleteTarget.type === "folder" ? "Folder" : "File"}?</h2>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer */}
      {showImageViewer && (() => {
        const images = filteredMedia.filter(m => m.mimeType?.startsWith("image/"));
        return images.length > 0 && (
          <ImageViewer
            imageUrl={images[viewerImageIndex]?.url || ""}
            imageName={images[viewerImageIndex]?.name || ""}
            images={images}
            currentIndex={viewerImageIndex}
            onClose={() => setShowImageViewer(false)}
            onNavigate={(index) => setViewerImageIndex(index)}
          />
        );
      })()}

      {/* Dealership Selector Modal (Agency Admin Only) */}
      {showDealershipSelector && isAgencyAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
            <h2 className="text-2xl font-bold mb-4">Select Dealership</h2>
            <p className="text-gray-600 mb-4">Choose which dealership's media you want to manage</p>

            {/* Search Bar */}
            <input
              type="text"
              placeholder="Search dealerships..."
              value={dealershipSearchQuery}
              onChange={(e) => setDealershipSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
              autoFocus
            />

            {/* Dealership List */}
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
              {filteredDealerships.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>No dealerships found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredDealerships.map((dealership) => (
                    <button
                      key={dealership.id}
                      onClick={() => handleSelectDealership(dealership)}
                      className="w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{dealership.name}</h3>
                          {(dealership.city || dealership.state) && (
                            <p className="text-sm text-gray-500 mt-1">
                              {[dealership.city, dealership.state].filter(Boolean).join(", ")}
                            </p>
                          )}
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}