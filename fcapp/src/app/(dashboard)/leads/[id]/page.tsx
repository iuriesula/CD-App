"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { STAGE_CONFIG, getStageConfig, LeadStage } from "@/types";
import { format } from "date-fns";
import { EmailComposer } from "@/components/email/email-composer";
import { BuyersOrderBuilder } from "@/components/documents/buyers-order-builder";
import { InvoiceBuilder } from "@/components/documents/invoice-builder";

interface Activity {
  id: string;
  activityType: string;
  details: Record<string, any>;
  createdAt: string;
  user?: { id: string; name: string } | null;
}

interface Task {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
  taskType: string;
}

interface Email {
  id: string;
  direction: string;
  fromAddress: string;
  toAddress: string;
  subject: string | null;
  bodyText: string | null;
  createdAt: string;
  openedAt: string | null;
  user?: { id: string; name: string } | null;
}

interface ShippingEstimate {
  distanceMiles: number;
  openTransport: { low: number; high: number };
  enclosedTransport: { low: number; high: number };
  estimatedDays: { min: number; max: number };
}

interface Document {
  id: string;
  documentType: string;
  status: string;
  createdAt: string;
  sentAt: string | null;
  viewedAt: string | null;
  signedAt: string | null;
}

interface Vehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  vin: string | null;
  exteriorColor: string | null;
  askingPrice: string | null;
  mileage: number | null;
  stockNumber: string | null;
  status: string;
}

interface Lead {
  id: string;
  firstName: string | null;
  lastName: string | null;
  primaryEmail: string | null;
  primaryPhone: string | null;
  alternateEmails: string[];
  alternatePhones: string[];
  interestedVehicle: string | null;
  vehicleId: string | null;
  vehicle?: Vehicle | null;
  stage: LeadStage;
  source: string | null;
  notes: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  sourceIp: string | null;
  attemptCount: number;
  winProbability: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  assignedTo?: { id: string; name: string; email: string } | null;
  dealership?: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    phone: string | null;
    email: string | null;
    logoUrl: string | null;
    brandColor: string | null;
  };
  activities: Activity[];
  tasks: Task[];
  documents: Document[];
}

const activityIcons: Record<string, string> = {
  email_sent: "📤",
  email_received: "📥",
  call_outbound: "📞",
  call_inbound: "📲",
  call_missed: "📵",
  voicemail_left: "🎤",
  note_added: "📝",
  stage_changed: "🔄",
  document_sent: "📄",
  document_signed: "✅",
};

