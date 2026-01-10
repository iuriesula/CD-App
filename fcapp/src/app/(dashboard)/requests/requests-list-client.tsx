"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RequestCard } from "@/components/requests/request-card";
import { CreateRequestModal } from "./create-request-modal";
import type { Request, User, Dealership, RequestStatus, ContractorDepartment } from "@prisma/client";
import type { UserRole } from "@prisma/client";

type RequestWithRelations = Request & {
  dealership: Dealership;
  requestedBy: User;
  assignedTo: User | null;
  _count: {
    messages: number;
  };
};

interface RequestsListClientProps {
  requests: RequestWithRelations[];
  userRole: UserRole;
}

export function RequestsListClient({ requests: initialRequests, userRole }: RequestsListClientProps) {
  const [requests, setRequests] = useState(initialRequests);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<RequestStatus | "all">("all");
  const [filterDepartment, setFilterDepartment] = useState<ContractorDepartment | "all">("all");
  const [filterPriority, setFilterPriority] = useState<"all" | "low" | "normal" | "high" | "urgent">("all");
  const [searchTerm, setSearchTerm] = useState("");

  const canCreateRequests = ["salesperson", "manager", "tech", "content_creator"].includes(userRole);

  const handleSuccess = () => {
    setShowModal(false);
    window.location.reload();
  };

  const filteredRequests = requests.filter((request) => {
    const matchesTab = activeTab === "all" || request.status === activeTab;
    const matchesDepartment = filterDepartment === "all" || request.department === filterDepartment;
    const matchesPriority = filterPriority === "all" || request.priority === filterPriority;
    const matchesSearch =
      request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.description.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesTab && matchesDepartment && matchesPriority && matchesSearch;
  });

  const tabs: { id: RequestStatus | "all"; label: string }[] = [
    { id: "all", label: "All" },
    { id: "open", label: "Open" },
    { id: "in_progress", label: "In Progress" },
    { id: "resolved", label: "Resolved" },
    { id: "closed", label: "Closed" },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Requests</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage support requests and tickets
          </p>
        </div>
        {canCreateRequests && (
          <Button onClick={() => setShowModal(true)}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Request
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value as ContractorDepartment | "all")}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Departments</option>
              <option value="it">IT</option>
              <option value="marketing">Marketing</option>
              <option value="content">Content</option>
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        {/* Request Cards */}
        <div className="p-6">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm">No requests found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  href={`/requests/${request.id}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && <CreateRequestModal onClose={() => setShowModal(false)} onSuccess={handleSuccess} />}
    </div>
  );
}
