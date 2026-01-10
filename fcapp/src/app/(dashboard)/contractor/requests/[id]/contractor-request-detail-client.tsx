"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/requests/status-badge";
import { DepartmentBadge } from "@/components/requests/department-badge";
import { PriorityBadge } from "@/components/requests/priority-badge";
import { MessageThread } from "@/components/requests/message-thread";
import { MessageComposer } from "@/components/requests/message-composer";
import type { RequestStatus } from "@prisma/client";
import type { AuthUser, RequestWithRelations } from "@/types";

interface ContractorRequestDetailClientProps {
  request: RequestWithRelations;
  currentUser: AuthUser;
}

export function ContractorRequestDetailClient({
  request: initialRequest,
  currentUser,
}: ContractorRequestDetailClientProps) {
  const [request, setRequest] = useState(initialRequest);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: RequestStatus) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/requests/${request.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update status");
      }

      setRequest({ ...request, status: newStatus });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMessageSent = () => {
    window.location.reload();
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href="/contractor"
          className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{request.title}</h1>

            <div className="flex flex-wrap items-center gap-3 mb-4">
              <DepartmentBadge department={request.department} />
              <PriorityBadge priority={request.priority} />
              <StatusBadge status={request.status} />
            </div>

            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap">{request.description}</p>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-600 mb-1">Requested by</div>
                <div className="font-medium text-gray-900">{request.requestedBy?.name || "Unknown"}</div>
                <div className="text-xs text-gray-600">{request.requestedBy?.email || ""}</div>
              </div>
              <div>
                <div className="text-gray-600 mb-1">Dealership</div>
                <div className="font-medium text-gray-900">{request.dealership.name}</div>
              </div>
              <div>
                <div className="text-gray-600 mb-1">Created</div>
                <div className="font-medium text-gray-900">
                  {new Date(request.createdAt).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-gray-600 mb-1">Last updated</div>
                <div className="font-medium text-gray-900">
                  {new Date(request.updatedAt).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversation</h2>
            <MessageThread messages={request.messages || []} currentUserId={currentUser.id} />
            <div className="mt-6 pt-6 border-t border-gray-200">
              <MessageComposer requestId={request.id} onSent={handleMessageSent} />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Management - Anyone from the department can update */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Update Status</h3>
            <div className="space-y-2">
              {(["open", "in_progress", "resolved", "closed"] as RequestStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={isUpdating || request.status === status}
                  className={`w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    request.status === status
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {status === "in_progress" ? "In Progress" : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Current Assignment Info */}
          {request.assignedTo && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Assigned To</h3>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="font-medium text-blue-900">{request.assignedTo.name}</div>
                <div className="text-xs text-blue-700">{request.assignedTo.email}</div>
              </div>
            </div>
          )}

          {/* Attachments */}
          {request.attachments && request.attachments.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Attachments</h3>
              <div className="space-y-2">
                {request.attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-gray-900">{attachment.fileName}</div>
                      <div className="text-xs text-gray-500">
                        {Math.round(attachment.size / 1024)}KB
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
