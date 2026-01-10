/**
 * Bricks Parser - HTML parsing for WordPress + Bricks Builder dealership sites
 *
 * This module parses HTML from WordPress dealership sites using Bricks Builder.
 * Uses regex and string parsing - no external libraries.
 */

import { ScrapedVehicleDetail } from './types';

/**
 * Extract vehicle detail page URLs from a listing page
 *
 * Looks for URLs matching pattern: /listing/{year}-{make}-{model}-{id}/
 *
 * @param html - Raw HTML from listing page
 * @returns Array of absolute or relative vehicle URLs
 */
export function parseListingPage(html: string): string[] {
  const urls: string[] = [];

  // Pattern 1: href="/listing/YYYY-make-model-id/"
  const listingPattern = /href=["']([^"']*\/listing\/[^"']+?)["']/gi;
  let match;

  while ((match = listingPattern.exec(html)) !== null) {
    const url = match[1];
    // Deduplicate
    if (!urls.includes(url)) {
      urls.push(url);
    }
  }

  // Pattern 2: Also check for data-permalink or similar attributes
  const permalinkPattern = /data-permalink=["']([^"']*\/listing\/[^"']+?)["']/gi;
  while ((match = permalinkPattern.exec(html)) !== null) {
    const url = match[1];
    if (!urls.includes(url)) {
      urls.push(url);
    }
  }

  return urls;
}

/**
 * Extract vehicle data from a detail page
 *
 * Handles variations in HTML structure across different dealership sites.
 * Returns partial data if some fields are missing.
 *
 * @param html - Raw HTML from vehicle detail page
 * @param url - URL of the page (for reference)
 * @returns Scraped vehicle data
 */
export function parseVehicleDetailPage(html: string, url: string): ScrapedVehicleDetail {
  // Initialize with required fields from URL
  const urlData = extractDataFromUrl(url);

  const vehicle: ScrapedVehicleDetail = {
    url,
    year: urlData.year || extractYear(html),
    make: urlData.make || extractMake(html),
    model: urlData.model || extractModel(html),
    trim: extractTrim(html),
    vin: extractVin(html),
    price: extractPrice(html),
    mileage: extractMileage(html),
    exteriorColor: extractColor(html, 'exterior'),
    interiorColor: extractColor(html, 'interior'),
    transmission: extractTransmission(html),
    engine: extractEngine(html),
    fuelType: extractFuelType(html),
    bodyType: extractBodyType(html),
    description: extractDescription(html),
    imageUrls: extractImageUrls(html),
  };

  return vehicle;
}

/**
 * Extract year, make, model from URL pattern
 * Pattern: /listing/2020-toyota-camry-abc123/
 */
function extractDataFromUrl(url: string): { year?: number; make?: string; model?: string } {
  const urlPattern = /\/listing\/(\d{4})-([^-]+)-([^-]+)/i;
  const match = url.match(urlPattern);

  if (!match) {
    return {};
  }

  return {
    year: parseInt(match[1], 10),
    make: capitalize(match[2].replace(/-/g, ' ')),
    model: capitalize(match[3].replace(/-/g, ' ')),
  };
}

/**
 * Extract VIN (17-character alphanumeric)
 */
function extractVin(html: string): string | null {
  // Look for "VIN:" label followed by 17-character code
  const vinPatterns = [
    /vin[:\s]*([A-HJ-NPR-Z0-9]{17})/i,
    /vehicle\s+identification\s+number[:\s]*([A-HJ-NPR-Z0-9]{17})/i,
    /\b([A-HJ-NPR-Z0-9]{17})\b/g, // Fallback: any 17-char alphanumeric (excluding I, O, Q)
  ];

  for (const pattern of vinPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      // Validate VIN format (no I, O, Q letters)
      const vin = match[1].toUpperCase();
      if (!/[IOQ]/.test(vin)) {
        return vin;
      }
    }
  }

  return null;
}

/**
 * Extract price ($XX,XXX format)
 */
