import { NextRequest, NextResponse } from "next/server";

/**
 * Simple in-memory rate limiter for single-server deployments
 *
 * For multi-server deployments, consider using Redis or a distributed cache
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Store rate limit data: Map<identifier, RateLimitEntry>
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitOptions {
  /**
   * Maximum number of requests allowed in the time window
   */
  maxRequests: number;

  /**
   * Time window in milliseconds
   */
  windowMs: number;

  /**
   * Custom identifier function (default: uses IP address)
   * For user-based limits, return userId; for IP-based, return IP
   */
  identifier?: (request: NextRequest) => string | Promise<string>;
}

/**
 * Check if a request should be rate limited
 *
 * @param request - Next.js request object
 * @param options - Rate limit configuration
 * @returns null if allowed, NextResponse with 429 if rate limited
 */
export async function rateLimit(
  request: NextRequest,
  options: RateLimitOptions
): Promise<NextResponse | null> {
  const { maxRequests, windowMs, identifier: getIdentifier } = options;

  // Get identifier (IP by default, or custom function)
  let identifier: string;
  if (getIdentifier) {
    identifier = await getIdentifier(request);
  } else {
    // Default: use IP address
    identifier = getClientIp(request);
  }

  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // If no entry or window expired, create new entry
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return null; // Allow request
  }

  // Check if limit exceeded
  if (entry.count >= maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);

    return NextResponse.json(
      {
        error: "Too many requests. Please try again later.",
        retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": retryAfter.toString(),
          "X-RateLimit-Limit": maxRequests.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": new Date(entry.resetAt).toISOString(),
        },
      }
    );
  }

  // Increment count and allow request
  entry.count++;
  return null;
}

/**
 * Extract client IP address from request
 * Handles common proxy headers (X-Forwarded-For, X-Real-IP)
 */
function getClientIp(request: NextRequest): string {
  // Check common proxy headers
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback when IP cannot be determined
  return "unknown";
}

/**
 * Helper to create a user-based identifier function
 * Use this when you want to rate limit per authenticated user instead of IP
 */
export function userIdentifier(userId: string | null | undefined): string {
  return userId ? `user:${userId}` : `anonymous:${Date.now()}-${Math.random()}`;
}
