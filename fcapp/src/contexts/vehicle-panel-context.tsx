"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface VehiclePanelState {
  isOpen: boolean;
  vehicleId: string | null;
}

interface VehiclePanelContextType {
  panelState: VehiclePanelState;
  openVehiclePanel: (vehicleId: string) => void;
  closeVehiclePanel: () => void;
  toggleVehiclePanel: () => void;
}

const VehiclePanelContext = createContext<VehiclePanelContextType | undefined>(undefined);

export function VehiclePanelProvider({ children }: { children: ReactNode }) {
  const [panelState, setPanelState] = useState<VehiclePanelState>({
    isOpen: false,
    vehicleId: null,
  });

  const openVehiclePanel = (vehicleId: string) => {
    setPanelState({ isOpen: true, vehicleId });
  };

  const closeVehiclePanel = () => {
    setPanelState({ isOpen: false, vehicleId: null });
  };

  const toggleVehiclePanel = () => {
    setPanelState((prev) => ({ ...prev, isOpen: !prev.isOpen }));
  };

  return (
    <VehiclePanelContext.Provider
      value={{ panelState, openVehiclePanel, closeVehiclePanel, toggleVehiclePanel }}
    >
      {children}
    </VehiclePanelContext.Provider>
  );
}

export function useVehiclePanel() {
  const context = useContext(VehiclePanelContext);
  if (!context) {
    throw new Error("useVehiclePanel must be used within a VehiclePanelProvider");
  }
  return context;
}
