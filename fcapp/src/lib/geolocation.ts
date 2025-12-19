/**
 * IP Geolocation helper using free ip-api.com service
 * Limits: 45 requests/minute for free tier (no API key needed)
 */

export interface GeoLocationResult {
  success: boolean;
  city?: string;
  state?: string;  // Region/state name
  stateCode?: string;  // Two-letter state code (e.g., "FL", "CA")
  country?: string;
  countryCode?: string;
  zip?: string;
  error?: string;
}

/**
 * Look up geographic location from IP address
 * Uses ip-api.com free service (no API key required)
 *
 * @param ip - IP address to look up
 * @returns Location information or error
 */
export async function getLocationFromIp(ip: string): Promise<GeoLocationResult> {
  // Skip private/local IPs
  if (isPrivateIp(ip)) {
    return { success: false, error: "Private IP address" };
  }

  try {
    // ip-api.com free endpoint - returns JSON by default
    // Fields: city, region (state name), regionCode (state code), country, countryCode, zip
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,message,city,region,regionCode,country,countryCode,zip`,
      {
        signal: AbortSignal.timeout(5000),  // 5 second timeout
      }
    );

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();

    if (data.status === "fail") {
      return { success: false, error: data.message || "Lookup failed" };
    }

    return {
      success: true,
      city: data.city || undefined,
      state: data.region || undefined,
      stateCode: data.regionCode || undefined,
      country: data.country || undefined,
      countryCode: data.countryCode || undefined,
      zip: data.zip || undefined,
    };
  } catch (error) {
    // Don't let geolocation failures break the flow
    console.error("IP geolocation failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Lookup failed",
    };
  }
}

/**
 * Check if IP is a private/local address
 */
function isPrivateIp(ip: string): boolean {
  // IPv4 private ranges
  const ipv4PrivateRanges = [
    /^10\./,                          // 10.0.0.0 - 10.255.255.255
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0 - 172.31.255.255
    /^192\.168\./,                    // 192.168.0.0 - 192.168.255.255
    /^127\./,                         // 127.0.0.0 - 127.255.255.255 (localhost)
    /^0\./,                           // 0.0.0.0 - 0.255.255.255
    /^169\.254\./,                    // 169.254.0.0 - 169.254.255.255 (link-local)
  ];

  // IPv6 private ranges
  const ipv6PrivateRanges = [
    /^::1$/i,                         // Loopback
    /^fe80:/i,                        // Link-local
    /^fc00:/i,                        // Unique local (ULA)
    /^fd/i,                           // Unique local (ULA)
  ];

  // Check if IPv6 (contains colon)
  if (ip.includes(":")) {
    return ipv6PrivateRanges.some((range) => range.test(ip));
  }

  return ipv4PrivateRanges.some((range) => range.test(ip));
}

/**
 * Format state display - returns state code if available, otherwise full name
 */
export function formatStateDisplay(state?: string, stateCode?: string): string | undefined {
  if (stateCode && stateCode.length === 2) {
    return stateCode;
  }
  return state;
}
