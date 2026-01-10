"use client";

import { useState } from "react";
import { RequestCard } from "@/components/requests/request-card";
import type { RequestWithRelations } from "@/types";

interface ContractorDashboardClientProps {
  assignedRequests: RequestWithRelations[];
  availableRequests: RequestWithRelations[];
  stats: {
    assignedCount: number;
    availableCount: number;
    resolvedToday: number;
    avgResponseTimeDays: number;
  };
}

export function ContractorDashboardClient({
  assignedRequests,
  availableRequests,
  stats,
}: ContractorDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<"assigned" | "available">("assigned");

  const displayRequests = activeTab === "assigned" ? assignedRequests : availableRequests;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Contractor Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">Manage your assigned requests and find new work</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-1">Assigned to Me</div>
          <div className="text-3xl font-bold text-blue-600">{stats.assignedCount}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-1">Available Requests</div>
          <div className="text-3xl font-bold text-gray-900">{stats.availableCount}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-1">Resolved Today</div>
          <div className="text-3xl font-bold text-green-600">{stats.resolvedToday}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-1">Avg Response Time</div>
          <div className="text-3xl font-bold text-gray-900">
            {stats.avgResponseTimeDays}
            <span className="text-sm text-gray-600 ml-1">days</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab("assigned")}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "assigned"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              Assigned to Me ({stats.assignedCount})
            </button>
            <button
              onClick={() => setActiveTab("available")}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "available"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              Available ({stats.availableCount})
            </button>
          </nav>
        </div>

        {/* Request Cards */}
        <div className="p-6">
          {displayRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm">
                {activeTab === "assigned"
                  ? "No requests assigned to you yet"
                  : "No available requests in your department"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {displayRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  href={`/contractor/requests/${request.id}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
