/**
 * Image Downloader - Download and store vehicle images
 *
 * Downloads images from URLs with rate limiting and error handling.
 * Stores images in dealership-specific directories.
 */

import fs from 'fs';
import path from 'path';
import { mkdir } from 'fs/promises';

/**
 * Result of image download operation
 */
export interface DownloadResult {
  success: string[]; // Successfully downloaded image paths
  failed: string[];  // Failed image URLs
}

/**
 * Download vehicle images from URLs
 *
 * Features:
 * - Creates directory structure if needed
 * - Rate limits downloads (200ms between each)
 * - Handles errors gracefully (continues on failure)
 * - Returns both successful and failed downloads
 *
 * @param urls - Array of image URLs to download
 * @param dealershipId - Dealership ID for directory structure
 * @param vehicleId - Vehicle ID for directory structure
 * @returns Download result with success/failed arrays
 */
export async function downloadVehicleImages(
  urls: string[],
  dealershipId: string,
  vehicleId: string
): Promise<DownloadResult> {
  const result: DownloadResult = {
    success: [],
    failed: [],
  };

  if (urls.length === 0) {
    return result;
  }

  // Create directory structure
  const baseDir = path.join(
    process.cwd(),
    'public',
    'uploads',
    'dealerships',
    dealershipId,
    'vehicles',
    vehicleId
  );

  try {
    await mkdir(baseDir, { recursive: true });
  } catch (error) {
    console.error(`Failed to create directory ${baseDir}:`, error);
    // Mark all as failed if directory creation fails
    result.failed = urls;
    return result;
  }

  // Download each image with rate limiting
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];

    try {
      // Download image
      const imagePath = await downloadImage(url, baseDir, i);

      // Convert absolute path to relative path for database storage
      const relativePath = `/uploads/dealerships/${dealershipId}/vehicles/${vehicleId}/${path.basename(imagePath)}`;
      result.success.push(relativePath);

      console.log(`Downloaded image ${i + 1}/${urls.length}: ${url}`);
    } catch (error) {
      console.error(`Failed to download image ${url}:`, error);
      result.failed.push(url);
    }

    // Rate limit: 200ms between downloads (except for last image)
    if (i < urls.length - 1) {
      await sleep(200);
    }
  }

  return result;
}

/**
 * Download a single image from URL
 *
 * @param url - Image URL (absolute or relative)
 * @param targetDir - Directory to save image
 * @param index - Image index for filename
 * @returns Absolute path to saved image
 */
async function downloadImage(
  url: string,
  targetDir: string,
  index: number
): Promise<string> {
  // Ensure URL is absolute
  const absoluteUrl = makeAbsoluteUrl(url);

  // Fetch image
  const response = await fetch(absoluteUrl, {
    headers: {
      'User-Agent': 'CDApp-Inventory-Import/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  // Get image data as buffer
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Determine file extension from URL or Content-Type
  const extension = getImageExtension(url, response.headers.get('content-type'));

  // Generate filename: 0.jpg, 1.jpg, etc.
  const filename = `${index}${extension}`;
  const filepath = path.join(targetDir, filename);

  // Write file
  await fs.promises.writeFile(filepath, buffer);

  return filepath;
}

/**
 * Make URL absolute if it's relative
 *
 * For relative URLs, this is a placeholder - in real usage,
 * you'd need to pass the base URL of the dealership site.
 */
function makeAbsoluteUrl(url: string): string {
  // Already absolute
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Relative URL - in production, you'd prepend the dealership's base URL
  // For now, throw an error to make it explicit
  throw new Error(`Relative URL not supported without base URL: ${url}`);
}

/**
 * Determine image file extension
 *
 * @param url - Image URL
 * @param contentType - Content-Type header from response
 * @returns File extension (e.g., '.jpg', '.png')
 */
function getImageExtension(url: string, contentType: string | null): string {
  // Try to get extension from URL
  const urlExtension = path.extname(url).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(urlExtension)) {
    return urlExtension;
  }

  // Fall back to Content-Type
  if (contentType) {
    const typeMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
    };

    const extension = typeMap[contentType.toLowerCase()];
    if (extension) {
      return extension;
    }
  }

  // Default to .jpg
  return '.jpg';
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Enhanced version that accepts base URL for relative paths
 */
export async function downloadVehicleImagesWithBaseUrl(
  urls: string[],
  baseUrl: string,
  dealershipId: string,
  vehicleId: string
): Promise<DownloadResult> {
  const result: DownloadResult = {
    success: [],
    failed: [],
  };

  if (urls.length === 0) {
    return result;
  }

  // Create directory structure
  const baseDir = path.join(
    process.cwd(),
    'public',
    'uploads',
    'dealerships',
    dealershipId,
    'vehicles',
    vehicleId
  );

  try {
    await mkdir(baseDir, { recursive: true });
  } catch (error) {
    console.error(`Failed to create directory ${baseDir}:`, error);
    result.failed = urls;
    return result;
  }

  // Download each image with rate limiting
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];

    try {
      // Make URL absolute using base URL
      const absoluteUrl = url.startsWith('http')
        ? url
        : new URL(url, baseUrl).toString();

      // Download image
      const response = await fetch(absoluteUrl, {
        headers: {
          'User-Agent': 'CDApp-Inventory-Import/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Determine extension
      const extension = getImageExtension(url, response.headers.get('content-type'));
      const filename = `${i}${extension}`;
      const filepath = path.join(baseDir, filename);

      // Write file
      await fs.promises.writeFile(filepath, buffer);

      // Store relative path for database
      const relativePath = `/uploads/dealerships/${dealershipId}/vehicles/${vehicleId}/${filename}`;
      result.success.push(relativePath);

      console.log(`Downloaded image ${i + 1}/${urls.length}: ${url}`);
    } catch (error) {
      console.error(`Failed to download image ${url}:`, error);
      result.failed.push(url);
    }

    // Rate limit: 200ms between downloads
    if (i < urls.length - 1) {
      await sleep(200);
    }
  }

  return result;
}
