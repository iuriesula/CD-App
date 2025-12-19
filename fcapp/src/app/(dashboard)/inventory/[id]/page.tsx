"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  stockNumber: string | null;
  locationCity: string | null;
  locationState: string | null;
  locationZip: string | null;
  websiteDescription: string | null;
  technicalBulletpoints: string | null;
  callScript: string | null;
  createdAt: string;
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

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.id as string;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<number>(0);

  // Sales Info form state
  const [salesInfo, setSalesInfo] = useState({
    websiteDescription: "",
    technicalBulletpoints: "",
    callScript: "",
  });

  useEffect(() => {
    fetchVehicle();
  }, [vehicleId]);

  const fetchVehicle = async () => {
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch vehicle");
      }

      setVehicle(data.vehicle);
      setSalesInfo({
        websiteDescription: data.vehicle.websiteDescription || "",
        technicalBulletpoints: data.vehicle.technicalBulletpoints || "",
        callScript: data.vehicle.callScript || "",
      });
    } catch (error) {
      console.error("Failed to fetch vehicle:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSalesInfo = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/vehicles/${vehicleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(salesInfo),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save");
      }

      const data = await response.json();
      setVehicle(data.vehicle);
      setMessage({ type: "success", text: "Changes saved successfully" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save",
      });
    } finally {
      setSaving(false);
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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: "success", text: `${label} copied to clipboard` });
    setTimeout(() => setMessage(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Vehicle not found</h2>
        <Link href="/inventory" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to Inventory
        </Link>
      </div>
    );
  }

  const hasPhotos = vehicle.photos && vehicle.photos.length > 0;

  return (
    <div className="max-w-5xl">
      {/* Floating Message */}
      {message && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg text-sm ${
            message.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/inventory" className="hover:text-gray-700">
          Inventory
        </Link>
        <span>/</span>
        <span className="text-gray-900">
          {vehicle.year} {vehicle.make} {vehicle.model}
        </span>
      </div>

      {/* Main Layout: 2 columns on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Photos + Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                  {vehicle.trim && <span className="text-gray-500 font-normal"> {vehicle.trim}</span>}
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  <Badge variant={statusConfig[vehicle.status]?.color as any}>
                    {statusConfig[vehicle.status]?.label}
                  </Badge>
                  {vehicle.stockNumber && (
                    <span className="text-sm text-gray-500">Stock #{vehicle.stockNumber}</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {formatPrice(vehicle.askingPrice)}
                </div>
                {vehicle.mileage && (
                  <div className="text-sm text-gray-500">{formatMileage(vehicle.mileage)}</div>
                )}
              </div>
            </div>

            {/* Photo Gallery */}
            {hasPhotos && (
              <div className="mb-4">
                <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden mb-2">
                  <img
                    src={vehicle.photos[selectedPhoto]}
                    alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                    className="w-full h-full object-cover"
                  />
                  {vehicle.photos.length > 1 && (
                    <>
                      <button
                        onClick={() => setSelectedPhoto((prev) => (prev > 0 ? prev - 1 : vehicle.photos.length - 1))}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setSelectedPhoto((prev) => (prev < vehicle.photos.length - 1 ? prev + 1 : 0))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
                        {selectedPhoto + 1} / {vehicle.photos.length}
                      </div>
                    </>
                  )}
                </div>
                {vehicle.photos.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {vehicle.photos.map((photo, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedPhoto(index)}
                        className={`flex-shrink-0 w-16 h-12 rounded overflow-hidden border-2 ${
                          selectedPhoto === index ? "border-blue-600" : "border-transparent"
                        }`}
                      >
                        <img src={photo} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Vehicle Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 uppercase tracking-wide">Exterior</div>
                <div className="text-sm font-medium text-gray-900 mt-1">{vehicle.exteriorColor || "-"}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 uppercase tracking-wide">Interior</div>
                <div className="text-sm font-medium text-gray-900 mt-1">{vehicle.interiorColor || "-"}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 uppercase tracking-wide">Transmission</div>
                <div className="text-sm font-medium text-gray-900 mt-1">{vehicle.transmission || "-"}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 uppercase tracking-wide">Engine</div>
                <div className="text-sm font-medium text-gray-900 mt-1">{vehicle.engine || "-"}</div>
              </div>
            </div>

            {/* VIN & Location Row */}
            <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-sm">
              {vehicle.vin && (
                <div>
                  <span className="text-gray-500">VIN:</span>{" "}
                  <span className="font-mono text-gray-900">{vehicle.vin}</span>
                </div>
              )}
              {(vehicle.locationCity || vehicle.locationState) && (
                <div>
                  <span className="text-gray-500">Location:</span>{" "}
                  <span className="text-gray-900">
                    {[vehicle.locationCity, vehicle.locationState].filter(Boolean).join(", ")}
                    {vehicle.locationZip && ` ${vehicle.locationZip}`}
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            {vehicle.description && (
              <div className="mt-4 pt-4 border-t">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                <p className="text-gray-900 whitespace-pre-wrap text-sm">{vehicle.description}</p>
              </div>
            )}
          </Card>

          {/* Website Description Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Website Description</h3>
              {salesInfo.websiteDescription && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(salesInfo.websiteDescription, "Description")}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </Button>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-3">
              Marketing description for the website listing.
            </p>
            <textarea
              value={salesInfo.websiteDescription}
              onChange={(e) => setSalesInfo({ ...salesInfo, websiteDescription: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[120px]"
              placeholder="Write an engaging description for the website listing..."
            />
          </Card>

          {/* Call Script Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Call Script</h3>
              {salesInfo.callScript && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(salesInfo.callScript, "Script")}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </Button>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-3">
              Talking points for sales calls including key selling points and objection handling.
            </p>
            <textarea
              value={salesInfo.callScript}
              onChange={(e) => setSalesInfo({ ...salesInfo, callScript: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[180px]"
              placeholder="Opening:&#10;'Hi [Name], I see you're interested in our [Year Make Model]...'&#10;&#10;Key Selling Points:&#10;- One owner, clean history&#10;- Recent service&#10;&#10;Common Objections:&#10;Q: Why is the price so competitive?&#10;A: ..."
            />
          </Card>
        </div>

        {/* Right Column: Technical Bulletpoints + Actions */}
        <div className="space-y-6">
          {/* Technical Bulletpoints Card - Sticky on desktop */}
          <div className="lg:sticky lg:top-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Tech Specs</h3>
                {salesInfo.technicalBulletpoints && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(salesInfo.technicalBulletpoints, "Bulletpoints")}
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </Button>
                )}
              </div>
              <p className="text-sm text-gray-500 mb-3">
                Quick reference specs for calls.
              </p>
              <textarea
                value={salesInfo.technicalBulletpoints}
                onChange={(e) => setSalesInfo({ ...salesInfo, technicalBulletpoints: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[250px] font-mono text-sm"
                placeholder="- Engine: 3.5L V6 300hp&#10;- AWD with sport mode&#10;- Premium audio&#10;- Heated leather seats&#10;- ..."
              />

              {/* Save Button */}
              <div className="mt-4 pt-4 border-t">
                <Button onClick={handleSaveSalesInfo} disabled={saving} className="w-full">
                  {saving ? "Saving..." : "Save All Changes"}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