const activityLabels: Record<string, string> = {
  email_sent: "Email sent",
  email_received: "Email received",
  call_outbound: "Outbound call",
  call_inbound: "Inbound call",
  call_missed: "Missed call",
  voicemail_left: "Voicemail left",
  note_added: "Note added",
  stage_changed: "Stage changed",
  document_sent: "Document sent",
  document_signed: "Document signed",
};

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState("");
  const [showStageSelect, setShowStageSelect] = useState(false);
  const [loggingActivity, setLoggingActivity] = useState<string | null>(null);
  const [shippingEstimate, setShippingEstimate] = useState<ShippingEstimate | null>(null);
  const [calculatingShipping, setCalculatingShipping] = useState(false);
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [emails, setEmails] = useState<Email[]>([]);
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showVehicleSelect, setShowVehicleSelect] = useState(false);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [notesChanged, setNotesChanged] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [showBuyersOrder, setShowBuyersOrder] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [contactForm, setContactForm] = useState({
    firstName: "",
    lastName: "",
    primaryEmail: "",
    primaryPhone: "",
    city: "",
    state: "",
    zip: "",
  });

  const fetchEmails = async (leadId: string) => {
    try {
      const response = await fetch(`/api/email/inbox?leadId=${leadId}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setEmails(data.emails || []);
      }
    } catch (error) {
      console.error("Failed to fetch emails:", error);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await fetch("/api/vehicles");
      if (response.ok) {
        const data = await response.json();
        setVehicles(data.vehicles || []);
      }
    } catch (error) {
      console.error("Failed to fetch vehicles:", error);
    }
  };

  const handleVehicleChange = async (vehicleId: string | null) => {
    if (!lead) return;
    setSavingVehicle(true);
    try {
      await fetch(`/api/leads/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId }),
      });
      await fetchLead();
    } catch (error) {
      console.error("Failed to update vehicle:", error);
    } finally {
      setSavingVehicle(false);
      setShowVehicleSelect(false);
    }
  };

  const getVehicleDisplayName = (v: Vehicle) => {
    const parts = [v.year, v.make, v.model];
    if (v.trim) parts.push(v.trim);
    if (v.exteriorColor) parts.push(`- ${v.exteriorColor}`);
    return parts.join(" ");
  };

  const fetchLead = async () => {
    try {
      const response = await fetch(`/api/leads/${params.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          router.push("/leads");
          return;
        }
        throw new Error("Failed to fetch lead");
      }
      const data = await response.json();
      setLead(data.lead);
      setNotes(data.lead.notes || "");
      // Fetch emails for this lead
      fetchEmails(data.lead.id);
    } catch (error) {
      console.error("Failed to fetch lead:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLead();
    fetchVehicles();
  }, [params.id]);

  const calculateShipping = async () => {
    if (!lead?.zip) {
      alert("Customer ZIP code is required");
      return;
    }

    if (!lead?.dealership?.zip) {
      alert("Dealership ZIP code is not set");
      return;
    }

    setCalculatingShipping(true);
    setShippingEstimate(null);

    try {
      const response = await fetch("/api/shipping/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originZip: lead.dealership.zip,
          destinationZip: lead.zip,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setShippingEstimate(data);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to calculate shipping");
      }
    } catch (error) {
      console.error("Failed to calculate shipping:", error);
      alert("Failed to calculate shipping");
    } finally {
      setCalculatingShipping(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleStageChange = async (newStage: LeadStage) => {
    if (!lead) return;
    setSaving(true);
    try {
      await fetch(`/api/leads/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      await fetchLead();
    } catch (error) {
      console.error("Failed to update stage:", error);
    } finally {
      setSaving(false);
      setShowStageSelect(false);
    }
  };

  const handleNotesSave = async () => {
    if (!lead || notes === (lead.notes || "")) return;
    setSavingNotes(true);
    try {
      await fetch(`/api/leads/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      setNotesChanged(false);
      // Update lead's notes in local state
      setLead({ ...lead, notes });
    } catch (error) {
      console.error("Failed to save notes:", error);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    setNotesChanged(value !== (lead?.notes || ""));
  };

  const startEditingContact = () => {
    if (!lead) return;
    setContactForm({
      firstName: lead.firstName || "",
      lastName: lead.lastName || "",
      primaryEmail: lead.primaryEmail || "",
      primaryPhone: lead.primaryPhone || "",
      city: lead.city || "",
      state: lead.state || "",
      zip: lead.zip || "",
    });
    setEditingContact(true);
  };

  const cancelEditingContact = () => {
    setEditingContact(false);
  };

  const saveContact = async () => {
    if (!lead) return;
    setSavingContact(true);
    try {
      await fetch(`/api/leads/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm),
      });
      await fetchLead();
      setEditingContact(false);
    } catch (error) {
      console.error("Failed to save contact:", error);
    } finally {
      setSavingContact(false);
    }
  };

  const logActivity = async (activityType: string) => {
    if (!lead) return;
    setLoggingActivity(activityType);
    try {
      await fetch(`/api/leads/${lead.id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityType }),
      });
      await fetchLead();
    } catch (error) {
      console.error("Failed to log activity:", error);
    } finally {
      setLoggingActivity(null);
    }
  };

  const getName = () => {
    if (!lead) return "";
    if (lead.firstName || lead.lastName) {
      return `${lead.firstName || ""} ${lead.lastName || ""}`.trim();
    }
    return lead.primaryEmail || lead.primaryPhone || "Unknown";
  };

  const stageConfig = lead ? getStageConfig(lead.stage) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Lead not found</h2>
        <Link href="/leads" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to leads
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/leads" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to leads
        </Link>

        <div className="flex items-start justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{getName()}</h1>
            <div className="flex items-center gap-3 mt-2">
              <div className="relative">
                <button
                  onClick={() => setShowStageSelect(!showStageSelect)}
                  className="flex items-center gap-2"
                >
                  <Badge variant={stageConfig?.color as any} size="md">
                    {stageConfig?.label}
                  </Badge>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showStageSelect && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowStageSelect(false)} />
                    <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 w-56">
                      {STAGE_CONFIG.map((stage) => (
                        <button
                          key={stage.id}
                          onClick={() => handleStageChange(stage.id)}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                            lead.stage === stage.id ? "bg-blue-50 text-blue-700" : "text-gray-700"
                          }`}
                        >
                          {stage.label}
                          <span className="text-xs text-gray-400">{Math.round(stage.winProbability * 100)}%</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <span className="text-sm text-gray-500">
                {Math.round(parseFloat(lead.winProbability) * 100)}% win probability
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            {lead.primaryPhone && (
              <a
                href={`tel:${lead.primaryPhone}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Call
              </a>
            )}
            {lead.primaryEmail && (
              <button
                onClick={() => setShowEmailComposer(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - Left side */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Contact Information</CardTitle>
                {!editingContact ? (
                  <button
                    onClick={startEditingContact}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      onClick={saveContact}
                      disabled={savingContact}
                      size="sm"
                    >
                      {savingContact ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      onClick={cancelEditingContact}
                      disabled={savingContact}
                      size="sm"
                      variant="secondary"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>

            {editingContact ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">First Name</label>
                    <Input
                      value={contactForm.firstName}
                      onChange={(e) => setContactForm({ ...contactForm, firstName: e.target.value })}
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Last Name</label>
                    <Input
                      value={contactForm.lastName}
                      onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })}
                      placeholder="Last name"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phone</label>
                    <Input
                      value={contactForm.primaryPhone}
                      onChange={(e) => setContactForm({ ...contactForm, primaryPhone: e.target.value })}
                      placeholder="Phone number"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <Input
                      type="email"
                      value={contactForm.primaryEmail}
                      onChange={(e) => setContactForm({ ...contactForm, primaryEmail: e.target.value })}
                      placeholder="Email address"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">City</label>
                    <Input
                      value={contactForm.city}
                      onChange={(e) => setContactForm({ ...contactForm, city: e.target.value })}
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">State</label>
                    <Input
                      value={contactForm.state}
                      onChange={(e) => setContactForm({ ...contactForm, state: e.target.value })}
                      placeholder="State"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">ZIP</label>
                    <Input
                      value={contactForm.zip}
                      onChange={(e) => setContactForm({ ...contactForm, zip: e.target.value })}
                      placeholder="ZIP code"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p className="text-gray-900">
                    {[lead.firstName, lead.lastName].filter(Boolean).join(" ") || "-"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p className="text-gray-900">{lead.primaryPhone || "-"}</p>
                  {lead.alternatePhones.length > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      Alt: {lead.alternatePhones.join(", ")}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900">{lead.primaryEmail || "-"}</p>
                  {lead.alternateEmails.length > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      Alt: {lead.alternateEmails.join(", ")}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Location</label>
                  <p className="text-gray-900 flex items-center gap-1">
                    {[lead.city, lead.state, lead.zip].filter(Boolean).join(", ") || "-"}
                    {lead.sourceIp && (lead.city || lead.state) && (
                      <span
                        className="text-gray-400 cursor-help"
                        title={`Auto-detected from IP: ${lead.sourceIp}`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Source</label>
                  <p className="text-gray-900 capitalize">{lead.source?.replace("_", " ") || "-"}</p>
                </div>
              </div>
            )}
          </Card>

          {/* Vehicle Interest */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Vehicle Interest</CardTitle>
                <button
                  onClick={() => setShowVehicleSelect(!showVehicleSelect)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {lead.vehicleId ? "Change" : "Link to Inventory"}
                </button>
              </div>
            </CardHeader>

            {/* Original inquiry text */}
            {lead.interestedVehicle && (
              <div className="mb-3">
                <label className="text-xs font-medium text-gray-500 uppercase">Original Inquiry</label>
                <p className="text-gray-700 text-sm">{lead.interestedVehicle}</p>
              </div>
            )}

            {/* Linked vehicle from inventory */}
            {lead.vehicle ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-green-600">&#10003;</span>
                  <span className="font-medium text-gray-900">
                    {getVehicleDisplayName(lead.vehicle)}
                  </span>
                </div>
                {lead.vehicle.askingPrice && (
                  <p className="text-sm text-gray-600 mt-1">
                    ${parseFloat(lead.vehicle.askingPrice).toLocaleString()}
                  </p>
                )}
                <button
                  onClick={() => handleVehicleChange(null)}
                  disabled={savingVehicle}
                  className="text-xs text-red-600 hover:text-red-700 mt-2"
                >
                  {savingVehicle ? "Removing..." : "Remove link"}
                </button>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No vehicle linked from inventory</p>
            )}

            {/* Vehicle selector dropdown */}
            {showVehicleSelect && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowVehicleSelect(false)} />
                <div className="relative z-20 mt-3">
                  <div className="absolute top-0 left-0 right-0 bg-white rounded-lg shadow-lg border border-gray-200 max-h-64 overflow-auto">
                    <div className="sticky top-0 bg-gray-50 px-3 py-2 border-b text-xs font-medium text-gray-500 uppercase">
                      Select from Inventory
                    </div>
                    {vehicles.filter(v => v.status === "available").length === 0 ? (
                      <div className="px-3 py-4 text-sm text-gray-500 text-center">
                        No available vehicles
                      </div>
                    ) : (
                      vehicles
                        .filter(v => v.status === "available")
                        .map((v) => (
                          <button
                            key={v.id}
                            onClick={() => handleVehicleChange(v.id)}
                            disabled={savingVehicle}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between ${
                              lead.vehicleId === v.id ? "bg-blue-50 text-blue-700" : "text-gray-700"
                            }`}
                          >
                            <span>{getVehicleDisplayName(v)}</span>
                            {v.askingPrice && (
                              <span className="text-xs text-gray-500">
                                ${parseFloat(v.askingPrice).toLocaleString()}
                              </span>
                            )}
                          </button>
                        ))
                    )}
                  </div>
                </div>
              </>
            )}
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Notes</CardTitle>
                {notesChanged && (
                  <Button
                    onClick={handleNotesSave}
                    disabled={savingNotes}
                    size="sm"
                  >
                    {savingNotes ? "Saving..." : "Save Notes"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Add notes about this lead..."
              className="w-full min-h-[120px] p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {notesChanged && !savingNotes && (
              <p className="text-sm text-amber-600 mt-1">Unsaved changes</p>
            )}
          </Card>

          {/* Email History */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Email History</CardTitle>
                {lead.primaryEmail && (
                  <button
                    onClick={() => setShowEmailComposer(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + New Email
                  </button>
                )}
              </div>
            </CardHeader>
            {emails.length === 0 ? (
              <p className="text-gray-500 text-sm">No emails yet</p>
            ) : (
              <div className="space-y-3">
                {emails.map((email) => (
                  <div
                    key={email.id}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedEmail(expandedEmail === email.id ? null : email.id)}
                      className="w-full text-left p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white ${
                          email.direction === "outbound" ? "bg-blue-500" : "bg-green-500"
                        }`}>
                          {email.direction === "outbound" ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 truncate">
                              {email.subject || "(No subject)"}
                            </span>
                            {email.direction === "outbound" && email.openedAt && (
                              <span className="flex-shrink-0 px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                                Opened
                              </span>
                            )}
                            {email.direction === "outbound" && !email.openedAt && (
                              <span className="flex-shrink-0 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                Not opened
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                            <span>{email.direction === "outbound" ? "To:" : "From:"}</span>
                            <span className="truncate">
                              {email.direction === "outbound" ? email.toAddress : email.fromAddress}
                            </span>
                            <span>·</span>
                            <span className="flex-shrink-0">
                              {format(new Date(email.createdAt), "MMM d, h:mm a")}
                            </span>
                          </div>
                        </div>
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform ${
                            expandedEmail === email.id ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>
                    {expandedEmail === email.id && (
                      <div className="px-3 pb-3 border-t border-gray-100">
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                          {email.bodyText || "(No content)"}
                        </div>
                        {email.user && (
                          <p className="mt-2 text-xs text-gray-500">
                            Sent by {email.user.name}
                          </p>
                        )}
                        {email.openedAt && (
                          <p className="mt-1 text-xs text-green-600">
                            Opened: {format(new Date(email.openedAt), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
            </CardHeader>
            {lead.activities.length === 0 ? (
              <p className="text-gray-500 text-sm">No activities yet</p>
            ) : (
              <div className="space-y-4">
                {lead.activities.map((activity) => (
                  <div key={activity.id} className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-lg">
                      {activityIcons[activity.activityType] || "📋"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {activityLabels[activity.activityType] || activity.activityType}
                        </span>
                        <span className="text-sm text-gray-500">
                          {format(new Date(activity.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                      </div>
                      {activity.user && (
                        <p className="text-sm text-gray-500">by {activity.user.name}</p>
                      )}
                      {activity.activityType === "stage_changed" && activity.details && (
                        <p className="text-sm text-gray-600 mt-1">
                          {activity.details.oldStage?.replace("_", " ")} → {activity.details.newStage?.replace("_", " ")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar - Right side */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Log Activity</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => logActivity("call_outbound")}
                disabled={loggingActivity !== null}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <span>📞</span>
                {loggingActivity === "call_outbound" ? "..." : "Called"}
              </button>
              <button
                onClick={() => logActivity("call_missed")}
                disabled={loggingActivity !== null}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <span>📵</span>
                {loggingActivity === "call_missed" ? "..." : "No Answer"}
              </button>
              <button
                onClick={() => logActivity("voicemail_left")}
                disabled={loggingActivity !== null}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <span>🎤</span>
                {loggingActivity === "voicemail_left" ? "..." : "Voicemail"}
              </button>
              <button
                onClick={() => logActivity("email_sent")}
                disabled={loggingActivity !== null}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <span>📤</span>
                {loggingActivity === "email_sent" ? "..." : "Emailed"}
              </button>
              <button
                onClick={() => logActivity("call_inbound")}
                disabled={loggingActivity !== null}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <span>📲</span>
                {loggingActivity === "call_inbound" ? "..." : "They Called"}
              </button>
              <button
                onClick={() => logActivity("email_received")}
                disabled={loggingActivity !== null}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <span>📥</span>
                {loggingActivity === "email_received" ? "..." : "Got Email"}
              </button>
            </div>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              {/* Existing Documents */}
              {lead.documents && lead.documents.length > 0 && (
                <div className="space-y-2 pb-3 border-b border-gray-200">
                  {lead.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {doc.documentType === "buyers_order" ? "Buyer's Order" : "Invoice"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(doc.createdAt), "MMM d, h:mm a")}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          doc.status === "signed" ? "success" :
                          doc.status === "sent" ? "warning" :
                          doc.status === "viewed" ? "info" :
                          "secondary"
                        }
                        size="sm"
                      >
                        {doc.status === "draft" ? "Draft" :
                         doc.status === "sent" ? "Awaiting Signature" :
                         doc.status === "viewed" ? "Viewed" :
                         doc.status === "signed" ? "Signed" : doc.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* Create New Documents */}
              <div className="space-y-2">
                <button
                  onClick={() => setShowBuyersOrder(true)}
                  disabled={!lead.vehicle}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Buyer's Order
                </button>
                <button
                  onClick={() => setShowInvoice(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Invoice
                </button>
                {!lead.vehicle && (
                  <p className="text-xs text-gray-500 px-1">
                    Link a vehicle from inventory for full details
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Quick Info */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Assigned to</span>
                <span className="text-gray-900 font-medium">{lead.assignedTo?.name || "Unassigned"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span className="text-gray-900">{format(new Date(lead.createdAt), "MMM d, yyyy")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Follow-up attempts</span>
                <span className="text-gray-900">{lead.attemptCount} / 5</span>
              </div>
              {lead.closedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Closed</span>
                  <span className="text-gray-900">{format(new Date(lead.closedAt), "MMM d, yyyy")}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Pending Tasks */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Tasks</CardTitle>
            </CardHeader>
            {lead.tasks.length === 0 ? (
              <p className="text-gray-500 text-sm">No pending tasks</p>
            ) : (
              <div className="space-y-2">
                {lead.tasks.map((task) => (
                  <div key={task.id} className="p-2 bg-gray-50 rounded-lg">
                    <p className="font-medium text-gray-900 text-sm">{task.title}</p>
                    <p className="text-xs text-gray-500">
                      Due: {format(new Date(task.dueDate), "MMM d, yyyy")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Shipping Calculator */}
          <Card>
            <CardHeader>
              <CardTitle>Shipping Calculator</CardTitle>
            </CardHeader>
            {!lead.zip ? (
              <p className="text-gray-500 text-sm">Add customer ZIP code to calculate shipping</p>
            ) : !lead.dealership?.zip ? (
              <p className="text-gray-500 text-sm">Dealership ZIP code not set</p>
            ) : (
              <div className="space-y-3">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">From:</span>
                    <span className="text-gray-900">{lead.dealership.city || lead.dealership.name}, {lead.dealership.zip}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">To:</span>
                    <span className="text-gray-900">{lead.city || "Customer"}, {lead.zip}</span>
                  </div>
                </div>

                <Button
                  onClick={calculateShipping}
                  disabled={calculatingShipping}
                  size="sm"
                  className="w-full"
                >
                  {calculatingShipping ? "Calculating..." : "Calculate Shipping"}
                </Button>

                {shippingEstimate && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg space-y-3">
                    <div className="text-center text-sm text-gray-600 mb-2">
                      {shippingEstimate.distanceMiles.toLocaleString()} miles
                    </div>

                    <div className="border-b border-gray-200 pb-2">
                      <p className="text-xs font-medium text-gray-500 uppercase">Open Transport</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(shippingEstimate.openTransport.low)} - {formatCurrency(shippingEstimate.openTransport.high)}
                      </p>
                    </div>

                    <div className="border-b border-gray-200 pb-2">
                      <p className="text-xs font-medium text-gray-500 uppercase">Enclosed Transport</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(shippingEstimate.enclosedTransport.low)} - {formatCurrency(shippingEstimate.enclosedTransport.high)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Estimated Delivery</p>
                      <p className="text-sm font-medium text-gray-900">
                        {shippingEstimate.estimatedDays.min} - {shippingEstimate.estimatedDays.max} business days
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Dealership */}
          {lead.dealership && (
            <Card>
              <CardHeader>
                <CardTitle>Dealership</CardTitle>
              </CardHeader>
              <p className="text-gray-900">{lead.dealership.name}</p>
            </Card>
          )}
        </div>
      </div>

      {/* Email Composer Modal */}
      {showEmailComposer && lead.primaryEmail && (
        <EmailComposer
          leadId={lead.id}
          recipientEmail={lead.primaryEmail}
          recipientName={getName()}
          lead={{
            firstName: lead.firstName || undefined,
            lastName: lead.lastName || undefined,
            interestedVehicle: lead.interestedVehicle || undefined,
          }}
          dealershipName={lead.dealership?.name}
          onClose={() => setShowEmailComposer(false)}
          onSent={() => {
            fetchLead();
            fetchEmails(lead.id);
          }}
        />
      )}

      {/* Buyer's Order Builder Modal */}
      {showBuyersOrder && lead.dealership && (
        <BuyersOrderBuilder
          lead={{
            id: lead.id,
            firstName: lead.firstName,
            lastName: lead.lastName,
            primaryEmail: lead.primaryEmail,
            primaryPhone: lead.primaryPhone,
            city: lead.city,
            state: lead.state,
            zip: lead.zip,
          }}
          vehicle={lead.vehicle}
          dealership={lead.dealership}
          currentUserName={lead.assignedTo?.name || ""}
          onClose={() => setShowBuyersOrder(false)}
          onSaved={() => {
            fetchLead();
            setShowBuyersOrder(false);
          }}
        />
      )}

      {/* Invoice Builder Modal */}
      {showInvoice && lead.dealership && (
        <InvoiceBuilder
          lead={{
            id: lead.id,
            firstName: lead.firstName,
            lastName: lead.lastName,
            primaryEmail: lead.primaryEmail,
            primaryPhone: lead.primaryPhone,
            city: lead.city,
            state: lead.state,
            zip: lead.zip,
          }}
          vehicle={lead.vehicle}
          dealership={lead.dealership}
          onClose={() => setShowInvoice(false)}
          onSaved={() => {
            fetchLead();
            setShowInvoice(false);
          }}
        />
      )}
    </div>
  );
}
