"use client";

import { useState, useEffect } from "react";

interface TimeZoneConfig {
  timezone1: string;
  timezone1Label: string;
  timezone2: string;
  timezone2Label: string;
}

interface TimeZoneClocksProps {
  config?: TimeZoneConfig;
}

const DEFAULT_CONFIG: TimeZoneConfig = {
  timezone1: "America/New_York",
  timezone1Label: "New York",
  timezone2: "Europe/Bucharest",
  timezone2Label: "Europe +2",
};

// Customer timezone options - focused on US with clear labels
const COMMON_TIMEZONES = [
  { value: "America/New_York", label: "US East Coast (New York, Miami, Boston)" },
  { value: "America/Chicago", label: "US Central (Chicago, Dallas, Houston)" },
  { value: "America/Denver", label: "US Mountain (Denver, Phoenix, Salt Lake)" },
  { value: "America/Los_Angeles", label: "US West Coast (LA, Seattle, San Francisco)" },
  { value: "America/Anchorage", label: "Alaska" },
  { value: "Pacific/Honolulu", label: "Hawaii" },
  { value: "America/Puerto_Rico", label: "Puerto Rico / US Virgin Islands" },
  { value: "Europe/London", label: "UK / London" },
  { value: "Europe/Paris", label: "Europe +1 (Paris, Berlin, Rome)" },
  { value: "Europe/Bucharest", label: "Europe +2 (Athens, Helsinki, Bucharest)" },
  { value: "Asia/Dubai", label: "Dubai / Gulf" },
  { value: "Asia/Tokyo", label: "Japan / Tokyo" },
  { value: "Australia/Sydney", label: "Australia East (Sydney, Melbourne)" },
];

function formatTime(timezone: string): string {
  try {
    return new Date().toLocaleTimeString("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "--:--";
  }
}

function getShortLabel(timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "short",
    });
    const parts = formatter.formatToParts(new Date());
    const tzPart = parts.find((p) => p.type === "timeZoneName");
    return tzPart?.value || timezone.split("/").pop() || "";
  } catch {
    return timezone.split("/").pop() || "";
  }
}

export function TimeZoneClocks({ config }: TimeZoneClocksProps) {
  const [times, setTimes] = useState<{ tz1: string; tz2: string; tz3: string }>({
    tz1: "",
    tz2: "",
    tz3: "",
  });
  const [customerTimezone, setCustomerTimezone] = useState<string>("");
  const [showDropdown, setShowDropdown] = useState(false);

  const effectiveConfig = config || DEFAULT_CONFIG;

  useEffect(() => {
    // Load saved customer timezone from localStorage
    const saved = localStorage.getItem("customerTimezone");
    if (saved) {
      setCustomerTimezone(saved);
    } else {
      // Default to US East Coast
      setCustomerTimezone("America/New_York");
    }
  }, []);

  useEffect(() => {
    const updateTimes = () => {
      setTimes({
        tz1: formatTime(effectiveConfig.timezone1),
        tz2: formatTime(effectiveConfig.timezone2),
        tz3: customerTimezone ? formatTime(customerTimezone) : "--:--",
      });
    };

    updateTimes();
    const interval = setInterval(updateTimes, 1000);
    return () => clearInterval(interval);
  }, [effectiveConfig.timezone1, effectiveConfig.timezone2, customerTimezone]);

  const handleTimezoneChange = (tz: string) => {
    setCustomerTimezone(tz);
    localStorage.setItem("customerTimezone", tz);
    setShowDropdown(false);
  };

  const customerLabel = customerTimezone ? getShortLabel(customerTimezone) : "Select";

  return (
    <div className="flex items-center gap-4">
      {/* Clock 1 - Dealership timezone */}
      <div className="flex items-center gap-1.5">
        <div className="text-xs text-gray-400 font-medium">
          {effectiveConfig.timezone1Label || getShortLabel(effectiveConfig.timezone1)}
        </div>
        <div className="text-sm font-medium text-gray-700 tabular-nums">
          {times.tz1}
        </div>
      </div>

      <div className="w-px h-4 bg-gray-200" />

      {/* Clock 2 - Second fixed timezone */}
      <div className="flex items-center gap-1.5">
        <div className="text-xs text-gray-400 font-medium">
          {effectiveConfig.timezone2Label || getShortLabel(effectiveConfig.timezone2)}
        </div>
        <div className="text-sm font-medium text-gray-700 tabular-nums">
          {times.tz2}
        </div>
      </div>

      <div className="w-px h-4 bg-gray-200" />

      {/* Clock 3 - Customer timezone (editable) */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-1.5 px-2 py-1 -mx-2 -my-1 rounded hover:bg-gray-100 transition-colors"
          title="Click to change customer timezone"
        >
          <div className="text-xs text-blue-500 font-medium">
            {customerLabel}
          </div>
          <div className="text-sm font-medium text-gray-700 tabular-nums">
            {times.tz3}
          </div>
          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showDropdown && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowDropdown(false)}
            />
            <div className="absolute top-full right-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 max-h-64 overflow-auto">
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50">
                Customer Timezone
              </div>
              {COMMON_TIMEZONES.map((tz) => (
                <button
                  key={tz.value}
                  onClick={() => handleTimezoneChange(tz.value)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors ${
                    customerTimezone === tz.value ? "bg-blue-50 text-blue-700" : "text-gray-700"
                  }`}
                >
                  {tz.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
