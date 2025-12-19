"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStageConfig, LeadStage } from "@/types";
import { format } from "date-fns";

interface Lead {
  id: string;
  firstName: string | null;
  lastName: string | null;
  primaryEmail: string | null;
  primaryPhone: string | null;
  interestedVehicle: string | null;
  stage: LeadStage;
  source: string | null;
  createdAt: string;
  assignedTo?: {
    id: string;
    name: string;
  } | null;
  dealership?: {
    id: string;
    name: string;
  };
}

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [merging, setMerging] = useState(false);

  const fetchLeads = async () => {
    try {
      const url = filter === "all" ? "/api/leads" : `/api/leads?stage=${filter}`;
      const response = await fetch(url);
      const data = await response.json();
      setLeads(data.leads || []);
    } catch (error) {
      console.error("Failed to fetch leads:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [filter]);

  const getName = (lead: Lead) => {
    if (lead.firstName || lead.lastName) {
      return `${lead.firstName || ""} ${lead.lastName || ""}`.trim();
    }
    return lead.primaryEmail || lead.primaryPhone || "Unknown";
  };

  const getStageBadgeVariant = (stage: LeadStage) => {
    const config = getStageConfig(stage);
    return config.color as any;
  };

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeads((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(leadId)) {
        newSet.delete(leadId);
      } else {
        newSet.add(leadId);
      }
      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedLeads(new Set());
  };

  const handleMerge = async (primaryLeadId: string) => {
    const selectedArray = Array.from(selectedLeads);
    const secondaryLeadId = selectedArray.find((id) => id !== primaryLeadId);

    if (!secondaryLeadId) return;

    setMerging(true);
    try {
      const response = await fetch("/api/leads/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryLeadId, secondaryLeadId }),
      });

      if (response.ok) {
        setShowMergeModal(false);
        setSelectedLeads(new Set());
        await fetchLeads();
        router.push(`/leads/${primaryLeadId}`);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to merge leads");
      }
    } catch (error) {
      console.error("Failed to merge leads:", error);
      alert("Failed to merge leads");
    } finally {
      setMerging(false);
    }
  };

  const selectedLeadsData = leads.filter((l) => selectedLeads.has(l.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Leads</h1>
          <p className="text-gray-600">{leads.length} leads</p>
        </div>
        <div className="flex gap-2">
          {selectedLeads.size === 2 && (
            <Button variant="secondary" onClick={() => setShowMergeModal(true)}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Merge Selected
            </Button>
          )}
          {selectedLeads.size > 0 && (
            <Button variant="secondary" onClick={clearSelection}>
              Clear ({selectedLeads.size})
            </Button>
          )}
          <Link href="/leads/new">
            <Button>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Lead
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-4 flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant={filter === "all" ? "primary" : "secondary"}
          onClick={() => setFilter("all")}
        >
          All
        </Button>
        <Button
          size="sm"
          variant={filter === "new_lead" ? "primary" : "secondary"}
          onClick={() => setFilter("new_lead")}
        >
          New
        </Button>
        <Button
          size="sm"
          variant={filter === "interested" ? "primary" : "secondary"}
          onClick={() => setFilter("interested")}
        >
          Interested
        </Button>
        <Button
          size="sm"
          variant={filter === "negotiating" ? "primary" : "secondary"}
          onClick={() => setFilter("negotiating")}
        >
          Negotiating
        </Button>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                  <span className="sr-only">Select</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle Interest
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stage
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className={`hover:bg-gray-50 ${selectedLeads.has(lead.id) ? "bg-blue-50" : ""}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedLeads.has(lead.id)}
                      onChange={() => toggleLeadSelection(lead.id)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      {getName(lead)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    <div>{lead.primaryEmail}</div>
                    <div>{lead.primaryPhone}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {lead.interestedVehicle || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={getStageBadgeVariant(lead.stage)}>
                      {getStageConfig(lead.stage).label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {format(new Date(lead.createdAt), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {lead.assignedTo?.name || "-"}
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No leads found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Merge Modal */}
      {showMergeModal && selectedLeadsData.length === 2 && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowMergeModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Merge Leads</h2>
              <p className="text-gray-600 mb-4">
                Select which lead to keep as the primary. The other lead's contact info,
                activities, and tasks will be merged into the primary lead.
              </p>

              <div className="space-y-3 mb-6">
                {selectedLeadsData.map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => handleMerge(lead.id)}
                    disabled={merging}
                    className="w-full p-4 border border-gray-200 rounded-lg text-left hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50"
                  >
                    <div className="font-medium text-gray-900">{getName(lead)}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {lead.primaryEmail} {lead.primaryPhone && `• ${lead.primaryPhone}`}
                    </div>
                    <div className="text-sm text-gray-500">
                      {lead.interestedVehicle || "No vehicle specified"}
                    </div>
                    <div className="text-xs text-blue-600 mt-2 font-medium">
                      Click to keep this as primary
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  onClick={() => setShowMergeModal(false)}
                  disabled={merging}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
