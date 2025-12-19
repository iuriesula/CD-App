"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
    loadResources();
  }, []);

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

      // Set default signature
      const defaultSig = (signaturesData.signatures || []).find(
        (s: EmailSignature) => s.isDefault
      );
      if (defaultSig) {
        setSelectedSignature(defaultSig.id);
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
    setBody(replaceVariables(template.bodyHtml.replace(/<[^>]*>/g, ""))); // Strip HTML for plain text
    setShowTemplateDropdown(false);
  };

  const getSignatureContent = (): string => {
    if (!selectedSignature) return "";
    const sig = signatures.find((s) => s.id === selectedSignature);
    return sig ? sig.content : "";
  };

  const handleSend = async () => {
    if (!subject.trim()) {
      setError("Subject is required");
      return;
    }
    if (!body.trim()) {
      setError("Message body is required");
      return;
    }

    setSending(true);
    setError(null);

    try {
      const signature = getSignatureContent();
      const fullBody = signature ? `${body}\n\n${signature}` : body;

      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          to: recipientEmail,
          subject,
          bodyText: fullBody,
          bodyHtml: `<div style="font-family: sans-serif; line-height: 1.6;">${fullBody
            .split("\n")
            .map((line) => `<p>${line || "&nbsp;"}</p>`)
            .join("")}</div>`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      onSent?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setSending(false);
    }
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
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[350px] resize-y"
              placeholder="Write your message..."
            />
          </div>

          {/* Signature Selector */}
          {signatures.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Signature</label>
              <select
                value={selectedSignature}
                onChange={(e) => setSelectedSignature(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">No signature</option>
                {signatures.map((sig) => (
                  <option key={sig.id} value={sig.id}>
                    {sig.name} {sig.isDefault && "(Default)"}
                  </option>
                ))}
              </select>

              {/* Signature Preview */}
              {selectedSignature && (
                <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: getSignatureContent()
                        .replace(/\n/g, "<br>")
                        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ""),
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <span className="text-xs text-gray-500">
            Press Ctrl+Enter to send
          </span>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending || loadingResources}>
              {sending ? "Sending..." : "Send Email"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