function extractPrice(html: string): number | null {
  // Look for price patterns
  const pricePatterns = [
    /price[:\s]*\$?([\d,]+)/i,
    /\$\s*([\d,]+)(?:\.\d{2})?/,
    /asking[:\s]*\$?([\d,]+)/i,
  ];

  for (const pattern of pricePatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const priceStr = match[1].replace(/,/g, '');
      const price = parseInt(priceStr, 10);
      // Reasonable price range: $500 - $500,000
      if (price >= 500 && price <= 500000) {
        return price;
      }
    }
  }

  return null;
}

/**
 * Extract mileage
 */
function extractMileage(html: string): number | null {
  const mileagePatterns = [
    /mileage[:\s]*([\d,]+)/i,
    /odometer[:\s]*([\d,]+)/i,
    /([\d,]+)\s*miles?/i,
  ];

  for (const pattern of mileagePatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const mileageStr = match[1].replace(/,/g, '');
      const mileage = parseInt(mileageStr, 10);
      // Reasonable range: 0 - 500,000 miles
      if (mileage >= 0 && mileage <= 500000) {
        return mileage;
      }
    }
  }

  return null;
}

/**
 * Extract year
 */
function extractYear(html: string): number {
  const yearPatterns = [
    /year[:\s]*(\d{4})/i,
    /\b(19\d{2}|20\d{2})\b/g, // Any year 1900-2099
  ];

  for (const pattern of yearPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const year = parseInt(match[1], 10);
      const currentYear = new Date().getFullYear();
      // Reasonable range: 1980 - current year + 2
      if (year >= 1980 && year <= currentYear + 2) {
        return year;
      }
    }
  }

  return new Date().getFullYear(); // Fallback
}

/**
 * Extract make
 */
function extractMake(html: string): string {
  const makePatterns = [
    /make[:\s]*([A-Za-z]+)/i,
    /manufacturer[:\s]*([A-Za-z]+)/i,
  ];

  for (const pattern of makePatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return capitalize(match[1]);
    }
  }

  return 'Unknown';
}

/**
 * Extract model
 */
function extractModel(html: string): string {
  const modelPatterns = [
    /model[:\s]*([A-Za-z0-9\s-]+?)(?:<|$|\|)/i,
  ];

  for (const pattern of modelPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return capitalize(match[1].trim());
    }
  }

  return 'Unknown';
}

/**
 * Extract trim
 */
