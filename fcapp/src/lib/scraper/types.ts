/**
 * Scraper Types - TypeScript interfaces for website vehicle scraping
 */

// Vehicle data scraped from listing page (summary view)
export interface ScrapedVehicleSummary {
  url: string;
  year: number;
  make: string;
  model: string;
  price: number | null;
  mileage: number | null;
  thumbnailUrl: string | null;
}

// Full vehicle data scraped from detail page
export interface ScrapedVehicleDetail {
  url: string;
  vin: string | null;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  price: number | null;
  mileage: number | null;
  exteriorColor: string | null;
  interiorColor: string | null;
  transmission: string | null;
  engine: string | null;
  fuelType: string | null;
  bodyType: string | null;
  description: string | null;
  imageUrls: string[];
}

// Result of scraping a single vehicle
export interface VehicleScrapeResult {
  success: boolean;
  data?: ScrapedVehicleDetail;
  error?: string;
}

// Configuration for the scraper
export interface ScraperConfig {
  baseUrl: string;
  listingPath: string;
  // Rate limiting
  delayBetweenPages: number;       // ms between listing pages
  delayBetweenVehicles: number;    // ms between vehicle detail pages
  delayBetweenImages: number;      // ms between image downloads
  // Limits
  maxConcurrentImageDownloads: number;
  maxImagesPerVehicle: number;
  maxVehiclesPerImport: number;
  // Timeouts
  pageTimeout: number;             // ms per page request
  imageTimeout: number;            // ms per image download
  // User agent
  userAgent: string;
}

// Default scraper configuration
export const DEFAULT_SCRAPER_CONFIG: ScraperConfig = {
  baseUrl: "",
  listingPath: "/listing/",
  delayBetweenPages: 500,
  delayBetweenVehicles: 1000,
  delayBetweenImages: 200,
  maxConcurrentImageDownloads: 3,
  maxImagesPerVehicle: 50,
  maxVehiclesPerImport: 200,
  pageTimeout: 30000,
  imageTimeout: 10000,
  userAgent: "CDApp-Inventory-Import/1.0",
};

// Progress update during import
export interface ImportProgress {
  status: "discovering" | "importing" | "downloading_images";
  total: number;
  processed: number;
  current: string;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}

// Final import result
export interface ImportResult {
  success: boolean;
  totalFound: number;
  created: number;
  updated: number;
  skipped: number;
  errors: ImportError[];
  duration: number; // ms
}

// Error during import
export interface ImportError {
  url: string;
  vehicleInfo: string;
  message: string;
  phase: "scrape" | "validate" | "save" | "images";
}

// Preview result before importing
export interface PreviewResult {
  success: boolean;
  vehicles: PreviewVehicle[];
  totalFound: number;
  existingCount: number;
  newCount: number;
  error?: string;
}

// Vehicle preview with match status
export interface PreviewVehicle {
  url: string;
  year: number;
  make: string;
  model: string;
  price: number | null;
  mileage: number | null;
  imageCount: number;
  existsInDb: boolean;
  matchedVehicleId?: string;
  matchedByVin?: boolean;
}
