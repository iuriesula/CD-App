"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface EmailSignature {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
  userId: string | null;
  user: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export default function EmailSignaturesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [signatures, setSignatures] = useState<EmailSignature[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingSignature, setEditingSignature] = useState<EmailSignature | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isManager, setIsManager] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    content: "",
    isDefault: false,
    isPersonal: false,
  });

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const response = await fetch("/api/auth/session");
      const data = await response.json();
      if (!data.session?.dealershipId) {
        router.push("/leads");
        return;
      }
      setIsManager(data.session.role === "manager" || data.session.role === "agency_admin");
      fetchSignatures();
    } catch (error) {
      router.push("/leads");
    }
  };

  const fetchSignatures = async () => {
    try {
      const response = await fetch("/api/email/signatures");
      const data = await response.json();
      setSignatures(data.signatures || []);
    } catch (error) {
      console.error("Failed to fetch signatures:", error);
    } finally {
      setLoading(false);
    }
  };

  const openEditor = (signature?: EmailSignature) => {
    if (signature) {
      setEditingSignature(signature);
      setFormData({
        name: signature.name,
        content: signature.content,
        isDefault: signature.isDefault,
        isPersonal: !!signature.userId,
      });
    } else {
      setEditingSignature(null);
      setFormData({
        name: "",
        content: "",
        isDefault: false,
        isPersonal: !isManager,
      });
    }
    setShowEditor(true);
    setMessage(null);
  };

  const closeEditor = () => {
    setShowEditor(false);
    setEditingSignature(null);
    setFormData({
      name: "",
      content: "",
      isDefault: false,
      isPersonal: !isManager,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const url = editingSignature
        ? `/api/email/signatures/${editingSignature.id}`
        : "/api/email/signatures";
      const method = editingSignature ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save signature");
      }

      await fetchSignatures();
      closeEditor();
      setMessage({
        type: "success",
        text: editingSignature ? "Signature updated successfully" : "Signature created successfully",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save signature",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this signature?")) return;

    try {
      const response = await fetch(`/api/email/signatures/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete signature");
      }

      await fetchSignatures();
      setMessage({ type: "success", text: "Signature deleted successfully" });
    } catch (error) {
      setMessage({ type: "error", text: "Failed to delete signature" });
    }
  };

  const setAsDefault = async (signature: EmailSignature) => {
    try {
      const response = await fetch(`/api/email/signatures/${signature.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });

      if (!response.ok) {
        throw new Error("Failed to update signature");
      }

      await fetchSignatures();
      setMessage({ type: "success", text: "Default signature updated" });
    } catch (error) {
      setMessage({ type: "error", text: "Failed to update signature" });
    }
  };

  const dealershipSignatures = signatures.filter((s) => !s.userId);
  const personalSignatures = signatures.filter((s) => s.userId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading signatures...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/settings/email" className="hover:text-gray-700">
              Email Settings
            </Link>
            <span>/</span>
            <span className="text-gray-900">Signatures</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Email Signatures</h1>
          <p className="text-gray-500 mt-1">
            Create signatures to automatically append to your emails
          </p>
        </div>
        <Button onClick={() => openEditor()}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Signature
        </Button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Signatures List */}
      {signatures.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No signatures yet</h3>
          <p className="text-gray-500 mb-4">
            Create a signature to automatically add to your outgoing emails.
          </p>
          <Button onClick={() => openEditor()}>Create Signature</Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Dealership Signatures */}
          {dealershipSignatures.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Dealership Signatures
              </h3>
              <div className="grid gap-4">
                {dealershipSignatures.map((signature) => (
                  <SignatureCard
                    key={signature.id}
                    signature={signature}
                    onEdit={() => openEditor(signature)}
                    onDelete={() => handleDelete(signature.id)}
                    onSetDefault={() => setAsDefault(signature)}
                    canEdit={isManager}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Personal Signatures */}
          {personalSignatures.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                My Signatures
              </h3>
              <div className="grid gap-4">
                {personalSignatures.map((signature) => (
                  <SignatureCard
                    key={signature.id}
                    signature={signature}
                    onEdit={() => openEditor(signature)}
                    onDelete={() => handleDelete(signature.id)}
                    onSetDefault={() => setAsDefault(signature)}
                    canEdit={true}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Signature Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeEditor} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingSignature ? "Edit Signature" : "New Signature"}
              </h2>
              <button onClick={closeEditor} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-auto p-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Signature Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Professional, Casual"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Signature Content
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[150px] font-mono text-sm"
                    placeholder="Best regards,&#10;John Doe&#10;Sales Manager&#10;ABC Dealership&#10;Phone: (555) 123-4567"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    You can use HTML tags for formatting (bold, links, etc.)
                  </p>
                </div>

                {/* Preview */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preview
                  </label>
                  <div
                    className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    dangerouslySetInnerHTML={{
                      __html: formData.content
                        .replace(/\n/g, "<br>")
                        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ""),
                    }}
                  />
                </div>

                <div className="flex items-center gap-6">
                  {isManager && !editingSignature && (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!formData.isPersonal}
                        onChange={(e) => setFormData({ ...formData, isPersonal: !e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Dealership-wide signature</span>
                    </label>
                  )}

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Set as default</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t">
                <Button type="button" variant="outline" onClick={closeEditor} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : editingSignature ? "Update Signature" : "Create Signature"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SignatureCard({
  signature,
  onEdit,
  onDelete,
  onSetDefault,
  canEdit,
}: {
  signature: EmailSignature;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  canEdit: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900">{signature.name}</h4>
            {signature.isDefault && (
              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                Default
              </span>
            )}
            {signature.user && (
              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                {signature.user.name}
              </span>
            )}
          </div>
          <div
            className="text-sm text-gray-500 mt-2 line-clamp-3"
            dangerouslySetInnerHTML={{
              __html: signature.content
                .replace(/\n/g, "<br>")
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ""),
            }}
          />
        </div>
        {canEdit && (
          <div className="flex items-center gap-2 ml-4">
            {!signature.isDefault && (
              <button
                onClick={onSetDefault}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Set as default"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </button>
            )}
            <button
              onClick={onEdit}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