function extractTrim(html: string): string | null {
  const trimPatterns = [
    /trim[:\s]*([A-Za-z0-9\s-]+?)(?:<|$|\|)/i,
    /style[:\s]*([A-Za-z0-9\s-]+?)(?:<|$|\|)/i,
  ];

  for (const pattern of trimPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Extract exterior or interior color
 * Handles labeled format and color mentions in description text
 */
function extractColor(html: string, type: 'exterior' | 'interior'): string | null {
  // Common car colors
  const colorWords = [
    'black', 'white', 'silver', 'gray', 'grey', 'red', 'blue', 'green', 'yellow',
    'orange', 'brown', 'beige', 'tan', 'gold', 'bronze', 'burgundy', 'maroon',
    'navy', 'cream', 'ivory', 'champagne', 'pearl', 'metallic', 'charcoal'
  ];
  const colorPattern = colorWords.join('|');

  // Pattern 1: Labeled format "Exterior Color: Red"
  const labeledPatterns = [
    new RegExp(`${type}\\s+color[:\\s]*([A-Za-z\\s]+?)(?:<|$|\\|)`, 'i'),
    new RegExp(`${type}[:\\s]*([A-Za-z\\s]+?)(?:<|$|\\|)`, 'i'),
  ];

  for (const pattern of labeledPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return capitalize(match[1].trim());
    }
  }

  // Pattern 2: Look for color mentions in description text
  // Examples: "bright yellow exterior", "black interior", "finished in red"
  let colorMatch;

  if (type === 'exterior') {
    // Look for patterns like "yellow exterior", "finished in red", "painted blue"
    const exteriorPatterns = [
      new RegExp(`((?:bright\\s+|dark\\s+|light\\s+)?(?:${colorPattern})(?:\\s+${colorPattern})?)\\s+exterior`, 'i'),
      new RegExp(`exterior\\s+(?:is\\s+|in\\s+)?((?:bright\\s+|dark\\s+|light\\s+)?(?:${colorPattern})(?:\\s+${colorPattern})?)`, 'i'),
      new RegExp(`(?:finished|painted|sprayed)\\s+(?:in\\s+)?((?:bright\\s+|dark\\s+|light\\s+)?(?:${colorPattern})(?:\\s+${colorPattern})?)`, 'i'),
    ];

    for (const pattern of exteriorPatterns) {
      colorMatch = html.match(pattern);
      if (colorMatch && colorMatch[1]) {
        return capitalize(colorMatch[1].trim());
      }
    }
  } else {
    // Look for patterns like "black interior", "tan leather interior"
    const interiorPatterns = [
      new RegExp(`((?:${colorPattern})(?:\\s+(?:leather|cloth|vinyl))?)\\s+interior`, 'i'),
      new RegExp(`interior\\s+(?:is\\s+|in\\s+)?((?:${colorPattern})(?:\\s+(?:leather|cloth|vinyl))?)`, 'i'),
    ];

    for (const pattern of interiorPatterns) {
      colorMatch = html.match(pattern);
      if (colorMatch && colorMatch[1]) {
        return capitalize(colorMatch[1].trim());
      }
    }
  }

  return null;
}

/**
 * Extract transmission
 * Handles both labeled format and Bricks Builder h6 headings
 */
function extractTransmission(html: string): string | null {
  // Pattern 1: Labeled format "Transmission: Automatic"
  const labeledPatterns = [
    /transmission[:\s]*(automatic|manual|cvt|[A-Za-z0-9\s-]+?)(?:<|$|\|)/i,
  ];

  for (const pattern of labeledPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return capitalize(match[1].trim());
    }
  }

  // Pattern 2: Bricks Builder - look in h6.brxe-heading for transmission patterns
  // Examples: "3 Speed Automatic", "4-Speed Manual", "6 Speed", "CVT"
  const h6Pattern = /<h6[^>]*class=["'][^"']*brxe-heading[^"']*["'][^>]*>(?:<[^>]*>)*([^<]+)/gi;
  let match;

  while ((match = h6Pattern.exec(html)) !== null) {
    const text = match[1].trim();
    // Check if this looks like a transmission
    if (/\d+[\s-]?speed/i.test(text) || /automatic|manual|cvt/i.test(text)) {
      return text;
    }
  }

  return null;
}

/**
 * Extract engine
 * Handles both labeled format and Bricks Builder h6 headings
 */
function extractEngine(html: string): string | null {
  // Pattern 1: Labeled format "Engine: 5.7L V8"
  const labeledPatterns = [
    /engine[:\s]*([A-Za-z0-9\s.-]+?)(?:<|$|\|)/i,
    /(\d\.\d+L?)\s*(V\d+|I\d+)?/i, // e.g., "3.5L V6"
  ];

  for (const pattern of labeledPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // Pattern 2: Bricks Builder - look in h6.brxe-heading for engine patterns
  // Examples: "496 V8", "350 V8", "5.7L Hemi", "3.6L V6", "2.0L I4"
  const h6Pattern = /<h6[^>]*class=["'][^"']*brxe-heading[^"']*["'][^>]*>(?:<[^>]*>)*([^<]+)/gi;
  let match;

  while ((match = h6Pattern.exec(html)) !== null) {
    const text = match[1].trim();
    // Check if this looks like an engine spec (V8, V6, I4, etc. or cubic inches + V8)
    if (/\d+\s*(?:V\d+|I\d+)/i.test(text) || /\d\.\d+L?\s*(?:V\d+|I\d+)?/i.test(text) || /(?:V\d+|I\d+)$/i.test(text)) {
      return text;
    }
  }

  return null;
}

/**
 * Extract fuel type
 */
function extractFuelType(html: string): string | null {
  const patterns = [
    /fuel[:\s]*(gasoline|diesel|electric|hybrid|gas|ev|phev|[A-Za-z]+?)(?:<|$|\|)/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return capitalize(match[1].trim());
    }
  }

  return null;
}

/**
 * Extract body type
 */
function extractBodyType(html: string): string | null {
  const patterns = [
    /body\s+type[:\s]*(sedan|suv|truck|coupe|hatchback|wagon|van|convertible|[A-Za-z\s]+?)(?:<|$|\|)/i,
    /body[:\s]*(sedan|suv|truck|coupe|hatchback|wagon|van|convertible|[A-Za-z\s]+?)(?:<|$|\|)/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return capitalize(match[1].trim());
    }
  }

  return null;
}

/**
 * Extract description from vehicle detail page
 * Looks for long paragraphs that describe the vehicle
 */
function extractDescription(html: string): string | null {
  // Look for description in common patterns
  const patterns = [
    /description[:\s]*<[^>]*>([^<]+)</i,
    /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i,
    /<p[^>]*class=["'][^"']*description[^"']*["'][^>]*>([^<]+)</i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return cleanText(match[1]);
    }
  }

  // Bricks Builder: Look for long paragraphs (vehicle descriptions are usually long)
  // Look for <p> tags with brxe- class that contain substantial text
  const bricksParagraphPattern = /<p[^>]*class=["'][^"']*brxe-[^"']*["'][^>]*>([^<]{100,})<\/p>/gi;
  let match;
  const paragraphs: string[] = [];

  while ((match = bricksParagraphPattern.exec(html)) !== null) {
    const text = cleanText(match[1]);
    // Skip paragraphs that are just contact info or short
    if (text.length > 100 && !text.match(/^(call|contact|email|phone)/i)) {
      paragraphs.push(text);
    }
  }

  // Return the longest paragraph as the description
  if (paragraphs.length > 0) {
    return paragraphs.reduce((longest, current) =>
      current.length > longest.length ? current : longest
    );
  }

  // Fallback: Look for any long <p> tag content
  const fallbackPattern = /<p[^>]*>([^<]{150,})<\/p>/gi;
  while ((match = fallbackPattern.exec(html)) !== null) {
    const text = cleanText(match[1]);
    if (text.length > 150 && !text.match(/^(call|contact|email|phone|copyright)/i)) {
      return text;
    }
  }

  return null;
}

/**
 * Extract image URLs
 * Pattern: wp-content/uploads/YYYY/MM/*.jpg
 * Filters out logo images
 */
function extractImageUrls(html: string): string[] {
  const urls: string[] = [];

  // Logo patterns to exclude
  const logoPatterns = [
    /Cabinet-Motors-Logo/i,
    /cropped-Cabinet/i,
    /logo/i,
    /favicon/i,
    /icon/i,
  ];

  const isLogoImage = (url: string): boolean => {
    return logoPatterns.some(pattern => pattern.test(url));
  };

  // Pattern 1: wp-content/uploads paths
  const wpPattern = /(?:src|href)=["']([^"']*wp-content\/uploads\/[^"']+\.(?:jpg|jpeg|png|webp))["']/gi;
  let match;

  while ((match = wpPattern.exec(html)) !== null) {
    const url = match[1];
    // Skip logos and duplicates
    if (!urls.includes(url) && !isLogoImage(url)) {
      urls.push(url);
    }
  }

  // Pattern 2: Any image URLs in gallery or slider elements
  const galleryPattern = /(?:data-src|data-image)=["']([^"']+\.(?:jpg|jpeg|png|webp))["']/gi;
  while ((match = galleryPattern.exec(html)) !== null) {
    const url = match[1];
    if (!urls.includes(url) && !isLogoImage(url)) {
      urls.push(url);
    }
  }

  return urls;
}

/**
 * Capitalize first letter of each word
 */
function capitalize(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Clean text (remove extra whitespace, decode HTML entities)
 */
function cleanText(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
