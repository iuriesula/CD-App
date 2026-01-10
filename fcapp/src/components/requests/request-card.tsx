import Link from "next/link";
import { StatusBadge } from "./status-badge";
import { DepartmentBadge } from "./department-badge";
import { PriorityBadge } from "./priority-badge";
import type { Request, User } from "@prisma/client";

interface RequestCardProps {
  request: Request & {
    assignedTo?: User | null;
    _count?: {
      messages: number;
    };
  };
  href: string;
}

export function RequestCard({ request, href }: RequestCardProps) {
  const messageCount = request._count?.messages || 0;

  return (
    <Link
      href={href}
      className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <h3 className="font-semibold text-gray-900 line-clamp-2 flex-1">
          {request.title}
        </h3>
        <StatusBadge status={request.status} />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <DepartmentBadge department={request.department} />
        <PriorityBadge priority={request.priority} />
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center gap-4">
          {request.assignedTo && (
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>{request.assignedTo.name}</span>
            </div>
          )}

          {messageCount > 0 && (
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>{messageCount}</span>
            </div>
          )}
        </div>

        <time className="text-xs">
          {new Date(request.createdAt).toLocaleDateString()}
        </time>
      </div>
    </Link>
  );
}
