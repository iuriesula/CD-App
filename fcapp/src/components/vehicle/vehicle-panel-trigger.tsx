"use client";

import { useVehiclePanel } from "@/contexts/vehicle-panel-context";

export function VehiclePanelTrigger() {
  const { panelState, openVehiclePanel, closeVehiclePanel } = useVehiclePanel();

  const handleClick = () => {
    if (panelState.isOpen) {
      closeVehiclePanel();
    } else {
      // Open panel without a vehicle selected (will show search)
      openVehiclePanel("");
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`fixed bottom-6 right-6 z-[9998] p-4 rounded-full shadow-lg transition-all duration-200 ${
        panelState.isOpen
          ? "bg-gray-600 hover:bg-gray-700"
          : "bg-blue-600 hover:bg-blue-700 hover:scale-105"
      }`}
      title={panelState.isOpen ? "Close vehicle info" : "Quick vehicle lookup"}
    >
      {panelState.isOpen ? (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ) : (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )}
    </button>
  );
}
