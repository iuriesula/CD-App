"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  category: string;
}

interface EmailSignature {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
}

interface Lead {
  firstName?: string;
  lastName?: string;
  interestedVehicle?: string;
}

interface EmailComposerProps {
  leadId: string;
  recipientEmail: string;
  recipientName?: string;
  lead?: Lead;
  dealershipName?: string;
  senderName?: string;
  dealershipId?: string;
  onClose: () => void;
  onSent?: () => void;
}

export function EmailComposer({
  leadId,
  recipientEmail,
  recipientName,
  lead,
  dealershipName,
  senderName,
  dealershipId,
  onClose,
  onSent,
}: EmailComposerProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [signatures, setSignatures] = useState<EmailSignature[]>([]);
  const [selectedSignature, setSelectedSignature] = useState<string>("");
  const [loadingResources, setLoadingResources] = useState(true);

  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [showSignatureDropdown, setShowSignatureDropdown] = useState(false);

  // Media picker for inserting images
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [imageSearchQuery, setImageSearchQuery] = useState("");

  // Undo send feature
  const [showUndoNotification, setShowUndoNotification] = useState(false);
  const [undoCountdown, setUndoCountdown] = useState(10);
  const [pendingEmailData, setPendingEmailData] = useState<any>(null);
  const [sendTimeout, setSendTimeout] = useState<NodeJS.Timeout | null>(null);
  const [countdownInterval, setCountdownInterval] = useState<NodeJS.Timeout | null>(null);

  const bodyRef = useRef<HTMLDivElement>(null);
  const signatureDropdownRef = useRef<HTMLDivElement>(null);

  // Sync body state with contentEditable innerHTML
  useEffect(() => {
    if (bodyRef.current && bodyRef.current.innerHTML !== body) {
      bodyRef.current.innerHTML = body;
    }
  }, [body]);

  useEffect(() => {
    loadResources();
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (sendTimeout) clearTimeout(sendTimeout);
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [sendTimeout, countdownInterval]);

  // Close signature dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        signatureDropdownRef.current &&
        !signatureDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSignatureDropdown(false);
      }
    };

    if (showSignatureDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSignatureDropdown]);

  const loadResources = async () => {
    try {
      const [templatesRes, signaturesRes] = await Promise.all([
        fetch("/api/email/templates?activeOnly=true"),
        fetch("/api/email/signatures"),
      ]);

      const templatesData = await templatesRes.json();
      const signaturesData = await signaturesRes.json();

      setTemplates(templatesData.templates || []);
      setSignatures(signaturesData.signatures || []);

      // Set default signature and insert into body
      const defaultSig = (signaturesData.signatures || []).find(
        (s: EmailSignature) => s.isDefault
      );
      if (defaultSig) {
        setSelectedSignature(defaultSig.id);
        // Auto-insert default signature into body
        const separator = "\n\n---\n\n";
        const signatureBody = separator + defaultSig.content;
        setBody(signatureBody);
        if (bodyRef.current) {
          bodyRef.current.innerHTML = signatureBody;
        }
      }
    } catch (error) {
      console.error("Failed to load email resources:", error);
    } finally {
      setLoadingResources(false);
    }
  };

  const replaceVariables = (text: string): string => {
    const firstName = lead?.firstName || recipientName?.split(" ")[0] || "";
    const lastName = lead?.lastName || recipientName?.split(" ").slice(1).join(" ") || "";
    const fullName = recipientName || [firstName, lastName].filter(Boolean).join(" ");

    return text
      .replace(/\{\{firstName\}\}/gi, firstName)
      .replace(/\{\{lastName\}\}/gi, lastName)
      .replace(/\{\{fullName\}\}/gi, fullName)
      .replace(/\{\{vehicleName\}\}/gi, lead?.interestedVehicle || "")
      .replace(/\{\{dealershipName\}\}/gi, dealershipName || "")
      .replace(/\{\{senderName\}\}/gi, senderName || "");
  };

  const applyTemplate = (template: EmailTemplate) => {
    setSubject(replaceVariables(template.subject));
    const cleanBody = replaceVariables(template.bodyHtml.replace(/<[^>]*>/g, ""));
    setBody(cleanBody);
    if (bodyRef.current) {
      bodyRef.current.innerHTML = cleanBody;
    }
    setShowTemplateDropdown(false);
  };

  const getSignatureContent = (signatureId?: string): string => {
    const sigId = signatureId || selectedSignature;
    if (!sigId) return "";
    const sig = signatures.find((s) => s.id === sigId);
    return sig ? sig.content : "";
  };

  const insertSignatureIntoBody = (signatureId: string) => {
    const signatureContent = getSignatureContent(signatureId);
    if (!signatureContent) return;

    const separator = "\n\n---\n\n";
    const newBody = separator + signatureContent;

    setBody(newBody);
    if (bodyRef.current) {
      bodyRef.current.innerHTML = newBody;
    }
  };

  const removeSignatureFromBody = () => {
    const currentContent = bodyRef.current?.innerHTML || body;
    // Remove everything from the separator onwards
    const separatorIndex = currentContent.indexOf("---");
    if (separatorIndex !== -1) {
      const contentWithoutSignature = currentContent.substring(0, separatorIndex).trim();
      setBody(contentWithoutSignature);
      if (bodyRef.current) {
        bodyRef.current.innerHTML = contentWithoutSignature;
      }
    }
  };

  const changeSignature = (newSignatureId: string) => {
    removeSignatureFromBody();
    setSelectedSignature(newSignatureId);
    if (newSignatureId) {
      insertSignatureIntoBody(newSignatureId);
    }
    setShowSignatureDropdown(false);
  };

  const loadMedia = async () => {
    if (!dealershipId) return;

    setLoadingMedia(true);
    try {
      const res = await fetch(`/api/dealerships/${dealershipId}/media`);
      const data = await res.json();

      // Filter only images
      const images = (data.media || []).filter((item: any) =>
        item.type !== "folder" && item.mimeType?.startsWith("image/")
      );
      setMediaItems(images);
    } catch (error) {
      console.error("Failed to load media:", error);
    } finally {
      setLoadingMedia(false);
    }
  };

  const handleOpenMediaPicker = () => {
    setShowMediaPicker(true);
    setSelectedImages(new Set());
    loadMedia();
  };

  const handleToggleImageSelection = (imageId: string) => {
    const newSelection = new Set(selectedImages);
    if (newSelection.has(imageId)) {
      newSelection.delete(imageId);
    } else {
      newSelection.add(imageId);
    }
    setSelectedImages(newSelection);
  };

  const handleInsertImages = () => {
    const selectedImageData = mediaItems.filter(item => selectedImages.has(item.id));

    if (bodyRef.current) {
      // Create image elements with inline thumbnails (max 200px height for preview)
      const imageElements = selectedImageData
        .map(item => `<img src="${item.url}" alt="${item.name}" style="max-width: 100%; max-height: 200px; height: auto; margin: 10px 5px; border-radius: 4px; object-fit: contain;" />`)
        .join('');

      // Insert at the end of current content
      const currentContent = bodyRef.current.innerHTML;
      bodyRef.current.innerHTML = currentContent + '<br>' + imageElements + '<br>';
      setBody(bodyRef.current.innerHTML);
    }

    // Close modal and reset selection
    setShowMediaPicker(false);
    setSelectedImages(new Set());
  };

  const actualSend = async (emailData: any) => {
    try {
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      // Clear timers
      if (sendTimeout) clearTimeout(sendTimeout);
      if (countdownInterval) clearInterval(countdownInterval);

      setShowUndoNotification(false);
      onSent?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email");
      setShowUndoNotification(false);
      setSending(false);
    }
  };

  const handleUndo = () => {
    // Cancel the scheduled send
    if (sendTimeout) clearTimeout(sendTimeout);
    if (countdownInterval) clearInterval(countdownInterval);

    // Restore the email content
    if (pendingEmailData) {
      setSubject(pendingEmailData.originalSubject);
      setBody(pendingEmailData.originalBody);
    }

    // Reset state
    setShowUndoNotification(false);
    setSending(false);
    setPendingEmailData(null);
    setUndoCountdown(10);
  };

  const handleSend = async () => {
    if (!subject.trim()) {
      setError("Subject is required");
      return;
    }

    const bodyContent = bodyRef.current?.innerHTML || body;
    const bodyTextContent = bodyRef.current?.innerText || body;

    if (!bodyTextContent.trim()) {
      setError("Message body is required");
      return;
    }

    setSending(true);
    setError(null);

    // Signature is already in the body, no need to append it again
    const emailData = {
      leadId,
      to: recipientEmail,
      subject,
      bodyText: bodyTextContent,
      bodyHtml: `<div style="font-family: sans-serif; line-height: 1.6;">${bodyContent}</div>`,
    };

    // Store original data for undo
    setPendingEmailData({
      ...emailData,
      originalSubject: subject,
      originalBody: body,
    });

    // Show undo notification
    setShowUndoNotification(true);
    setUndoCountdown(10);

    // Start countdown
    const interval = setInterval(() => {
      setUndoCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setCountdownInterval(interval);

    // Schedule the actual send after 10 seconds
    const timeout = setTimeout(() => {
      actualSend(emailData);
    }, 10000);
    setSendTimeout(timeout);
  };

  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.category]) acc[template.category] = [];
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, EmailTemplate[]>);

  const categoryLabels: Record<string, string> = {
    follow_up: "Follow-up",
    introduction: "Introduction",
    offer: "Offer",
    thank_you: "Thank You",
    car_description: "Car Description",
    custom: "Custom",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-5xl mx-4 max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Compose Email</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 flex-1 overflow-auto">
          {/* Template Selector */}
          {templates.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Use Template
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showTemplateDropdown && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-64 overflow-auto">
                  {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                    <div key={category}>
                      <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 uppercase">
                        {categoryLabels[category] || category}
                      </div>
                      {categoryTemplates.map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => applyTemplate(template)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                          {template.name}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
              {recipientName ? `${recipientName} <${recipientEmail}>` : recipientEmail}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter subject..."
              autoFocus
            />
          </div>

          {/* Body */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <div
              ref={bodyRef}
              contentEditable
              dir="ltr"
              onInput={(e) => setBody(e.currentTarget.innerHTML)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[500px] resize-y overflow-y-auto focus:outline-none [direction:ltr] [text-align:left] [unicode-bidi:embed]"
              style={{ whiteSpace: 'pre-wrap', direction: 'ltr', textAlign: 'left', unicodeBidi: 'embed' }}
            />
            {!body && (
              <div className="absolute top-[2.5rem] left-3 text-gray-400 pointer-events-none">
                Write your message...
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              Press Ctrl+Enter to send
            </span>
            {dealershipId && (
              <button
                type="button"
                onClick={handleOpenMediaPicker}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={sending}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Insert Images
              </button>
            )}
            {signatures.length > 0 && (
              <div className="relative" ref={signatureDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowSignatureDropdown(!showSignatureDropdown)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                  disabled={sending}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  {selectedSignature
                    ? signatures.find((s) => s.id === selectedSignature)?.name || "Signature"
                    : "No signature"}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showSignatureDropdown && (
                  <div className="absolute bottom-full left-0 mb-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-64 overflow-auto">
                    <button
                      type="button"
                      onClick={() => changeSignature("")}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors border-b border-gray-100"
                    >
                      No signature
                    </button>
                    {signatures.map((sig) => (
                      <button
                        key={sig.id}
                        type="button"
                        onClick={() => changeSignature(sig.id)}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                          selectedSignature === sig.id ? "bg-blue-50 text-blue-700 font-medium" : ""
                        }`}
                      >
                        {sig.name} {sig.isDefault && "(Default)"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={onClose} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending || loadingResources}>
              {sending ? "Sending..." : "Send Email"}
            </Button>
          </div>
        </div>
      </div>

      {/* Undo Notification (Gmail-style toast) */}
      {showUndoNotification && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] transition-all duration-300 ease-out">
          <div className="bg-gray-900 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-6 min-w-[400px]">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-green-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">
                Sending in {undoCountdown}s...
              </span>
            </div>
            <button
              onClick={handleUndo}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 rounded transition-colors font-medium uppercase text-sm tracking-wide ml-auto"
            >
              Undo
            </button>
          </div>
        </div>
      )}

      {/* Media Picker Modal */}
      {showMediaPicker && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowMediaPicker(false);
              setSelectedImages(new Set());
              setImageSearchQuery("");
            }}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Select Images</h3>
              <button
                onClick={() => {
                  setShowMediaPicker(false);
                  setSelectedImages(new Set());
                  setImageSearchQuery("");
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={imageSearchQuery}
                  onChange={(e) => setImageSearchQuery(e.target.value)}
                  placeholder="Search images by name..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
              {loadingMedia ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-gray-600">Loading images...</p>
                  </div>
                </div>
              ) : mediaItems.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-600 font-medium mb-1">No images available</p>
                    <p className="text-gray-500 text-sm">Upload images to the media library to use them in emails</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                  {mediaItems
                    .filter(item =>
                      imageSearchQuery === "" ||
                      item.name.toLowerCase().includes(imageSearchQuery.toLowerCase())
                    )
                    .map((item) => {
                      const isSelected = selectedImages.has(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleToggleImageSelection(item.id)}
                          className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                            isSelected
                              ? "border-blue-600 ring-2 ring-blue-200"
                              : "border-gray-200 hover:border-blue-400"
                          }`}
                        >
                          {/* Image */}
                          <div className="aspect-square bg-gray-100 relative">
                            <img
                              src={item.url}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />

                            {/* Overlay on hover */}
                            <div className={`absolute inset-0 transition-opacity ${
                              isSelected
                                ? "bg-blue-600/20"
                                : "bg-black/0 group-hover:bg-black/10"
                            }`} />

                            {/* Checkbox */}
                            <div className="absolute top-2 right-2">
                              <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                                isSelected
                                  ? "bg-blue-600 border-blue-600"
                                  : "bg-white border-gray-300 group-hover:border-blue-400"
                              }`}>
                                {isSelected && (
                                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Image name */}
                          <div className="p-2 bg-white">
                            <p className="text-xs text-gray-700 truncate" title={item.name}>
                              {item.name}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* No search results */}
              {!loadingMedia && mediaItems.length > 0 && imageSearchQuery &&
               mediaItems.filter(item => item.name.toLowerCase().includes(imageSearchQuery.toLowerCase())).length === 0 && (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-gray-600 font-medium mb-1">No images found</p>
                    <p className="text-gray-500 text-sm">Try a different search term</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t bg-gray-50">
              <span className="text-sm text-gray-600">
                {selectedImages.size} {selectedImages.size === 1 ? "image" : "images"} selected
              </span>
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowMediaPicker(false);
                    setSelectedImages(new Set());
                    setImageSearchQuery("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleInsertImages}
                  disabled={selectedImages.size === 0}
                >
                  Insert Selected
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
