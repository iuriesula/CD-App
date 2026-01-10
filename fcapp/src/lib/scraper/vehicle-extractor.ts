/**
 * Vehicle Extractor - Normalize and validate scraped vehicle data
 *
 * Converts scraped data to match the Prisma Vehicle model format.
 * Validates required fields and data integrity.
 */

import { ScrapedVehicleDetail } from './types';

/**
 * Partial Vehicle model structure (matching Prisma schema)
 */
export interface NormalizedVehicle {
  // Basic Info (required)
  year: number;
  make: string;
  model: string;
  trim?: string | null;
  vin?: string | null;

  // Pricing
  askingPrice?: number | null;

  // Status
  status?: 'available' | 'pending' | 'sold';

  // Details
  mileage?: number | null;
  exteriorColor?: string | null;
  interiorColor?: string | null;
  transmission?: string | null;
  engine?: string | null;
  description?: string | null;

  // Photos
  photos?: string[];

  // Import tracking
  sourceUrl?: string;
  importedAt?: Date;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Normalize scraped vehicle data to match Vehicle model
 *
 * Performs:
 * - String cleaning and capitalization
 * - Type conversion (string prices to Decimal)
 * - Field mapping
 * - Default value assignment
 *
 * @param scraped - Raw scraped vehicle data
 * @returns Normalized vehicle data ready for database insertion
 */
export function normalizeVehicleData(scraped: ScrapedVehicleDetail): NormalizedVehicle {
  // Clean and normalize strings
  const make = normalizeMake(scraped.make);
  const model = normalizeModel(scraped.model);
  const trim = scraped.trim ? normalizeString(scraped.trim) : null;

  // Validate and clean VIN
  const vin = scraped.vin ? normalizeVin(scraped.vin) : null;

  // Use price directly (Prisma handles Decimal conversion)
  const askingPrice = scraped.price ?? null;

  // Normalize colors
  const exteriorColor = scraped.exteriorColor
    ? normalizeString(scraped.exteriorColor)
    : null;
  const interiorColor = scraped.interiorColor
    ? normalizeString(scraped.interiorColor)
    : null;

  // Normalize transmission
  const transmission = scraped.transmission
    ? normalizeTransmission(scraped.transmission)
    : null;

  // Normalize engine
  const engine = scraped.engine ? normalizeString(scraped.engine) : null;

  // Clean description
  const description = scraped.description
    ? normalizeDescription(scraped.description)
    : null;

  // Filter and deduplicate image URLs
  const photos = scraped.imageUrls
    .filter(url => isValidImageUrl(url))
    .filter((url, index, self) => self.indexOf(url) === index); // Deduplicate

  return {
    year: scraped.year,
    make,
    model,
    trim,
    vin,
    askingPrice,
    status: 'available', // Default status for imported vehicles
    mileage: scraped.mileage,
    exteriorColor,
    interiorColor,
    transmission,
    engine,
    description,
    photos,
    sourceUrl: scraped.url,
    importedAt: new Date(),
  };
}

/**
 * Validate normalized vehicle data
 *
 * Checks:
 * - Required fields present
 * - Data types correct
 * - Value ranges reasonable
 * - VIN format valid
 *
 * @param data - Normalized vehicle data
 * @returns Validation result with errors
 */
export function validateVehicleData(data: NormalizedVehicle): ValidationResult {
  const errors: string[] = [];

  // Required fields
  if (!data.year) {
    errors.push('Year is required');
  } else if (data.year < 1900 || data.year > new Date().getFullYear() + 2) {
    errors.push(`Year ${data.year} is out of valid range (1900-${new Date().getFullYear() + 2})`);
  }

  if (!data.make || data.make.trim() === '') {
    errors.push('Make is required');
  } else if (data.make.length < 2) {
    errors.push('Make must be at least 2 characters');
  }

  if (!data.model || data.model.trim() === '') {
    errors.push('Model is required');
  } else if (data.model.length < 1) {
    errors.push('Model must be at least 1 character');
  }

  // VIN validation (if provided)
  if (data.vin) {
    const vinErrors = validateVin(data.vin);
    errors.push(...vinErrors);
  }

  // Mileage validation (if provided)
  if (data.mileage !== null && data.mileage !== undefined) {
    if (data.mileage < 0) {
      errors.push('Mileage cannot be negative');
    } else if (data.mileage > 1000000) {
      errors.push('Mileage seems unreasonably high (>1,000,000)');
    }
  }

  // Price validation (if provided)
  if (data.askingPrice) {
    const price = Number(data.askingPrice);
    if (price < 0) {
      errors.push('Price cannot be negative');
    } else if (price > 10000000) {
      errors.push('Price seems unreasonably high (>$10,000,000)');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate VIN format
 *
 * Rules:
 * - Must be exactly 17 characters
 * - Alphanumeric only
 * - Cannot contain I, O, or Q (to avoid confusion with 1, 0)
 *
 * @param vin - VIN string
 * @returns Array of error messages (empty if valid)
 */
function validateVin(vin: string): string[] {
  const errors: string[] = [];

  if (vin.length !== 17) {
    errors.push(`VIN must be exactly 17 characters (got ${vin.length})`);
  }

  if (!/^[A-HJ-NPR-Z0-9]+$/i.test(vin)) {
    errors.push('VIN contains invalid characters (must be alphanumeric, no I, O, or Q)');
  }

  return errors;
}

/**
 * Normalize make name
 * Examples: "toyota" -> "Toyota", "FORD" -> "Ford"
 */
function normalizeMake(make: string): string {
  const normalized = normalizeString(make);

  // Handle common abbreviations/variations
  const makeMap: Record<string, string> = {
    'Chevy': 'Chevrolet',
    'Vw': 'Volkswagen',
    'Merc': 'Mercedes-Benz',
    'Benz': 'Mercedes-Benz',
  };

  return makeMap[normalized] || normalized;
}

/**
 * Normalize model name
 */
function normalizeModel(model: string): string {
  return normalizeString(model);
}

/**
 * Normalize VIN (uppercase, trim)
 */
function normalizeVin(vin: string): string {
  return vin.toUpperCase().trim();
}

/**
 * Normalize transmission string
 */
function normalizeTransmission(transmission: string): string {
  const normalized = normalizeString(transmission);

  // Standardize common variations
  const transmissionMap: Record<string, string> = {
    'Auto': 'Automatic',
    'Man': 'Manual',
    'Mt': 'Manual',
    'At': 'Automatic',
  };

  return transmissionMap[normalized] || normalized;
}

/**
 * Normalize description (trim, remove excess whitespace)
 */
function normalizeDescription(description: string): string {
  return description
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n\s*\n/g, '\n') // Remove empty lines
    .trim();
}

/**
 * Normalize generic string (capitalize words, trim)
 */
function normalizeString(str: string): string {
  return str
    .trim()
    .split(' ')
    .map(word => {
      // Preserve all-caps acronyms (e.g., "SUV", "AWD")
      if (word.length <= 3 && word === word.toUpperCase()) {
        return word;
      }
      // Capitalize first letter
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Check if URL is a valid image URL
 */
function isValidImageUrl(url: string): boolean {
  if (!url || url.trim() === '') {
    return false;
  }

  // Must have image extension
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const hasValidExtension = validExtensions.some(ext =>
    url.toLowerCase().includes(ext)
  );

  if (!hasValidExtension) {
    return false;
  }

  // Should be a valid URL format (absolute or relative)
  try {
    // Try to create URL object (works for absolute URLs)
    new URL(url);
    return true;
  } catch {
    // If not absolute, check if it's a valid relative path
    return url.startsWith('/') || url.startsWith('http');
  }
}
