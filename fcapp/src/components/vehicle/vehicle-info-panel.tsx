"use client";

import { useState, useEffect, useRef } from "react";
import { useVehiclePanel } from "@/contexts/vehicle-panel-context";
import { Button } from "@/components/ui/button";

interface Vehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  askingPrice: string | null;
  mileage: number | null;
  status: string;
  technicalBulletpoints: string | null;
  callScript: string | null;
  photos: string[];
}

type TabType = "specs" | "script";

export function VehicleInfoPanel() {
  const { panelState, closeVehiclePanel, openVehiclePanel } = useVehiclePanel();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("specs");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Vehicle[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Dragging state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Initialize position on mount (bottom right)
  useEffect(() => {
    if (typeof window !== "undefined") {
      setPosition({
        x: window.innerWidth - 400 - 20,
        y: window.innerHeight - 500 - 20,
      });
    }
  }, []);

  // Fetch vehicle when vehicleId changes
  useEffect(() => {
    if (panelState.vehicleId) {
      fetchVehicle(panelState.vehicleId);
      setShowSearch(false);
    } else {
      setVehicle(null);
      setShowSearch(true);
    }
  }, [panelState.vehicleId]);

  // Focus search input when showing search
  useEffect(() => {
    if (showSearch && searchInputRef.current && panelState.isOpen) {
      searchInputRef.current.focus();
    }
  }, [showSearch, panelState.isOpen]);

  const fetchVehicle = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/vehicles/${id}`);
      const data = await response.json();
      if (response.ok) {
        setVehicle(data.vehicle);
      }
    } catch (error) {
      console.error("Failed to fetch vehicle:", error);
    } finally {
      setLoading(false);
    }
  };

  const searchVehicles = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const response = await fetch(`/api/vehicles?search=${encodeURIComponent(query)}&limit=10`);
      const data = await response.json();
      setSearchResults(data.vehicles || []);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchVehicles(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, input, textarea, a")) return;
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newX = Math.max(0, Math.min(window.innerWidth - 380, e.clientX - dragOffset.current.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.current.y));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const formatPrice = (price: string | null) => {
    if (!price) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(parseFloat(price));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!panelState.isOpen) return null;

  return (
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        zIndex: 9999,
      }}
      className="w-[380px] bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden"
    >
      {/* Header - Draggable */}
      <div
        onMouseDown={handleMouseDown}
        className={`flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white cursor-move select-none ${
          isDragging ? "cursor-grabbing" : ""
        }`}
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="font-semibold text-sm">Quick Vehicle Info</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-1.5 hover:bg-white/20 rounded transition-colors"
            title="Search vehicles"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button
            onClick={closeVehiclePanel}
            className="p-1.5 hover:bg-white/20 rounded transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search Section */}
      {showSearch && (
        <div className="p-3 border-b bg-gray-50">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vehicles... (year, make, model)"
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg
              className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {/* Search Results */}
          {searchQuery && (
            <div className="mt-2 max-h-48 overflow-y-auto">
              {searching ? (
                <div className="text-center py-3 text-sm text-gray-500">Searching...</div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-3 text-sm text-gray-500">No vehicles found</div>
              ) : (
                <div className="space-y-1">
                  {searchResults.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => {
                        openVehiclePanel(v.id);
                        setSearchQuery("");
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <div className="font-medium text-gray-900">
                        {v.year} {v.make} {v.model}
                        {v.trim && <span className="text-gray-500"> {v.trim}</span>}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatPrice(v.askingPrice)} · {v.status}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          </div>
        ) : !vehicle ? (
          <div className="text-center py-12 text-gray-500">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">Search for a vehicle above</p>
          </div>
        ) : (
          <>
            {/* Vehicle Header */}
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </h3>
                  {vehicle.trim && (
                    <p className="text-sm text-gray-500">{vehicle.trim}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-bold text-blue-600">{formatPrice(vehicle.askingPrice)}</div>
                  {vehicle.mileage && (
                    <div className="text-xs text-gray-500">
                      {new Intl.NumberFormat("en-US").format(vehicle.mileage)} mi
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab("specs")}
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === "specs"
                    ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Tech Specs
              </button>
              <button
                onClick={() => setActiveTab("script")}
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === "script"
                    ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Call Script
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-4">
              {activeTab === "specs" && (
                <div>
                  {vehicle.technicalBulletpoints ? (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Technical Bulletpoints
                        </span>
                        <button
                          onClick={() => copyToClipboard(vehicle.technicalBulletpoints || "")}
                          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </button>
                      </div>
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 p-3 rounded-lg">
                        {vehicle.technicalBulletpoints}
                      </pre>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      No tech specs added yet
                    </div>
                  )}
                </div>
              )}

              {activeTab === "script" && (
                <div>
                  {vehicle.callScript ? (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Call Script
                        </span>
                        <button
                          onClick={() => copyToClipboard(vehicle.callScript || "")}
                          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </button>
                      </div>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                        {vehicle.callScript}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      No call script added yet
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
