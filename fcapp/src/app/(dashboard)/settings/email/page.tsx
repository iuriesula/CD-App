"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface EmailConfig {
  id: string;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpSecure: boolean;
  smtpPasswordSet: boolean;
  emailFromName: string | null;
  emailFromAddress: string | null;
  imapHost: string | null;
  imapPort: number | null;
  imapUser: string | null;
  imapSecure: boolean;
  imapPasswordSet: boolean;
  emailSyncEnabled: boolean;
  lastEmailSync: string | null;
}

export default function EmailSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testingImap, setTestingImap] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [dealershipId, setDealershipId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formData, setFormData] = useState({
    // SMTP
    smtpHost: "",
    smtpPort: "587",
    smtpUser: "",
    smtpPassword: "",
    smtpSecure: true,
    emailFromName: "",
    emailFromAddress: "",
    // IMAP
    imapHost: "",
    imapPort: "993",
    imapUser: "",
    imapPassword: "",
    imapSecure: true,
    // Sync
    emailSyncEnabled: false,
  });

  const [passwordsSet, setPasswordsSet] = useState({
    smtp: false,
    imap: false,
  });

  useEffect(() => {
    fetchSession();
  }, []);

  useEffect(() => {
    if (dealershipId) {
      fetchConfig();
    }
  }, [dealershipId]);

  const fetchSession = async () => {
    try {
      const response = await fetch("/api/auth/session");
      const data = await response.json();
      if (!data.session?.dealershipId) {
        router.push("/leads");
        return;
      }
      if (data.session.role === "contractor") {
        router.push("/leads");
        return;
      }
      setDealershipId(data.session.dealershipId);
    } catch (error) {
      console.error("Failed to fetch session:", error);
      router.push("/leads");
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await fetch(`/api/dealerships/${dealershipId}/email-config`);
      const data = await response.json();
      if (data.config) {
        const config = data.config as EmailConfig;
        setFormData({
          smtpHost: config.smtpHost || "",
          smtpPort: config.smtpPort?.toString() || "587",
          smtpUser: config.smtpUser || "",
          smtpPassword: "",
          smtpSecure: config.smtpSecure,
          emailFromName: config.emailFromName || "",
          emailFromAddress: config.emailFromAddress || "",
          imapHost: config.imapHost || "",
          imapPort: config.imapPort?.toString() || "993",
          imapUser: config.imapUser || "",
          imapPassword: "",
          imapSecure: config.imapSecure,
          emailSyncEnabled: config.emailSyncEnabled,
        });
        setPasswordsSet({
          smtp: config.smtpPasswordSet,
          imap: config.imapPasswordSet,
        });
      }
    } catch (error) {
      console.error("Failed to fetch email config:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/dealerships/${dealershipId}/email-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtpHost: formData.smtpHost || null,
          smtpPort: formData.smtpPort ? parseInt(formData.smtpPort) : null,
          smtpUser: formData.smtpUser || null,
          smtpPassword: formData.smtpPassword || null,
          smtpSecure: formData.smtpSecure,
          emailFromName: formData.emailFromName || null,
          emailFromAddress: formData.emailFromAddress || null,
          imapHost: formData.imapHost || null,
          imapPort: formData.imapPort ? parseInt(formData.imapPort) : null,
          imapUser: formData.imapUser || null,
          imapPassword: formData.imapPassword || null,
          imapSecure: formData.imapSecure,
          emailSyncEnabled: formData.emailSyncEnabled,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save settings");
      }

      const data = await response.json();
      setPasswordsSet({
        smtp: data.config.smtpPasswordSet,
        imap: data.config.imapPasswordSet,
      });
      setFormData((prev) => ({ ...prev, smtpPassword: "", imapPassword: "" }));
      setMessage({ type: "success", text: "Email settings saved successfully" });
    } catch (error) {
      console.error("Failed to save email config:", error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save settings",
      });
    } finally {
      setSaving(false);
    }
  };

  const testSmtpConnection = async () => {
    setTestingSmtp(true);
    setMessage(null);

    try {
      const response = await fetch("/api/email/test-smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: formData.smtpHost,
          port: parseInt(formData.smtpPort),
          user: formData.smtpUser,
          password: formData.smtpPassword || undefined,
          secure: formData.smtpSecure,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ type: "success", text: "SMTP connection successful!" });
      } else {
        setMessage({ type: "error", text: `SMTP test failed: ${data.error}` });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to test SMTP connection" });
    } finally {
      setTestingSmtp(false);
    }
  };

  const testImapConnection = async () => {
    setTestingImap(true);
    setMessage(null);

    try {
      const response = await fetch("/api/email/test-imap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: formData.imapHost,
          port: parseInt(formData.imapPort),
          user: formData.imapUser,
          password: formData.imapPassword || undefined,
          secure: formData.imapSecure,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ type: "success", text: "IMAP connection successful!" });
      } else {
        setMessage({ type: "error", text: `IMAP test failed: ${data.error}` });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to test IMAP connection" });
    } finally {
      setTestingImap(false);
    }
  };

  const syncEmails = async () => {
    setSyncing(true);
    setMessage(null);

    try {
      const response = await fetch("/api/email/sync", {
        method: "POST",
      });

      const data = await response.json();
      if (data.success) {
        setMessage({
          type: "success",
          text: `Sync complete! ${data.newEmails} new emails, ${data.newLeads} new leads created.`,
        });
      } else {
        setMessage({ type: "error", text: `Sync failed: ${data.error}` });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to sync emails" });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading email settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Email Settings</h1>
        <p className="text-gray-500 mt-1">Configure email sending and receiving for your dealership</p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/settings/email/templates"
          className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
        >
          <div className="p-2 bg-blue-50 rounded-lg">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Email Templates</h3>
            <p className="text-sm text-gray-500">Create reusable email templates</p>
          </div>
        </Link>
        <Link
          href="/settings/email/signatures"
          className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
        >
          <div className="p-2 bg-green-50 rounded-lg">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Email Signatures</h3>
            <p className="text-sm text-gray-500">Manage your email signatures</p>
          </div>
        </Link>
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SMTP Settings */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Outgoing Email (SMTP)
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Configure SMTP to send emails to leads from within the CRM.
          </p>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SMTP Host
                </label>
                <input
                  type="text"
                  value={formData.smtpHost}
                  onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SMTP Port
                </label>
                <input
                  type="number"
                  value={formData.smtpPort}
                  onChange={(e) => setFormData({ ...formData, smtpPort: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="587"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={formData.smtpUser}
                  onChange={(e) => setFormData({ ...formData, smtpUser: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {passwordsSet.smtp && <span className="text-green-600">(saved)</span>}
                </label>
                <input
                  type="password"
                  value={formData.smtpPassword}
                  onChange={(e) => setFormData({ ...formData, smtpPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={passwordsSet.smtp ? "Leave blank to keep current" : "Enter password"}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Name
                </label>
                <input
                  type="text"
                  value={formData.emailFromName}
                  onChange={(e) => setFormData({ ...formData, emailFromName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Your Dealership"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Address
                </label>
                <input
                  type="email"
                  value={formData.emailFromAddress}
                  onChange={(e) => setFormData({ ...formData, emailFromAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="sales@yourdealership.com"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.smtpSecure}
                  onChange={(e) => setFormData({ ...formData, smtpSecure: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Use SSL/TLS</span>
              </label>

              <Button
                type="button"
                variant="secondary"
                onClick={testSmtpConnection}
                disabled={testingSmtp || !formData.smtpHost || !formData.smtpUser}
              >
                {testingSmtp ? "Testing..." : "Test Connection"}
              </Button>
            </div>
          </div>
        </Card>

        {/* IMAP Settings */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Incoming Email (IMAP)
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Configure IMAP to receive emails and automatically create leads from form submissions.
          </p>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IMAP Host
                </label>
                <input
                  type="text"
                  value={formData.imapHost}
                  onChange={(e) => setFormData({ ...formData, imapHost: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="imap.gmail.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IMAP Port
                </label>
                <input
                  type="number"
                  value={formData.imapPort}
                  onChange={(e) => setFormData({ ...formData, imapPort: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="993"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={formData.imapUser}
                  onChange={(e) => setFormData({ ...formData, imapUser: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {passwordsSet.imap && <span className="text-green-600">(saved)</span>}
                </label>
                <input
                  type="password"
                  value={formData.imapPassword}
                  onChange={(e) => setFormData({ ...formData, imapPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={passwordsSet.imap ? "Leave blank to keep current" : "Enter password"}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.imapSecure}
                  onChange={(e) => setFormData({ ...formData, imapSecure: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Use SSL/TLS</span>
              </label>

              <Button
                type="button"
                variant="secondary"
                onClick={testImapConnection}
                disabled={testingImap || !formData.imapHost || !formData.imapUser}
              >
                {testingImap ? "Testing..." : "Test Connection"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Email Sync */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Email Sync
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Enable automatic email sync to receive emails and create leads from form submissions.
          </p>

          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.emailSyncEnabled}
                onChange={(e) => setFormData({ ...formData, emailSyncEnabled: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Enable email sync</span>
            </label>

            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="secondary"
                onClick={syncEmails}
                disabled={syncing || !formData.emailSyncEnabled}
              >
                {syncing ? "Syncing..." : "Sync Now"}
              </Button>
              <span className="text-sm text-gray-500">
                Manually trigger email sync to fetch new emails
              </span>
            </div>
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
