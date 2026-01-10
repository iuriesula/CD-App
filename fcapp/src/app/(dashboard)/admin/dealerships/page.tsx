"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface Dealership {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  createdAt: string;
  _count: {
    users: number;
    leads: number;
    vehicles: number;
  };
}

export default function DealershipsAdminPage() {
  const router = useRouter();
  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    // Admin user fields
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });

  const fetchDealerships = async () => {
    try {
      const response = await fetch("/api/dealerships");
      const data = await response.json();
      setDealerships(data.dealerships || []);
    } catch (error) {
      console.error("Failed to fetch dealerships:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkAdminAccess = async () => {
    try {
      const response = await fetch("/api/auth/session");
      const data = await response.json();
      if (data.session?.role !== "agency_admin") {
        router.push("/leads");
        return;
      }
      setIsAdmin(true);
    } catch (error) {
      console.error("Failed to check session:", error);
      router.push("/leads");
    }
  };

  useEffect(() => {
    checkAdminAccess();
    fetchDealerships();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch("/api/dealerships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create dealership");
      }

      setShowModal(false);
      setFormData({ name: "", address: "", city: "", state: "", zip: "", phone: "", adminName: "", adminEmail: "", adminPassword: "" });
      fetchDealerships();
    } catch (error) {
      console.error("Failed to create dealership:", error);
      alert(error instanceof Error ? error.message : "Failed to create dealership");
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Checking permissions...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dealerships...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dealerships</h1>
          <p className="text-gray-500 mt-1">
            Manage all dealerships in the system
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          Add Dealership
        </Button>
      </div>

      {dealerships.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-gray-500">
            <p className="text-lg font-medium">No dealerships yet</p>
            <p className="mt-1">Create your first dealership to get started</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {dealerships.map((dealership) => (
            <Card key={dealership.id} className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {dealership.name}
                  </h3>
                  {(dealership.address || dealership.city) && (
                    <p className="text-gray-600 mt-1">
                      {[dealership.address, dealership.city, dealership.state, dealership.zip]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                  {dealership.phone && (
                    <p className="text-gray-500 text-sm mt-1">{dealership.phone}</p>
                  )}
                </div>
                <div className="flex gap-6 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {dealership._count.users}
                    </div>
                    <div className="text-xs text-gray-500">Users</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {dealership._count.leads}
                    </div>
                    <div className="text-xs text-gray-500">Leads</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {dealership._count.vehicles}
                    </div>
                    <div className="text-xs text-gray-500">Vehicles</div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Dealership Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Add New Dealership</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dealership Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Classic Cars of Chicago"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="123 Auto Drive"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={2}
                    placeholder="IL"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    value={formData.zip}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={10}
                    placeholder="60601"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="(312) 555-0100"
                />
              </div>

              {/* Dealership Admin Section */}
              <div className="border-t pt-4 mt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Dealership Admin Account</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Admin Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.adminName}
                      onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="John Smith"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Admin Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.adminEmail}
                      onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="admin@dealership.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Admin Password *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={formData.adminPassword}
                      onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Min 6 characters"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowModal(false);
                    setFormData({ name: "", address: "", city: "", state: "", zip: "", phone: "", adminName: "", adminEmail: "", adminPassword: "" });
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Creating..." : "Create Dealership"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
