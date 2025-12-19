"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface Dealership {
  id: string;
  name: string;
}

interface Vehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  vin: string | null;
  askingPrice: string | null;
  soldPrice: string | null;
  status: "available" | "pending" | "sold" | "reserved";
  mileage: number | null;
  exteriorColor: string | null;
  interiorColor: string | null;
  transmission: string | null;
  engine: string | null;
  description: string | null;
  photos: string[];
  locationCity: string | null;
  locationState: string | null;
  locationZip: string | null;
  stockNumber: string | null;
  createdAt: string;
  soldAt: string | null;
  dealership?: {
    id: string;
    name: string;
  };
}

const statusConfig: Record<string, { label: string; color: string }> = {
  available: { label: "Available", color: "green" },
  pending: { label: "Pending", color: "yellow" },
  sold: { label: "Sold", color: "gray" },
  reserved: { label: "Reserved", color: "blue" },
};

export default function InventoryPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [saving, setSaving] = useState(false);
  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [selectedDealershipId, setSelectedDealershipId] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [formData, setFormData] = useState({
    year: "",
    make: "",
    model: "",
    trim: "",
    vin: "",
    askingPrice: "",
    mileage: "",
    exteriorColor: "",
    interiorColor: "",
    transmission: "",
    engine: "",
    description: "",
    stockNumber: "",
    status: "available",
    dealershipId: "",
  });

  const fetchVehicles = async () => {
    try {
      const url = filter === "all" ? "/api/vehicles" : `/api/vehicles?status=${filter}`;
      const response = await fetch(url);
      const data = await response.json();
      setVehicles(data.vehicles || []);
    } catch (error) {
      console.error("Failed to fetch vehicles:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionAndDealerships = async () => {
    try {
      const sessionRes = await fetch("/api/auth/session");
      const sessionData = await sessionRes.json();
      const userIsAdmin = sessionData.session?.role === "agency_admin";
      setIsAdmin(userIsAdmin);

      if (userIsAdmin) {
        const dealershipsRes = await fetch("/api/dealerships");
        const dealershipsData = await dealershipsRes.json();
        setDealerships(dealershipsData.dealerships || []);
        if (dealershipsData.dealerships?.length === 1) {
          setSelectedDealershipId(dealershipsData.dealerships[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch session/dealerships:", error);
    }
  };

  useEffect(() => {
    fetchSessionAndDealerships();
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [filter]);

  const resetForm = () => {
    setFormData({
      year: "",
      make: "",
      model: "",
      trim: "",
      vin: "",
      askingPrice: "",
      mileage: "",
      exteriorColor: "",
      interiorColor: "",
      transmission: "",
      engine: "",
      description: "",
      stockNumber: "",
      status: "available",
      dealershipId: selectedDealershipId,
    });
    setEditingVehicle(null);
  };

  const openAddModal = () => {
    resetForm();
    setFormData((prev) => ({ ...prev, dealershipId: selectedDealershipId }));
    setShowModal(true);
  };

  const openEditModal = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      year: vehicle.year.toString(),
      make: vehicle.make,
      model: vehicle.model,
      trim: vehicle.trim || "",
      vin: vehicle.vin || "",
      askingPrice: vehicle.askingPrice || "",
      mileage: vehicle.mileage?.toString() || "",
      exteriorColor: vehicle.exteriorColor || "",
      interiorColor: vehicle.interiorColor || "",
      transmission: vehicle.transmission || "",
      engine: vehicle.engine || "",
      description: vehicle.description || "",
      stockNumber: vehicle.stockNumber || "",
      status: vehicle.status,
      dealershipId: vehicle.dealership?.id || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingVehicle ? `/api/vehicles/${editingVehicle.id}` : "/api/vehicles";
      const method = editingVehicle ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowModal(false);
        resetForm();
        await fetchVehicles();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to save vehicle");
      }
    } catch (error) {
      console.error("Failed to save vehicle:", error);
      alert("Failed to save vehicle");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (vehicle: Vehicle) => {
    if (!confirm(`Are you sure you want to delete ${vehicle.year} ${vehicle.make} ${vehicle.model}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/vehicles/${vehicle.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchVehicles();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete vehicle");
      }
    } catch (error) {
      console.error("Failed to delete vehicle:", error);
      alert("Failed to delete vehicle");
    }
  };

  const formatPrice = (price: string | null) => {
    if (!price) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(parseFloat(price));
  };

  const formatMileage = (mileage: number | null) => {
    if (!mileage) return "-";
    return new Intl.NumberFormat("en-US").format(mileage) + " mi";
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-600">{vehicles.length} vehicles</p>
        </div>
        <Button onClick={openAddModal}>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Vehicle
        </Button>
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
          variant={filter === "available" ? "primary" : "secondary"}
          onClick={() => setFilter("available")}
        >
          Available
        </Button>
        <Button
          size="sm"
          variant={filter === "pending" ? "primary" : "secondary"}
          onClick={() => setFilter("pending")}
        >
          Pending
        </Button>
        <Button
          size="sm"
          variant={filter === "reserved" ? "primary" : "secondary"}
          onClick={() => setFilter("reserved")}
        >
          Reserved
        </Button>
        <Button
          size="sm"
          variant={filter === "sold" ? "primary" : "secondary"}
          onClick={() => setFilter("sold")}
        >
          Sold
        </Button>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mileage
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Added
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </div>
                    {vehicle.trim && (
                      <div className="text-sm text-gray-500">{vehicle.trim}</div>
                    )}
                    {vehicle.vin && (
                      <div className="text-xs text-gray-400 font-mono">{vehicle.vin}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {vehicle.stockNumber || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="font-medium text-gray-900">
                      {formatPrice(vehicle.askingPrice)}
                    </div>
                    {vehicle.soldPrice && (
                      <div className="text-xs text-green-600">
                        Sold: {formatPrice(vehicle.soldPrice)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatMileage(vehicle.mileage)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusConfig[vehicle.status]?.color as any}>
                      {statusConfig[vehicle.status]?.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {format(new Date(vehicle.createdAt), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/inventory/${vehicle.id}`}
                        className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                      >
                        Sales Info
                      </Link>
                      <button
                        onClick={() => openEditModal(vehicle)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(vehicle)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {vehicles.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No vehicles found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add/Edit Vehicle Modal */}
      {showModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 my-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingVehicle ? "Edit Vehicle" : "Add Vehicle"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {isAdmin && !editingVehicle && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dealership *
                    </label>
                    <select
                      required
                      value={formData.dealershipId}
                      onChange={(e) => setFormData({ ...formData, dealershipId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select dealership...</option>
                      {dealerships.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Year *
                    </label>
                    <input
                      type="number"
                      required
                      min="1900"
                      max="2100"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Make *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.make}
                      onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Model *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Trim
                    </label>
                    <input
                      type="text"
                      value={formData.trim}
                      onChange={(e) => setFormData({ ...formData, trim: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      VIN
                    </label>
                    <input
                      type="text"
                      value={formData.vin}
                      onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Asking Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.askingPrice}
                      onChange={(e) => setFormData({ ...formData, askingPrice: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mileage
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.mileage}
                      onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stock Number
                    </label>
                    <input
                      type="text"
                      value={formData.stockNumber}
                      onChange={(e) => setFormData({ ...formData, stockNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Exterior Color
                    </label>
                    <input
                      type="text"
                      value={formData.exteriorColor}
                      onChange={(e) => setFormData({ ...formData, exteriorColor: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Interior Color
                    </label>
                    <input
                      type="text"
                      value={formData.interiorColor}
                      onChange={(e) => setFormData({ ...formData, interiorColor: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Transmission
                    </label>
                    <select
                      value={formData.transmission}
                      onChange={(e) => setFormData({ ...formData, transmission: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select...</option>
                      <option value="Automatic">Automatic</option>
                      <option value="Manual">Manual</option>
                      <option value="CVT">CVT</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Engine
                    </label>
                    <input
                      type="text"
                      value={formData.engine}
                      placeholder="e.g., 3.5L V6"
                      onChange={(e) => setFormData({ ...formData, engine: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {editingVehicle && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="available">Available</option>
                      <option value="pending">Pending</option>
                      <option value="reserved">Reserved</option>
                      <option value="sold">Sold</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowModal(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving..." : editingVehicle ? "Update Vehicle" : "Add Vehicle"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
