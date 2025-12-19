"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DuplicateLead {
  id: string;
  firstName: string | null;
  lastName: string | null;
  primaryEmail: string | null;
  primaryPhone: string | null;
  stage: string;
  createdAt: string;
}

interface Vehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  askingPrice: string | null;
  status: string;
}

const sourceOptions = [
  { value: "meta_ad", label: "Meta Ad" },
  { value: "website_form", label: "Website Form" },
  { value: "phone_call", label: "Phone Call" },
  { value: "walk_in", label: "Walk-in" },
  { value: "referral", label: "Referral" },
  { value: "email", label: "Email" },
];

export default function NewLeadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [duplicates, setDuplicates] = useState<DuplicateLead[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showCustomVehicle, setShowCustomVehicle] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    primaryEmail: "",
    primaryPhone: "",
    interestedVehicle: "",
    source: "phone_call",
    city: "",
    state: "",
    zip: "",
    notes: "",
  });

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const response = await fetch("/api/vehicles?status=available");
        const data = await response.json();
        setVehicles(data.vehicles || []);
      } catch (error) {
        console.error("Failed to fetch vehicles:", error);
      }
    };
    fetchVehicles();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
    setDuplicates([]);
  };

  const handleVehicleSelect = (value: string) => {
    if (value === "custom") {
      setShowCustomVehicle(true);
      setForm((prev) => ({ ...prev, interestedVehicle: "" }));
    } else {
      setShowCustomVehicle(false);
      setForm((prev) => ({ ...prev, interestedVehicle: value }));
    }
  };

  const formatVehicleName = (v: Vehicle) => {
    const name = `${v.year} ${v.make} ${v.model}${v.trim ? ` ${v.trim}` : ""}`;
    if (v.askingPrice) {
      const price = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
      }).format(parseFloat(v.askingPrice));
      return `${name} - ${price}`;
    }
    return name;
  };

  const handleSubmit = async (e: React.FormEvent, forceSave = false) => {
    e.preventDefault();
    setError("");

    // Validate at least email or phone is provided
    if (!form.primaryEmail && !form.primaryPhone) {
      setError("Please provide at least an email address or phone number");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          checkDuplicates: !forceSave,
        }),
      });

      const data = await response.json();

      if (response.status === 409 && data.duplicates) {
        setDuplicates(data.duplicates);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        setError(data.error || "Failed to create lead");
        setLoading(false);
        return;
      }

      router.push(`/leads/${data.lead.id}`);
    } catch (err) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  const getName = (lead: DuplicateLead) => {
    if (lead.firstName || lead.lastName) {
      return `${lead.firstName || ""} ${lead.lastName || ""}`.trim();
    }
    return lead.primaryEmail || lead.primaryPhone || "Unknown";
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/leads" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to leads
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Add New Lead</h1>
      </div>

      {/* Duplicate Warning */}
      {duplicates.length > 0 && (
        <Card className="mb-6 border-amber-300 bg-amber-50">
          <div className="p-4">
            <h3 className="font-semibold text-amber-900 mb-2">Potential duplicates found</h3>
            <p className="text-sm text-amber-800 mb-3">
              We found existing leads with matching contact information:
            </p>
            <div className="space-y-2 mb-4">
              {duplicates.map((dup) => (
                <div key={dup.id} className="bg-white p-3 rounded border border-amber-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{getName(dup)}</p>
                      <p className="text-sm text-gray-500">
                        {dup.primaryEmail} • {dup.primaryPhone}
                      </p>
                    </div>
                    <Link
                      href={`/leads/${dup.id}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDuplicates([])}
              >
                Edit form
              </Button>
              <Button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                loading={loading}
              >
                Create anyway
              </Button>
            </div>
          </div>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              placeholder="John"
            />
            <Input
              label="Last Name"
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              placeholder="Smith"
            />
            <Input
              label="Email"
              name="primaryEmail"
              type="email"
              value={form.primaryEmail}
              onChange={handleChange}
              placeholder="john@example.com"
            />
            <Input
              label="Phone"
              name="primaryPhone"
              type="tel"
              value={form.primaryPhone}
              onChange={handleChange}
              placeholder="(555) 123-4567"
            />
          </div>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="City"
              name="city"
              value={form.city}
              onChange={handleChange}
              placeholder="Chicago"
            />
            <Input
              label="State"
              name="state"
              value={form.state}
              onChange={handleChange}
              placeholder="IL"
            />
            <Input
              label="ZIP"
              name="zip"
              value={form.zip}
              onChange={handleChange}
              placeholder="60601"
            />
          </div>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Lead Details</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source
              </label>
              <select
                name="source"
                value={form.source}
                onChange={handleChange}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {sourceOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Interested Vehicle
              </label>
              <select
                value={showCustomVehicle ? "custom" : form.interestedVehicle}
                onChange={(e) => handleVehicleSelect(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select from inventory...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={formatVehicleName(v)}>
                    {formatVehicleName(v)}
                  </option>
                ))}
                <option value="custom">Other (enter manually)</option>
              </select>
              {showCustomVehicle && (
                <Input
                  name="interestedVehicle"
                  value={form.interestedVehicle}
                  onChange={handleChange}
                  placeholder="1967 Ford Mustang Fastback"
                  className="mt-2"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Initial notes about this lead..."
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px] resize-none"
              />
            </div>
          </div>
        </Card>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Link href="/leads">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
          <Button type="submit" loading={loading} disabled={duplicates.length > 0}>
            Create Lead
          </Button>
        </div>
      </form>
    </div>
  );
}
