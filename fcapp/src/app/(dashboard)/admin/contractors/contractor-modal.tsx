"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { User, ContractorDepartment, ContractorDealershipAccess, Dealership } from "@prisma/client";

type ContractorWithRelations = User & {
  contractorDealerships: (ContractorDealershipAccess & {
    dealership: Dealership;
  })[];
};

interface ContractorModalProps {
  contractor: ContractorWithRelations | null;
  dealerships: { id: string; name: string }[];
  onClose: () => void;
  onSuccess: () => void;
}

export function ContractorModal({ contractor, dealerships, onClose, onSuccess }: ContractorModalProps) {
  const isEdit = !!contractor;
  const [formData, setFormData] = useState({
    name: contractor?.name || "",
    email: contractor?.email || "",
    password: "",
    contractorDepartment: (contractor?.contractorDepartment as ContractorDepartment) || "it",
    isActive: contractor?.isActive ?? true,
    dealershipIds: contractor?.contractorDealerships.map((cd) => cd.dealershipId) || [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const url = isEdit ? `/api/contractors/${contractor.id}` : "/api/contractors";
      const method = isEdit ? "PUT" : "POST";

      const body = isEdit
        ? {
            name: formData.name,
            email: formData.email,
            contractorDepartment: formData.contractorDepartment,
            isActive: formData.isActive,
          }
        : {
            name: formData.name,
            email: formData.email,
            password: formData.password,
            contractorDepartment: formData.contractorDepartment,
            dealershipIds: formData.dealershipIds,
          };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${isEdit ? "update" : "create"} contractor`);
      }

      const result = await response.json();

      // If editing, update dealerships separately
      if (isEdit) {
        // Remove existing dealerships
        await fetch(`/api/contractors/${contractor.id}/dealerships`, {
          method: "DELETE",
        });

        // Add new dealerships
        if (formData.dealershipIds.length > 0) {
          await fetch(`/api/contractors/${contractor.id}/dealerships`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dealershipIds: formData.dealershipIds }),
          });
        }
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isEdit ? "update" : "create"} contractor`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDealership = (dealershipId: string) => {
    setFormData((prev) => ({
      ...prev,
      dealershipIds: prev.dealershipIds.includes(dealershipId)
        ? prev.dealershipIds.filter((id) => id !== dealershipId)
        : [...prev.dealershipIds, dealershipId],
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {isEdit ? "Edit Contractor" : "Add New Contractor"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                required={!isEdit}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.contractorDepartment}
              onChange={(e) =>
                setFormData({ ...formData, contractorDepartment: e.target.value as ContractorDepartment })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="it">IT</option>
              <option value="marketing">Marketing</option>
              <option value="content">Content</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assigned Dealerships
            </label>
            <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
              {dealerships.length === 0 ? (
                <p className="text-sm text-gray-500">No dealerships available</p>
              ) : (
                dealerships.map((dealership) => (
                  <label key={dealership.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.dealershipIds.includes(dealership.id)}
                      onChange={() => toggleDealership(dealership.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-900">{dealership.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {isEdit && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Active
              </label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? "Update" : "Create"} Contractor
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
