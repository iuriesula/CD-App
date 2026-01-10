"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";

interface MessageComposerProps {
  requestId: string;
  onSent?: () => void;
}

export function MessageComposer({ requestId, onSent }: MessageComposerProps) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFile = async (file: File): Promise<{ fileName: string; fileUrl: string; mimeType: string; size: number }> => {
    // For now, upload to a temporary location
    // In production, you'd upload to S3, Cloudinary, or similar
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`/api/requests/${requestId}/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to upload file");
    }

    const data = await response.json();
    return data.file;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && selectedFiles.length === 0) return;

    setIsSubmitting(true);
    setError("");

    try {
      // Send message
      const messageResponse = await fetch(`/api/requests/${requestId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() || "(File attached)" }),
      });

      if (!messageResponse.ok) {
        const data = await messageResponse.json();
        throw new Error(data.error || "Failed to send message");
      }

      const { message: createdMessage } = await messageResponse.json();

      // Upload and attach files
      for (const file of selectedFiles) {
        const uploadedFile = await uploadFile(file);

        await fetch(`/api/requests/${requestId}/attachments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messageId: createdMessage.id,
            fileName: uploadedFile.fileName,
            fileUrl: uploadedFile.fileUrl,
            mimeType: uploadedFile.mimeType,
            size: uploadedFile.size,
          }),
        });
      }

      setMessage("");
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          rows={3}
          disabled={isSubmitting}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-700">Attachments ({selectedFiles.length})</div>
          {selectedFiles.map((file, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg">
              <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-900 truncate">{file.name}</div>
                <div className="text-xs text-gray-500">{Math.round(file.size / 1024)}KB</div>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                disabled={isSubmitting}
                className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            disabled={isSubmitting}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            className="hidden"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSubmitting}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            Attach Files
          </Button>
        </div>
        <Button
          type="submit"
          disabled={(!message.trim() && selectedFiles.length === 0) || isSubmitting}
          loading={isSubmitting}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          Send {selectedFiles.length > 0 && `(${selectedFiles.length} file${selectedFiles.length > 1 ? "s" : ""})`}
        </Button>
      </div>
    </form>
  );
}
