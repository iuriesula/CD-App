/**
 * Website Vehicle Scraper - Main Orchestrator
 * Scrapes vehicle inventory from WordPress/Bricks Builder dealership websites
 */

import { parseListingPage, parseVehicleDetailPage } from "./bricks-parser";
import { downloadVehicleImagesWithBaseUrl } from "./image-downloader";
import {
  ScrapedVehicleSummary,
  ScraperConfig,
  DEFAULT_SCRAPER_CONFIG,
  PreviewResult,
  PreviewVehicle,
  ImportProgress,
  ImportResult,
  ImportError,
} from "./types";
import prisma from "@/lib/db";

export * from "./types";
export { downloadVehicleImages } from "./image-downloader";

/**
 * Fetch a page with rate limiting and error handling
 */
async function fetchPage(
  url: string,
  config: ScraperConfig
): Promise<string> {
  console.log(`[Scraper] Fetching: ${url}`);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.pageTimeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": config.userAgent,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    clearTimeout(timeoutId);
    console.log(`[Scraper] Response status: ${response.status} for ${url}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    console.log(`[Scraper] Received ${text.length} bytes from ${url}`);
    return text;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`[Scraper] Fetch error for ${url}:`, error);
    throw error;
  }
}

/**
 * Parse vehicle info from URL pattern: /listing/YYYY-make-model-id/
 */
function parseVehicleFromUrl(url: string, baseUrl: string): ScrapedVehicleSummary | null {
  const urlPattern = /\/listing\/(\d{4})-([^-]+)-(.+?)-(\d+)\/?$/i;
  const match = url.match(urlPattern);

  if (!match) return null;

  const year = parseInt(match[1], 10);
  const make = capitalize(match[2].replace(/-/g, ' '));
  const modelParts = match[3].split('-');
  const model = modelParts.map(p => capitalize(p)).join(' ');

  // Make URL absolute
  const fullUrl = url.startsWith('http') ? url : new URL(url, baseUrl).toString();

  return {
    url: fullUrl,
    year,
    make,
    model,
    price: null,
    mileage: null,
    thumbnailUrl: null,
  };
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Normalize URL by removing www. prefix if present
 * This helps avoid SSL certificate issues where cert doesn't include www subdomain
 */
function normalizeWebsiteUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove www. prefix if present
    if (parsed.hostname.startsWith('www.')) {
      parsed.hostname = parsed.hostname.slice(4);
    }
    return parsed.origin;
  } catch {
    return url;
  }
}

/**
 * Preview vehicles from a website without importing
 */
export async function previewWebsiteVehicles(
  websiteUrl: string,
  listingPath: string = "/listing/",
  dealershipId: string
): Promise<PreviewResult> {
  // Normalize URL to avoid SSL issues with www vs non-www
  const normalizedUrl = normalizeWebsiteUrl(websiteUrl);
  console.log(`[Scraper] Normalized URL: ${websiteUrl} -> ${normalizedUrl}`);

  const config: ScraperConfig = {
    ...DEFAULT_SCRAPER_CONFIG,
    baseUrl: normalizedUrl,
    listingPath,
  };

  try {
    // Fetch listing page
    const listingUrl = new URL(listingPath, normalizedUrl).toString();
    const html = await fetchPage(listingUrl, config);

    // Parse vehicle URLs
    const vehicleUrls = parseListingPage(html);

    // Convert URLs to vehicle summaries
    const summaries: ScrapedVehicleSummary[] = [];
    for (const url of vehicleUrls) {
      const summary = parseVehicleFromUrl(url, websiteUrl);
      if (summary) {
        summaries.push(summary);
      }
    }

    if (summaries.length === 0) {
      return {
        success: false,
        vehicles: [],
        totalFound: 0,
        existingCount: 0,
        newCount: 0,
        error: "No vehicles found on the listing page. The website structure may not be supported.",
      };
    }

    // Check which vehicles exist in database
    // Fetch detail pages to get VINs for accurate matching (same as import logic)
    const previewVehicles: PreviewVehicle[] = [];
    let existingCount = 0;

    for (const summary of summaries) {
      let vin: string | null = null;
      let existing = null;
      let matchedByVin = false;
      // Use HTML-parsed values for matching (same as import does)
      let matchYear = summary.year;
      let matchMake = summary.make;
      let matchModel = summary.model;

      // Fetch detail page to get VIN and accurate year/make/model for matching
      try {
        // Small delay between fetches to be polite
        await new Promise(resolve => setTimeout(resolve, 100));
        const detailHtml = await fetchPage(summary.url, config);
        const detail = parseVehicleDetailPage(detailHtml, summary.url);
        vin = detail.vin;
        // Use HTML-parsed values for matching (same as import will use)
        matchYear = detail.year;
        matchMake = detail.make;
        matchModel = detail.model;
      } catch (error) {
        console.log(`[Preview] Could not fetch detail page for ${summary.url}:`, error);
        // Continue with URL-parsed values - may be less accurate
      }

      // Check by VIN first (same as import logic)
      if (vin) {
        existing = await prisma.vehicle.findUnique({
          where: { vin },
          select: { id: true, dealershipId: true },
        });
        if (existing) matchedByVin = true;
      }

      // If no VIN match, try Year+Make+Model using HTML-parsed values
      if (!existing) {
        console.log(`[Preview] Checking DB for: ${matchYear} ${matchMake} ${matchModel} (dealership: ${dealershipId})`);
        existing = await prisma.vehicle.findFirst({
          where: {
            dealershipId,
            year: matchYear,
            make: { equals: matchMake, mode: "insensitive" },
            model: { equals: matchModel, mode: "insensitive" },
          },
          select: { id: true, dealershipId: true },
        });
        console.log(`[Preview] Match result: ${existing ? 'FOUND ' + existing.id : 'NOT FOUND'}`);
      }

      // Skip if vehicle belongs to different dealership (VIN match but wrong dealership)
      const existsInDb = existing && existing.dealershipId === dealershipId;
      console.log(`[Preview] ${matchYear} ${matchMake} ${matchModel}: existsInDb=${existsInDb}`);
      if (existsInDb) existingCount++;

      previewVehicles.push({
        url: summary.url,
        year: matchYear,
        make: matchMake,
        model: matchModel,
        price: summary.price,
        mileage: summary.mileage,
        imageCount: 0, // Will be determined during full import
        existsInDb: !!existsInDb,
        matchedVehicleId: existsInDb ? existing?.id : undefined,
        matchedByVin,
      });
    }

    return {
      success: true,
      vehicles: previewVehicles,
      totalFound: summaries.length,
      existingCount,
      newCount: summaries.length - existingCount,
    };
  } catch (error) {
    console.error("Preview scraper error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch website";
    console.error("Error details:", {
      websiteUrl,
      listingPath,
      errorMessage,
      errorName: error instanceof Error ? error.name : "Unknown",
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    return {
      success: false,
      vehicles: [],
      totalFound: 0,
      existingCount: 0,
      newCount: 0,
      error: errorMessage,
    };
  }
}

/**
 * Import vehicles from website
 * Uses a callback for progress updates (for SSE streaming)
 * @param selectedUrls - Optional array of specific vehicle URLs to import. If provided, only these URLs will be imported.
 */
export async function importWebsiteVehicles(
  websiteUrl: string,
  listingPath: string,
  dealershipId: string,
  userId: string,
  jobId: string,
  onProgress?: (progress: ImportProgress) => void,
  selectedUrls?: string[]
): Promise<ImportResult> {
  // Normalize URL to avoid SSL issues with www vs non-www
  const normalizedUrl = normalizeWebsiteUrl(websiteUrl);
  console.log(`[Scraper Import] Normalized URL: ${websiteUrl} -> ${normalizedUrl}`);

  const config: ScraperConfig = {
    ...DEFAULT_SCRAPER_CONFIG,
    baseUrl: normalizedUrl,
    listingPath,
  };

  const startTime = Date.now();
  const errors: ImportError[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  try {
    // Update job status to discovering
    await updateJobStatus(jobId, "discovering");

    // Fetch listing page
    const listingUrl = new URL(listingPath, normalizedUrl).toString();
    const html = await fetchPage(listingUrl, config);
    const vehicleUrls = parseListingPage(html);

    // Convert URLs to vehicle summaries
    let summaries: ScrapedVehicleSummary[] = [];
    for (const url of vehicleUrls) {
      const summary = parseVehicleFromUrl(url, websiteUrl);
      if (summary) {
        summaries.push(summary);
      }
    }

    // If selectedUrls is provided, filter to only import those vehicles
    if (selectedUrls && selectedUrls.length > 0) {
      const selectedSet = new Set(selectedUrls);
      summaries = summaries.filter(s => selectedSet.has(s.url));
      console.log(`[Scraper Import] Filtered to ${summaries.length} selected vehicles from ${vehicleUrls.length} total`);
    }

    const total = Math.min(summaries.length, config.maxVehiclesPerImport);

    // Update job with total count
    await prisma.websiteImportJob.update({
      where: { id: jobId },
      data: { totalVehicles: total, status: "importing", startedAt: new Date() },
    });

    // Process each vehicle
    for (let i = 0; i < total; i++) {
      const summary = summaries[i];
      const vehicleInfo = `${summary.year} ${summary.make} ${summary.model}`;

      // Progress update
      onProgress?.({
        status: "importing",
        total,
        processed: i,
        current: vehicleInfo,
        created,
        updated,
        skipped,
        errors: errors.length,
      });

      try {
        // Rate limiting between vehicles
        if (i > 0) {
          await delay(config.delayBetweenVehicles);
        }

        // Fetch vehicle detail page
        const detailHtml = await fetchPage(summary.url, config);
        const detail = parseVehicleDetailPage(detailHtml, summary.url);

        // Find existing vehicle (by VIN first, then by year+make+model)
        let existingVehicle = null;
        let matchedByVin = false;

        if (detail.vin) {
          existingVehicle = await prisma.vehicle.findUnique({
            where: { vin: detail.vin },
            select: { id: true, dealershipId: true },
          });
          if (existingVehicle) matchedByVin = true;
        }

        if (!existingVehicle) {
          existingVehicle = await prisma.vehicle.findFirst({
            where: {
              dealershipId,
              year: detail.year,
              make: { equals: detail.make, mode: "insensitive" },
              model: { equals: detail.model, mode: "insensitive" },
            },
            select: { id: true, dealershipId: true },
          });
        }

        // Skip if vehicle belongs to different dealership
        if (existingVehicle && existingVehicle.dealershipId !== dealershipId) {
          skipped++;
          continue;
        }

        // Prepare vehicle data
        const vehicleData = {
          year: detail.year,
          make: detail.make,
          model: detail.model,
          trim: detail.trim,
          vin: detail.vin,
          askingPrice: detail.price,
          mileage: detail.mileage,
          exteriorColor: detail.exteriorColor,
          interiorColor: detail.interiorColor,
          transmission: detail.transmission,
          engine: detail.engine,
          description: detail.description,
          sourceUrl: detail.url,
          importedAt: new Date(),
        };

        let vehicleId: string;

        if (existingVehicle) {
          // Update existing vehicle
          await prisma.vehicle.update({
            where: { id: existingVehicle.id },
            data: vehicleData,
          });
          vehicleId = existingVehicle.id;
          updated++;
        } else {
          // Create new vehicle
          const newVehicle = await prisma.vehicle.create({
            data: {
              ...vehicleData,
              dealershipId,
              status: "available",
            },
          });
          vehicleId = newVehicle.id;
          created++;
        }

        // Download images
        if (detail.imageUrls.length > 0) {
          onProgress?.({
            status: "downloading_images",
            total,
            processed: i,
            current: `${vehicleInfo} (downloading ${detail.imageUrls.length} images)`,
            created,
            updated,
            skipped,
            errors: errors.length,
          });

          const downloadResult = await downloadVehicleImagesWithBaseUrl(
            detail.imageUrls,
            websiteUrl,
            dealershipId,
            vehicleId
          );

          // Update vehicle with photo URLs
          if (downloadResult.success.length > 0) {
            await prisma.vehicle.update({
              where: { id: vehicleId },
              data: { photos: downloadResult.success },
            });
          }
        }

        // Update job progress
        await prisma.websiteImportJob.update({
          where: { id: jobId },
          data: {
            processedCount: i + 1,
            createdCount: created,
            updatedCount: updated,
            skippedCount: skipped,
            errorCount: errors.length,
          },
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        errors.push({
          url: summary.url,
          vehicleInfo,
          message: errorMessage,
          phase: "scrape",
        });
      }
    }

    // Final progress update
    onProgress?.({
      status: "importing",
      total,
      processed: total,
      current: "Complete",
      created,
      updated,
      skipped,
      errors: errors.length,
    });

    // Update job as completed
    await prisma.websiteImportJob.update({
      where: { id: jobId },
      data: {
        status: "completed",
        completedAt: new Date(),
        processedCount: total,
        createdCount: created,
        updatedCount: updated,
        skippedCount: skipped,
        errorCount: errors.length,
        errors: errors as unknown as object,
      },
    });

    // Update dealership last import time
    await prisma.dealership.update({
      where: { id: dealershipId },
      data: { lastImportAt: new Date() },
    });

    return {
      success: true,
      totalFound: total,
      created,
      updated,
      skipped,
      errors,
      duration: Date.now() - startTime,
    };

  } catch (error) {
    // Update job as failed
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await prisma.websiteImportJob.update({
      where: { id: jobId },
      data: {
        status: "failed",
        completedAt: new Date(),
        errors: [{ message: errorMessage, phase: "scrape" }] as unknown as object,
      },
    });

    return {
      success: false,
      totalFound: 0,
      created,
      updated,
      skipped,
      errors: [{ url: websiteUrl, vehicleInfo: "N/A", message: errorMessage, phase: "scrape" }],
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Update job status helper
 */
async function updateJobStatus(jobId: string, status: string): Promise<void> {
  await prisma.websiteImportJob.update({
    where: { id: jobId },
    data: { status: status as "pending" | "discovering" | "importing" | "completed" | "failed" | "cancelled" },
  });
}

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
