"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DepartmentBadge } from "@/components/requests/department-badge";
import { StatusBadge } from "@/components/requests/status-badge";
import { PriorityBadge } from "@/components/requests/priority-badge";
import type { ContractorWithRelations } from "@/types";

interface ContractorDetailClientProps {
  contractor: ContractorWithRelations;
  metrics: {
    totalRequests: number;
    resolvedCount: number;
    avgResponseTimeDays: number;
  };
}

export function ContractorDetailClient({ contractor, metrics }: ContractorDetailClientProps) {
  const [dealerships, setDealerships] = useState(contractor.contractorDealerships);

  const handleRemoveDealership = async (dealershipId: string) => {
    if (!confirm("Remove this dealership assignment?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/contractors/${contractor.id}/dealerships/${dealershipId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove dealership");
      }

      setDealerships(dealerships.filter((d) => d.dealershipId !== dealershipId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove dealership");
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/contractors"
            className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Contractors
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{contractor.name}</h1>
          <p className="text-sm text-gray-600">{contractor.email}</p>
        </div>
        <div className="flex items-center gap-3">
          {contractor.contractorDepartment && (
            <DepartmentBadge department={contractor.contractorDepartment} />
          )}
          <Badge variant={contractor.isActive ? "green" : "gray"}>
            {contractor.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-1">Total Requests</div>
          <div className="text-3xl font-bold text-gray-900">{metrics.totalRequests}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-1">Resolved</div>
          <div className="text-3xl font-bold text-green-600">{metrics.resolvedCount}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-1">Avg Response Time</div>
          <div className="text-3xl font-bold text-gray-900">
            {metrics.avgResponseTimeDays}
            <span className="text-sm text-gray-600 ml-1">days</span>
          </div>
        </div>
      </div>

      {/* Assigned Dealerships */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Assigned Dealerships</h2>
        </div>
        <div className="p-6">
          {dealerships.length === 0 ? (
            <p className="text-sm text-gray-500">No dealerships assigned</p>
          ) : (
            <div className="space-y-3">
              {dealerships.map((access) => (
                <div
                  key={access.dealershipId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900">{access.dealership.name}</div>
                    <div className="text-sm text-gray-600">
                      Assigned on {new Date(access.assignedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleRemoveDealership(access.dealershipId)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Requests */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Requests</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Dealership
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {contractor.requestsAssigned.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                    No requests assigned yet
                  </td>
                </tr>
              ) : (
                contractor.requestsAssigned.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link
                        href={`/requests/${request.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {request.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {request.dealership.name}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={request.status} />
                    </td>
                    <td className="px-6 py-4">
                      <PriorityBadge priority={request.priority} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
