import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { VehiclePanelWrapper } from "@/components/vehicle/vehicle-panel-wrapper";
import prisma from "@/lib/db";

interface TimeZoneConfig {
  timezone1: string;
  timezone1Label: string;
  timezone2: string;
  timezone2Label: string;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Force password change for new users
  if (session.mustChangePassword) {
    redirect("/change-password");
  }

  // Fetch dealership settings for timezone config
  let timezoneConfig: TimeZoneConfig | undefined;
  if (session.dealershipId) {
    const dealership = await prisma.dealership.findUnique({
      where: { id: session.dealershipId },
      select: { settings: true },
    });

    if (dealership?.settings && typeof dealership.settings === "object") {
      const settings = dealership.settings as Record<string, unknown>;
      if (settings.timezones) {
        timezoneConfig = settings.timezones as TimeZoneConfig;
      }
    }
  }

  return (
    <VehiclePanelWrapper>
      <div className="flex min-h-screen">
        <Sidebar role={session.role} />
        <div className="flex-1 flex flex-col">
          <Header user={session} timezoneConfig={timezoneConfig} />
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </VehiclePanelWrapper>
  );
}
