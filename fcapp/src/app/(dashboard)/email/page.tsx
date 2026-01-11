"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { EmailComposer } from "@/components/email/email-composer";

interface Email {
  id: string;
  direction: string;
  fromAddress: string;
  toAddress: string;
  subject: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  createdAt: string;
  openedAt: string | null;
  isRead: boolean;
  isImportant: boolean;
  leadId: string | null;
  folder: string | null;
  inReplyTo: string | null;
  lead?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    primaryEmail: string | null;
  } | null;
  user?: {
    id: string;
    name: string;
  } | null;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  category: string;
  isActive: boolean;
}

interface EmailSignature {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
}

interface MediaItem {
  id: string;
  name: string;
  type: string;
  url: string;
  mimeType: string | null;
  size: number | null;
  folder: string | null;
}

// Helper to detect if email is a reply
function isReplyEmail(email: Email): boolean {
  // Check inReplyTo header OR subject starting with Re:/RE:/re:
  return !!(email.inReplyTo || email.subject?.match(/^re:/i));
}

type Folder = "inbox" | "sent" | "all" | "important" | "spam" | "trash";

export default function EmailClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [folder, setFolder] = useState<Folder>((searchParams.get("folder") as Folder) || "inbox");
  const [searchQuery, setSearchQuery] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [replyTo, setReplyTo] = useState<Email | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showCreateLeadModal, setShowCreateLeadModal] = useState(false);

  useEffect(() => {
    fetchEmails();
  }, [folder]);

  // Auto-poll for new emails every 2 minutes
  useEffect(() => {
    const pollInterval = 2 * 60 * 1000; // 2 minutes

    const poll = async () => {
      // Only auto-sync if not already syncing and on inbox folder
      if (!syncing && folder === "inbox") {
        try {
          const response = await fetch("/api/email/sync", { method: "POST" });
          const data = await response.json();
          if (data.success && data.newEmails > 0) {
            // Refresh email list if new emails arrived
            await fetchEmails();
          }
        } catch (error) {
          console.error("Auto-sync failed:", error);
        }
      }
    };

    const intervalId = setInterval(poll, pollInterval);

    // Cleanup on unmount
    return () => clearInterval(intervalId);
  }, [folder, syncing]);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      let url = "/api/email/inbox?limit=100";

      if (folder === "inbox") {
        url += "&direction=inbound";
      } else if (folder === "sent") {
        url += "&direction=outbound";
      } else if (folder === "important") {
        url += "&folder=important";
      } else if (folder === "spam") {
        url += "&folder=spam";
      } else if (folder === "trash") {
        url += "&folder=trash";
      }

      const response = await fetch(url);
      const data = await response.json();
      setEmails(data.emails || []);

      // Use unread count from API (accurate count, not limited by pagination)
      if (data.unreadCount !== undefined) {
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error("Failed to fetch emails:", error);
    } finally {
      setLoading(false);
    }
  };

  const syncEmails = async () => {
    setSyncing(true);
    try {
      const response = await fetch("/api/email/sync", { method: "POST" });
      const data = await response.json();
      if (data.success) {
        await fetchEmails();
      }
    } catch (error) {
      console.error("Failed to sync emails:", error);
    } finally {
      setSyncing(false);
    }
  };

  const handleLeadCreated = async (leadData: { id: string; firstName: string | null; lastName: string | null; primaryEmail: string | null }) => {
    if (!selectedEmail) return;

    // Link the email to the new lead
    await fetch(`/api/email/${selectedEmail.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: leadData.id }),
    });

    // Refresh emails to show the lead link
    await fetchEmails();

    // Update selected email with new lead info
    setSelectedEmail({
      ...selectedEmail,
      leadId: leadData.id,
      lead: {
        id: leadData.id,
        firstName: leadData.firstName,
        lastName: leadData.lastName,
        primaryEmail: leadData.primaryEmail,
      },
    });

    setShowCreateLeadModal(false);
  };

  const markAsRead = async (email: Email) => {
    if (email.isRead) return;
    try {
      await fetch(`/api/email/${email.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
      setEmails(emails.map(e => e.id === email.id ? { ...e, isRead: true } : e));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const moveToFolder = async (email: Email, targetFolder: "spam" | "trash" | null) => {
    try {
      await fetch(`/api/email/${email.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: targetFolder }),
      });
      // Remove from current list
      setEmails(emails.filter(e => e.id !== email.id));
      setSelectedEmail(null);
    } catch (error) {
      console.error("Failed to move email:", error);
    }
  };

  const markAsUnread = async (email: Email) => {
    try {
      await fetch(`/api/email/${email.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: false }),
      });
      setEmails(emails.map(e => e.id === email.id ? { ...e, isRead: false } : e));
      if (selectedEmail?.id === email.id) {
        setSelectedEmail({ ...selectedEmail, isRead: false });
      }
      setUnreadCount(prev => prev + 1);
    } catch (error) {
      console.error("Failed to mark as unread:", error);
    }
  };

  const toggleImportant = async (email: Email) => {
    const newImportant = !email.isImportant;
    try {
      await fetch(`/api/email/${email.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isImportant: newImportant }),
      });
      setEmails(emails.map(e => e.id === email.id ? { ...e, isImportant: newImportant } : e));
      if (selectedEmail?.id === email.id) {
        setSelectedEmail({ ...selectedEmail, isImportant: newImportant });
      }
      // If in Important folder and unmarking, remove from list
      if (folder === "important" && !newImportant) {
        setEmails(emails.filter(e => e.id !== email.id));
        setSelectedEmail(null);
      }
    } catch (error) {
      console.error("Failed to toggle important:", error);
    }
  };

  const handleEmailClick = (email: Email) => {
    setSelectedEmail(email);
    if (!email.isRead && email.direction === "inbound") {
      markAsRead(email);
    }
  };

  const handleReply = (email: Email) => {
    setReplyTo(email);
    setShowComposer(true);
  };

  const getDisplayName = (email: Email, isFrom: boolean) => {
    const address = isFrom ? email.fromAddress : email.toAddress;
    if (email.lead) {
      const name = [email.lead.firstName, email.lead.lastName].filter(Boolean).join(" ");
      if (name) return name;
    }
    // Parse "Name <email@example.com>" format
    const nameMatch = address.match(/^(.+?)\s*<.+>$/);
    if (nameMatch) {
      let displayName = nameMatch[1].trim();
      // Remove trailing "EMAIL" or "email" if present (common in some senders)
      displayName = displayName.replace(/\s+EMAIL$/i, "").trim();
      if (displayName) return displayName;
    }
    // If just an email address, return it
    return address;
  };

  const getEmailPreview = (email: Email) => {
    if (!email.bodyText) return "(No content)";
    return email.bodyText.substring(0, 100).replace(/\n/g, " ") + (email.bodyText.length > 100 ? "..." : "");
  };

  const filteredEmails = emails.filter(email => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      email.subject?.toLowerCase().includes(query) ||
      email.fromAddress.toLowerCase().includes(query) ||
      email.toAddress.toLowerCase().includes(query) ||
      email.bodyText?.toLowerCase().includes(query)
    );
  });

  const folderCounts = {
    inbox: emails.filter(e => e.direction === "inbound").length,
    sent: emails.filter(e => e.direction === "outbound").length,
    all: emails.length,
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email</h1>
          <p className="text-gray-500 text-sm">Manage your dealership communications</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={syncEmails} disabled={syncing}>
            <svg className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {syncing ? "Syncing..." : "Sync"}
          </Button>
          <Button onClick={() => { setReplyTo(null); setShowComposer(true); }}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Compose
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Sidebar - Folders */}
        <div className="w-48 border-r border-gray-200 p-3 flex-shrink-0">
          <nav className="space-y-1">
            <button
              onClick={() => { setFolder("inbox"); setSelectedEmail(null); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                folder === "inbox" ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                Inbox
              </div>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">{unreadCount}</span>
              )}
            </button>
            <button
              onClick={() => { setFolder("sent"); setSelectedEmail(null); }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                folder === "sent" ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Sent
            </button>
            <button
              onClick={() => { setFolder("all"); setSelectedEmail(null); }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                folder === "all" ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              All Mail
            </button>
            <button
              onClick={() => { setFolder("important"); setSelectedEmail(null); }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                folder === "important" ? "bg-yellow-50 text-yellow-700" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <svg className="w-4 h-4" fill={folder === "important" ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              Important
            </button>

            <div className="pt-4 mt-4 border-t border-gray-200">
              <button
                onClick={() => { setFolder("spam"); setSelectedEmail(null); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  folder === "spam" ? "bg-orange-50 text-orange-700" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Spam
              </button>
              <button
                onClick={() => { setFolder("trash"); setSelectedEmail(null); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  folder === "trash" ? "bg-red-50 text-red-700" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Trash
              </button>
            </div>
          </nav>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <Link
              href="/settings/email"
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </Link>
          </div>
        </div>

        {/* Email List */}
        <div className={`${selectedEmail ? "w-80" : "flex-1"} border-r border-gray-200 flex flex-col`}>
          {/* Search */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search emails..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Email List */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-gray-500">Loading emails...</div>
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">No emails found</p>
              </div>
            ) : (
              <div>
                {filteredEmails.map((email) => (
                  <button
                    key={email.id}
                    onClick={() => handleEmailClick(email)}
                    className={`w-full text-left p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      selectedEmail?.id === email.id ? "bg-blue-50" : ""
                    } ${!email.isRead && email.direction === "inbound" ? "bg-blue-50/50" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium ${
                        email.direction === "outbound" ? "bg-blue-500" : "bg-green-500"
                      }`}>
                        {email.direction === "outbound" ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        ) : (
                          getDisplayName(email, true).charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm truncate ${!email.isRead && email.direction === "inbound" ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                            {email.direction === "outbound" ? `To: ${getDisplayName(email, false)}` : getDisplayName(email, true)}
                          </span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {email.isImportant && (
                              <svg className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            )}
                            <span className="text-xs text-gray-400">
                              {formatDistanceToNow(new Date(email.createdAt), { addSuffix: false })}
                            </span>
                          </div>
                        </div>
                        <p className={`text-sm truncate ${!email.isRead && email.direction === "inbound" ? "font-medium text-gray-900" : "text-gray-600"}`}>
                          {email.subject || "(No subject)"}
                        </p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {getEmailPreview(email)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {isReplyEmail(email) && (
                            <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">Reply</span>
                          )}
                          {email.direction === "outbound" && email.openedAt && (
                            <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">Opened</span>
                          )}
                          {email.lead && (
                            <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                              {[email.lead.firstName, email.lead.lastName].filter(Boolean).join(" ") || "Lead"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Email Detail */}
        {selectedEmail && (
          <div className="flex-1 flex flex-col">
            {/* Email Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {selectedEmail.subject || "(No subject)"}
                  </h2>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <div>
                      <span className="text-gray-400">From:</span>{" "}
                      <span className="font-medium">{selectedEmail.fromAddress}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">To:</span>{" "}
                      <span className="font-medium">{selectedEmail.toAddress}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    <span>{format(new Date(selectedEmail.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
                    {isReplyEmail(selectedEmail) && (
                      <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded font-medium">
                        Reply
                      </span>
                    )}
                    {selectedEmail.direction === "outbound" && (
                      <span className={selectedEmail.openedAt ? "text-green-600" : "text-gray-400"}>
                        {selectedEmail.openedAt
                          ? `Opened ${format(new Date(selectedEmail.openedAt), "MMM d 'at' h:mm a")}`
                          : "Not opened yet"}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedEmail.direction === "inbound" && (
                    <Button variant="secondary" size="sm" onClick={() => handleReply(selectedEmail)}>
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      Reply
                    </Button>
                  )}
                  {selectedEmail.lead ? (
                    <Link
                      href={`/leads/${selectedEmail.lead.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      View Lead
                    </Link>
                  ) : selectedEmail.direction === "inbound" && (
                    <button
                      onClick={() => setShowCreateLeadModal(true)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      Create Lead
                    </button>
                  )}

                  {/* Star/Important toggle */}
                  <button
                    onClick={() => toggleImportant(selectedEmail)}
                    className={`p-1.5 rounded transition-colors ${
                      selectedEmail.isImportant
                        ? "text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50"
                        : "text-gray-400 hover:text-yellow-500 hover:bg-yellow-50"
                    }`}
                    title={selectedEmail.isImportant ? "Remove from important" : "Mark as important"}
                  >
                    <svg className="w-5 h-5" fill={selectedEmail.isImportant ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </button>

                  {/* Mark as unread (only for read emails) */}
                  {selectedEmail.isRead && selectedEmail.direction === "inbound" && (
                    <button
                      onClick={() => markAsUnread(selectedEmail)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Mark as unread"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </button>
                  )}

                  {/* Folder action buttons */}
                  {folder === "spam" || folder === "trash" ? (
                    <button
                      onClick={() => moveToFolder(selectedEmail, null)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Move back to inbox"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      Restore
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => moveToFolder(selectedEmail, "spam")}
                        className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                        title="Mark as spam"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => moveToFolder(selectedEmail, "trash")}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Move to trash"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => setSelectedEmail(null)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Email Body */}
            <div className="flex-1 overflow-auto p-4">
              {selectedEmail.bodyHtml ? (
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: selectedEmail.bodyHtml.replace(
                      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
                      ""
                    ),
                  }}
                />
              ) : (
                <div className="whitespace-pre-wrap text-gray-700">
                  {selectedEmail.bodyText || "(No content)"}
                </div>
              )}
            </div>

            {/* Quick Reply */}
            {selectedEmail.direction === "inbound" && (
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => handleReply(selectedEmail)}
                  className="w-full px-4 py-2 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:text-gray-700 transition-colors text-left"
                >
                  Click to reply...
                </button>
              </div>
            )}
          </div>
        )}

        {/* Empty State when no email selected */}
        {!selectedEmail && !loading && filteredEmails.length > 0 && (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p>Select an email to read</p>
            </div>
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {showComposer && (
        <EmailComposerModal
          replyTo={replyTo}
          onClose={() => {
            setShowComposer(false);
            setReplyTo(null);
          }}
          onSent={() => {
            setShowComposer(false);
            setReplyTo(null);
            fetchEmails();
          }}
        />
      )}

      {/* Create Lead Modal */}
      {showCreateLeadModal && selectedEmail && (
        <CreateLeadModal
          email={selectedEmail}
          onClose={() => setShowCreateLeadModal(false)}
          onCreated={handleLeadCreated}
        />
      )}
    </div>
  );
}

// Extended Email Composer Modal for the email client
function EmailComposerModal({
  replyTo,
  onClose,
  onSent,
}: {
  replyTo: Email | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const [to, setTo] = useState(replyTo?.fromAddress || "");
  const [subject, setSubject] = useState(replyTo ? `Re: ${replyTo.subject || ""}` : "");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [signatures, setSignatures] = useState<EmailSignature[]>([]);
  const [selectedSignature, setSelectedSignature] = useState("");
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);

  // Media picker state variables
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [imageSearchQuery, setImageSearchQuery] = useState("");
  const [dealershipId, setDealershipId] = useState<string | null>(null);

  const bodyRef = useRef<HTMLDivElement>(null);

  // Sync body state with contentEditable innerHTML
  useEffect(() => {
    if (bodyRef.current && bodyRef.current.innerHTML !== body) {
      bodyRef.current.innerHTML = body;
    }
  }, [body]);

  useEffect(() => {
    loadResources();
  }, []);

  // Fetch dealership ID from session
  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.session?.dealershipId) {
          setDealershipId(data.session.dealershipId);
        }
      })
      .catch((error) => console.error("Failed to fetch session:", error));
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
      const defaultSig = (signaturesData.signatures || []).find((s: EmailSignature) => s.isDefault);
      if (defaultSig) setSelectedSignature(defaultSig.id);
    } catch (error) {
      console.error("Failed to load resources:", error);
    }
  };

  const applyTemplate = (template: EmailTemplate) => {
    setSubject(template.subject);
    const cleanBody = template.bodyHtml.replace(/<[^>]*>/g, "");
    setBody(cleanBody);
    if (bodyRef.current) {
      bodyRef.current.innerHTML = cleanBody;
    }
    setShowTemplateDropdown(false);
  };

  const getSignatureContent = () => {
    if (!selectedSignature) return "";
    const sig = signatures.find((s) => s.id === selectedSignature);
    return sig ? sig.content : "";
  };

  const loadMedia = async () => {
    if (!dealershipId) return;

    setLoadingMedia(true);
    try {
      const res = await fetch(`/api/dealerships/${dealershipId}/media`);
      const data = await res.json();

      // Filter only images
      const images = (data.media || []).filter((item: MediaItem) =>
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

  const handleSend = async () => {
    if (!to.trim()) {
      setError("Recipient email is required");
      return;
    }
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

    try {
      const signature = getSignatureContent();
      const fullBodyHtml = signature ? `${bodyContent}<br><br>${signature}` : bodyContent;
      const fullBodyText = signature ? `${bodyTextContent}\n\n${signature}` : bodyTextContent;

      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: replyTo?.leadId || null,
          to,
          subject,
          bodyText: fullBodyText,
          bodyHtml: `<div style="font-family: sans-serif; line-height: 1.6;">${fullBodyHtml}</div>`,
          inReplyTo: replyTo?.id || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to send email");

      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const categoryLabels: Record<string, string> = {
    follow_up: "Follow-up",
    introduction: "Introduction",
    offer: "Offer",
    thank_you: "Thank You",
    custom: "Custom",
  };

  const groupedTemplates = templates.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {} as Record<string, EmailTemplate[]>);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {replyTo ? "Reply" : "New Email"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4 flex-1 overflow-auto">
          {/* Template Button */}
          {templates.length > 0 && !replyTo && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Use Template
              </button>
              {showTemplateDropdown && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white border rounded-lg shadow-lg z-10 max-h-64 overflow-auto">
                  {Object.entries(groupedTemplates).map(([cat, temps]) => (
                    <div key={cat}>
                      <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 uppercase">
                        {categoryLabels[cat] || cat}
                      </div>
                      {temps.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => applyTemplate(t)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50"
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="recipient@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter subject..."
            />
          </div>

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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[200px] resize-y overflow-y-auto focus:outline-none [direction:ltr] [text-align:left] [unicode-bidi:embed]"
              style={{ whiteSpace: 'pre-wrap', direction: 'ltr', textAlign: 'left', unicodeBidi: 'embed' }}
            />
            {!body && (
              <div className="absolute top-[2.5rem] left-3 text-gray-400 pointer-events-none">
                Write your message...
              </div>
            )}
          </div>

          {signatures.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Signature</label>
              <select
                value={selectedSignature}
                onChange={(e) => setSelectedSignature(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">No signature</option>
                {signatures.map((sig) => (
                  <option key={sig.id} value={sig.id}>
                    {sig.name} {sig.isDefault && "(Default)"}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
          )}
        </div>

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
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={onClose} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      </div>

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

// Create Lead Modal - allows editing before creating a lead from email
function CreateLeadModal({
  email,
  onClose,
  onCreated,
}: {
  email: Email;
  onClose: () => void;
  onCreated: (lead: { id: string; firstName: string | null; lastName: string | null; primaryEmail: string | null }) => void;
}) {
  // Parse initial values from email
  const parseEmailAddress = () => {
    const fromAddress = email.fromAddress;
    let firstName = "";
    let lastName = "";
    let emailAddress = fromAddress;

    const nameMatch = fromAddress.match(/^(.+?)\s*<(.+)>$/);
    if (nameMatch) {
      const fullName = nameMatch[1].trim();
      emailAddress = nameMatch[2];
      const nameParts = fullName.split(" ");
      firstName = nameParts[0] || "";
      lastName = nameParts.slice(1).join(" ") || "";
    }

    if (!firstName) {
      firstName = emailAddress.split("@")[0];
    }

    return { firstName, lastName, emailAddress };
  };

  const initialValues = parseEmailAddress();

  const [formData, setFormData] = useState({
    firstName: initialValues.firstName,
    lastName: initialValues.lastName,
    primaryEmail: initialValues.emailAddress,
    primaryPhone: "",
    notes: `Lead created from email: "${email.subject || "(No subject)"}"\n\n--- Original email preview ---\n${email.bodyText?.substring(0, 300) || "(No content)"}`,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim()) {
      setError("First name is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim() || null,
          primaryEmail: formData.primaryEmail.trim() || null,
          primaryPhone: formData.primaryPhone.trim() || null,
          source: "email",
          notes: formData.notes.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create lead");
      }

      onCreated({
        id: data.id,
        firstName: data.firstName,
        lastName: data.lastName,
        primaryEmail: data.primaryEmail,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create lead");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Create Lead from Email</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 flex-1 overflow-auto">
          {/* Email Preview */}
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-xs text-gray-500 mb-1">From email:</div>
            <div className="text-sm font-medium text-gray-900">{email.subject || "(No subject)"}</div>
            <div className="text-xs text-gray-500 mt-1">{email.fromAddress}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="First name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Last name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.primaryEmail}
              onChange={(e) => setFormData({ ...formData, primaryEmail: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.primaryPhone}
              onChange={(e) => setFormData({ ...formData, primaryPhone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="(555) 123-4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px] resize-none"
              placeholder="Add notes..."
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
          )}
        </form>

        <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Creating..." : "Create Lead"}
          </Button>
        </div>
      </div>
    </div>
  );
}
