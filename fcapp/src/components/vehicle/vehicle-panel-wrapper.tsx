"use client";

import { VehiclePanelProvider } from "@/contexts/vehicle-panel-context";
import { VehicleInfoPanel } from "./vehicle-info-panel";
import { VehiclePanelTrigger } from "./vehicle-panel-trigger";

export function VehiclePanelWrapper({ children }: { children: React.ReactNode }) {
  return (
    <VehiclePanelProvider>
      {children}
      <VehiclePanelTrigger />
      <VehicleInfoPanel />
    </VehiclePanelProvider>
  );
}
