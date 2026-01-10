"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DepartmentBadge } from "@/components/requests/department-badge";
import { ContractorModal } from "./contractor-modal";
import type { User, ContractorDealershipAccess, Dealership, ContractorDepartment } from "@prisma/client";

type ContractorWithRelations = User & {
  contractorDealerships: (ContractorDealershipAccess & {
    dealership: Dealership;
  })[];
  requestsAssigned: { id: string; status: string }[];
};

interface ContractorsListClientProps {
  contractors: ContractorWithRelations[];
  dealerships: { id: string; name: string }[];
}

export function ContractorsListClient({ contractors: initialContractors, dealerships }: ContractorsListClientProps) {
  const [contractors, setContractors] = useState(initialContractors);
  const [showModal, setShowModal] = useState(false);
  const [editingContractor, setEditingContractor] = useState<ContractorWithRelations | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState<ContractorDepartment | "all">("all");

  const handleCreateNew = () => {
    setEditingContractor(null);
    setShowModal(true);
  };

  const handleEdit = (contractor: ContractorWithRelations) => {
    setEditingContractor(contractor);
    setShowModal(true);
  };

  const handleDelete = async (contractorId: string) => {
    if (!confirm("Are you sure you want to delete this contractor? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/contractors/${contractorId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete contractor");
      }

      setContractors(contractors.filter((c) => c.id !== contractorId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete contractor");
    }
  };

  const handleSuccess = () => {
    setShowModal(false);
    setEditingContractor(null);
    // Refresh the page to get updated data
    window.location.reload();
  };

  const filteredContractors = contractors.filter((contractor) => {
    const matchesSearch =
      contractor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contractor.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment =
      filterDepartment === "all" || contractor.contractorDepartment === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contractors</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage contractor access and dealership assignments
          </p>
        </div>
        <Button onClick={handleCreateNew}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Contractor
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
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
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Dealerships
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Active Requests
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredContractors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-sm">No contractors found</p>
                  </td>
                </tr>
              ) : (
                filteredContractors.map((contractor) => {
                  const activeRequests = contractor.requestsAssigned.filter(
                    (r) => r.status !== "closed" && r.status !== "resolved"
                  ).length;

                  return (
                    <tr key={contractor.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/contractors/${contractor.id}`}
                          className="font-medium text-blue-600 hover:text-blue-800"
                        >
                          {contractor.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{contractor.email}</td>
                      <td className="px-6 py-4">
                        {contractor.contractorDepartment && (
                          <DepartmentBadge department={contractor.contractorDepartment} />
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {contractor.contractorDealerships.length} dealership
                        {contractor.contractorDealerships.length !== 1 ? "s" : ""}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-900">{activeRequests}</span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={contractor.isActive ? "green" : "gray"} size="sm">
                          {contractor.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(contractor)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDelete(contractor.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <ContractorModal
          contractor={editingContractor}
          dealerships={dealerships}
          onClose={() => {
            setShowModal(false);
            setEditingContractor(null);
          }}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
