"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type ImportStep = "configuration" | "preview" | "progress" | "results";

interface PreviewVehicle {
  url: string;
  year: number;
  make: string;
  model: string;
  price: number | null;
  mileage: number | null;
  imageCount: number;
  existsInDb: boolean;
  matchedVehicleId?: string;
}

interface PreviewResponse {
  success: boolean;
  vehicles: PreviewVehicle[];
  totalFound: number;
  existingCount: number;
  newCount: number;
  error?: string;
}

interface ImportStats {
  processed: number;
  total: number;
  created: number;
  updated: number;
  errors: number;
  currentVehicle: string | null;
}

interface ImportResult {
  created: number;
  updated: number;
  errors: number;
  errorDetails: Array<{
    vin: string;
    vehicle: string;
    error: string;
  }>;
}

export default function ImportVehiclesPage() {
  const router = useRouter();
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // Step management
  const [currentStep, setCurrentStep] = useState<ImportStep>("configuration");

  // Configuration state
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [listingPath, setListingPath] = useState("/listing/");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preview state
  const [preview, setPreview] = useState<PreviewResponse | null>(null);

  // Progress state
  const [jobId, setJobId] = useState<string | null>(null);
  const [stats, setStats] = useState<ImportStats>({
    processed: 0,
    total: 0,
    created: 0,
    updated: 0,
    errors: 0,
    currentVehicle: null,
  });

  // Results state
  const [results, setResults] = useState<ImportResult | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, []);

  const handlePreview = async () => {
    if (!websiteUrl.trim()) {
      setError("Website URL is required");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/inventory/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl: websiteUrl.trim(),
          listingPath: listingPath.trim() || "/listing/",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to preview inventory");
      }

      // Check for scraper-level errors
      if (!data.success) {
        throw new Error(data.error || "No vehicles found on the website");
      }

      setPreview(data);
      setCurrentStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to preview inventory");
    } finally {
      setLoading(false);
    }
  };

  const handleStartImport = async () => {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/inventory/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl: websiteUrl.trim(),
          listingPath: listingPath.trim() || "/listing/",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start import");
      }

      setJobId(data.jobId);
      setCurrentStep("progress");
      startPolling(data.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start import");
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (id: string) => {
    // Initial fetch
    fetchJobStatus(id);

    // Poll every 2 seconds
    pollingInterval.current = setInterval(() => {
      fetchJobStatus(id);
    }, 2000);
  };

  const fetchJobStatus = async (id: string) => {
    try {
      const response = await fetch(`/api/inventory/import/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch job status");
      }

      // API returns { job: {...} }
      const job = data.job;
      if (!job) return;

      // Update stats (field names from Prisma: processedCount, createdCount, etc.)
      setStats({
        processed: job.processedCount || 0,
        total: job.totalVehicles || 0,
        created: job.createdCount || 0,
        updated: job.updatedCount || 0,
        errors: job.errorCount || 0,
        currentVehicle: null, // Not tracked in current implementation
      });

      // Check if complete
      if (job.status === "completed" || job.status === "failed") {
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
          pollingInterval.current = null;
        }

        setResults({
          created: job.createdCount || 0,
          updated: job.updatedCount || 0,
          errors: job.errorCount || 0,
          errorDetails: Array.isArray(job.errors) ? job.errors : [],
        });

        setCurrentStep("results");
      }
    } catch (err) {
      console.error("Failed to fetch job status:", err);
      // Don't show error to user during polling, just log it
    }
  };

  const handleCancel = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
    // Note: In a real implementation, you'd also call an API to cancel the job
    setCurrentStep("configuration");
    resetState();
  };

  const handleBack = () => {
    setCurrentStep("configuration");
    setPreview(null);
    setError(null);
  };

  const handleImportAgain = () => {
    resetState();
    setCurrentStep("configuration");
  };

  const resetState = () => {
    setWebsiteUrl("");
    setListingPath("/listing/");
    setPreview(null);
    setJobId(null);
    setStats({
      processed: 0,
      total: 0,
      created: 0,
      updated: 0,
      errors: 0,
      currentVehicle: null,
    });
    setResults(null);
    setError(null);
  };

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatMileage = (mileage: number | null) => {
    if (!mileage) return "-";
    return new Intl.NumberFormat("en-US").format(mileage) + " mi";
  };

  return (
    <div className="max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/inventory" className="hover:text-gray-700">
          Inventory
        </Link>
        <span>/</span>
        <span className="text-gray-900">Import from Website</span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Import Vehicles from Website</h1>
        <p className="text-gray-600 mt-1">
          Automatically scrape and import vehicle inventory from your dealership website
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Configuration */}
      {currentStep === "configuration" && (
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>

          <div className="space-y-4">
            <Input
              label="Website URL"
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://cabinetmotorsllc.com"
              required
            />

            <Input
              label="Listing Path"
              type="text"
              value={listingPath}
              onChange={(e) => setListingPath(e.target.value)}
              placeholder="/listing/"
            />

            <p className="text-sm text-gray-500">
              The path where individual vehicle listings are located. Default is "/listing/".
            </p>

            <div className="flex gap-3 pt-2">
              <Button onClick={handlePreview} disabled={loading || !websiteUrl.trim()} loading={loading}>
                {loading ? "Loading..." : "Preview Inventory"}
              </Button>
              <Link href="/inventory">
                <Button variant="secondary">Cancel</Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Step 2: Preview */}
      {currentStep === "preview" && preview && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Preview Results</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="blue" size="md">
                    {preview.totalFound} Found
                  </Badge>
                  <Badge variant="green" size="md">
                    {preview.newCount} New
                  </Badge>
                  <Badge variant="yellow" size="md">
                    {preview.existingCount} Existing
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <p className="text-sm text-gray-600 mb-4">
              Review the vehicles found on the website before starting the import.
              Existing vehicles will be updated with new data.
            </p>

            {/* Vehicle List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {preview.vehicles.map((vehicle, index) => (
                <div
                  key={vehicle.url || index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </span>
                      <Badge variant={vehicle.existsInDb ? "yellow" : "green"} size="sm">
                        {vehicle.existsInDb ? "UPDATE" : "NEW"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                      <span>{formatPrice(vehicle.price)}</span>
                      <span>{formatMileage(vehicle.mileage)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-200 mt-4">
              <Button onClick={handleStartImport} disabled={loading} loading={loading}>
                {loading ? "Starting..." : `Import ${preview.totalFound} Vehicles`}
              </Button>
              <Button variant="secondary" onClick={handleBack} disabled={loading}>
                Back
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Step 3: Progress */}
      {currentStep === "progress" && (
        <Card>
          <CardHeader>
            <CardTitle>Import in Progress</CardTitle>
          </CardHeader>

          <div className="space-y-6">
            {/* Progress Bar */}
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium text-gray-900">
                  Processing {stats.processed} of {stats.total} vehicles
                </span>
                <span className="text-gray-600">
                  {stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                  style={{
                    width: `${stats.total > 0 ? (stats.processed / stats.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Current Vehicle */}
            {stats.currentVehicle && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                  <span className="text-sm text-gray-700">
                    Currently processing: <span className="font-medium">{stats.currentVehicle}</span>
                  </span>
                </div>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-sm text-green-600 font-medium">Created</div>
                <div className="text-2xl font-bold text-green-900 mt-1">{stats.created}</div>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-600 font-medium">Updated</div>
                <div className="text-2xl font-bold text-blue-900 mt-1">{stats.updated}</div>
              </div>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-sm text-red-600 font-medium">Errors</div>
                <div className="text-2xl font-bold text-red-900 mt-1">{stats.errors}</div>
              </div>
            </div>

            {/* Cancel Button */}
            <div className="pt-2 border-t border-gray-200">
              <Button variant="secondary" onClick={handleCancel}>
                Cancel Import
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 4: Results */}
      {currentStep === "results" && results && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Import Complete</CardTitle>
            </CardHeader>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                <div className="text-3xl font-bold text-green-900">{results.created}</div>
                <div className="text-sm text-green-600 font-medium mt-1">Created</div>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                <div className="text-3xl font-bold text-blue-900">{results.updated}</div>
                <div className="text-sm text-blue-600 font-medium mt-1">Updated</div>
              </div>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                <div className="text-3xl font-bold text-red-900">{results.errors}</div>
                <div className="text-sm text-red-600 font-medium mt-1">Errors</div>
              </div>
            </div>

            {/* Error Details */}
            {results.errorDetails && results.errorDetails.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Error Details</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {results.errorDetails.map((errorItem, index) => (
                    <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <svg
                          className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-red-900">{errorItem.vehicle}</div>
                          {errorItem.vin && (
                            <div className="text-xs text-red-700 font-mono mt-0.5">VIN: {errorItem.vin}</div>
                          )}
                          <div className="text-sm text-red-700 mt-1">{errorItem.error}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <Button onClick={() => router.push("/inventory")}>View Inventory</Button>
              <Button variant="secondary" onClick={handleImportAgain}>
                Import Again
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
