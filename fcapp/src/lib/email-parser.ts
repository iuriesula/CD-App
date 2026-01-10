import { htmlToPlainText } from "./email";

export interface ExtractedLeadData {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  interestedVehicle?: string;
  vehicleUrl?: string;
  message?: string;
  city?: string;
  state?: string;
  zip?: string;
  // Tracking info
  ipAddress?: string;
  browser?: string;
  platform?: string;
  submittedAt?: string;
  // Meta Ads tracking
  metaCampaignId?: string;
  metaAdsetId?: string;
  metaAdId?: string;
  metaAccountId?: string;
  utmCampaign?: string;
  utmSource?: string;
  utmMedium?: string;
}

/**
 * Common patterns for extracting data from form emails
 * These patterns handle various form builders (Wix, WordPress, Fluent Forms, Squarespace, etc.)
 */
const PATTERNS = {
  // Email patterns - look for email addresses in the body
  email: [
    /(?:email|e-mail|your\s*email\s*address)[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
  ],

  // Phone patterns
  phone: [
    /(?:phone|tel|telephone|mobile|cell|your\s*phone)[:\s]*([+\d\s\-().]{7,})/i,
    /\b(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})\b/,
  ],

  // Name patterns - use [^\S\n] for spaces (excludes newlines) to avoid capturing across lines
  firstName: [
    /(?:first\s*name|fname|given\s*name)[:\s]*([A-Za-z'-]+)/i,
  ],
  lastName: [
    /(?:last\s*name|lname|surname|family\s*name)[:\s]*([A-Za-z'-]+)/i,
  ],
  fullName: [
    /(?:full\s*name)[:\s]*([A-Za-z'-]+(?:[^\S\n]+[A-Za-z'-]+)*)/i,
    /(?:your\s*name|name)[:\s]*([A-Za-z'-]+(?:[^\S\n]+[A-Za-z'-]+)*)/i,
  ],

  // Vehicle interest - Fluent Forms uses "Vehicle:" and "Vehicle URL:"
  vehicle: [
    /(?:vehicle)[:\s]*([^\n]+)/i,
    /(?:vehicle|car|interested\s*in|looking\s*for|inquiry\s*about)[:\s]*(.{5,100})/i,
  ],
  vehicleUrl: [
    /(?:vehicle\s*url)[:\s]*(https?:\/\/[^\s]+)/i,
  ],

  // Message/Comments - stop at section markers
  message: [
    /(?:message|user\s*message)[:\s]*\n?([\s\S]*?)(?=\n---|\n\n---|\z)/i,
    /(?:comments?|inquiry|question|details?|notes?)[:\s]*([\s\S]{10,500})/i,
  ],

  // Location
  city: [
    /(?:city)[:\s]*([A-Za-z\s'-]+)/i,
  ],
  state: [
    /(?:state|province)[:\s]*([A-Za-z]{2,})/i,
  ],
  zip: [
    /(?:zip|postal\s*code|zipcode)[:\s]*(\d{5}(?:-\d{4})?)/i,
  ],

  // Tracking info - Fluent Forms format
  // IPv4: 192.168.1.1, IPv6: 2603:900b:7f00:49b:5846:6ab4:4a0:fd82
  ipAddress: [
    /(?:ip\s*address)[:\s]*([0-9a-fA-F.:]+)/i,
  ],
  browser: [
    /(?:browser)[:\s]*([A-Za-z]+)/i,
  ],
  platform: [
    /(?:os\/platform|platform|os)[:\s]*([A-Za-z]+)/i,
  ],
  submittedAt: [
    /(?:date)[:\s]*([0-9/]+)/i,
  ],

  // Meta Ads tracking patterns
  metaCampaignId: [
    /(?:campaign\s*id)[:\s]*([^\n\r]+)/i,
  ],
  metaAdsetId: [
    /(?:ad\s*set\s*id)[:\s]*([^\n\r]+)/i,
  ],
  metaAdId: [
    /(?:ad\s*id)[:\s]*([^\n\r]+)/i,
  ],
  metaAccountId: [
    /(?:account\s*id)[:\s]*([^\n\r]+)/i,
  ],
  utmCampaign: [
    /(?:utm[_\s]campaign)[:\s]*([^\n\r]+)/i,
  ],
  utmSource: [
    /(?:utm[_\s]source)[:\s]*([^\n\r]+)/i,
  ],
  utmMedium: [
    /(?:utm[_\s]medium)[:\s]*([^\n\r]+)/i,
  ],
};

/**
 * Extract email from text - handles noreply senders by looking in body
 */
export function extractEmailFromText(text: string): string | undefined {
  // Skip common noreply/system email patterns
  const skipPatterns = [
    /noreply/i,
    /no-reply/i,
    /donotreply/i,
    /notifications?@/i,
    /mailer-daemon/i,
    /postmaster/i,
  ];

  for (const pattern of PATTERNS.email) {
    const matches = text.match(new RegExp(pattern, "gi"));
    if (matches) {
      for (const match of matches) {
        // Extract just the email part
        const emailMatch = match.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
        if (emailMatch) {
          const email = emailMatch[1].toLowerCase();
          // Skip if it's a system email
          const isSystem = skipPatterns.some((p) => p.test(email));
          if (!isSystem) {
            return email;
          }
        }
      }
    }
  }

  return undefined;
}

/**
 * Parse form submission email and extract lead data
 */
export function parseFormEmail(
  fromAddress: string,
  subject: string,
  bodyHtml: string | null,
  bodyText: string | null
): ExtractedLeadData {
  const data: ExtractedLeadData = {};

  // Convert HTML to text if needed
  const text = bodyText || (bodyHtml ? htmlToPlainText(bodyHtml) : "");

  // Extract vehicle from [LEAD] subject line: "[LEAD] New Inquiry - 1967 Pontiac GTO"
  const leadSubjectMatch = subject.match(/\[LEAD\]\s*(?:New\s*Inquiry\s*-?\s*)?(.+)/i);
  if (leadSubjectMatch) {
    data.interestedVehicle = leadSubjectMatch[1].trim();
  }

  // Extract email - important for noreply senders
  // First check the body for a real email
  const bodyEmail = extractEmailFromText(text);
  if (bodyEmail) {
    data.email = bodyEmail;
  } else if (fromAddress && !isSystemEmail(fromAddress)) {
    // Fall back to sender if not a system email
    data.email = fromAddress.toLowerCase();
  }

  // Extract phone
  for (const pattern of PATTERNS.phone) {
    const match = text.match(pattern);
    if (match) {
      data.phone = cleanPhone(match[1]);
      break;
    }
  }

  // Extract name - try "Full Name:" first (Fluent Forms format)
  for (const pattern of PATTERNS.fullName) {
    const match = text.match(pattern);
    if (match) {
      const parts = match[1].trim().split(/\s+/);
      if (parts.length >= 2) {
        data.firstName = cleanName(parts[0]);
        data.lastName = cleanName(parts.slice(1).join(" "));
      } else {
        data.firstName = cleanName(match[1]);
      }
      break;
    }
  }

  // If no full name, try first/last separately
  if (!data.firstName) {
    for (const pattern of PATTERNS.firstName) {
      const match = text.match(pattern);
      if (match) {
        data.firstName = cleanName(match[1]);
        break;
      }
    }
  }

  if (!data.lastName) {
    for (const pattern of PATTERNS.lastName) {
      const match = text.match(pattern);
      if (match) {
        data.lastName = cleanName(match[1]);
        break;
      }
    }
  }

  // Extract vehicle from body if not in subject
  if (!data.interestedVehicle) {
    for (const pattern of PATTERNS.vehicle) {
      const match = text.match(pattern);
      if (match) {
        const vehicle = match[1].trim();
        // Skip if it's a URL (that's the vehicle URL field)
        if (!vehicle.startsWith("http")) {
          data.interestedVehicle = vehicle.slice(0, 100);
          break;
        }
      }
    }
  }

  // Extract vehicle URL
  for (const pattern of PATTERNS.vehicleUrl) {
    const match = text.match(pattern);
    if (match) {
      data.vehicleUrl = match[1].trim();
      break;
    }
  }

  // Extract message - look for content between "Message:" and "--- TRACKING ---"
  const messageMatch = text.match(/(?:message|user\s*message)[:\s]*\n?([\s\S]*?)(?=\n*---\s*TRACKING|$)/i);
  if (messageMatch) {
    const msg = messageMatch[1].trim();
    if (msg.length > 0) {
      data.message = msg.slice(0, 500);
    }
  }

  // Extract location
  for (const pattern of PATTERNS.city) {
    const match = text.match(pattern);
    if (match) {
      data.city = cleanName(match[1]);
      break;
    }
  }

  for (const pattern of PATTERNS.state) {
    const match = text.match(pattern);
    if (match) {
      data.state = match[1].trim().slice(0, 20);
      break;
    }
  }

  for (const pattern of PATTERNS.zip) {
    const match = text.match(pattern);
    if (match) {
      data.zip = match[1].trim();
      break;
    }
  }

  // Extract tracking info
  for (const pattern of PATTERNS.ipAddress) {
    const match = text.match(pattern);
    if (match) {
      data.ipAddress = match[1].trim();
      break;
    }
  }

  for (const pattern of PATTERNS.browser) {
    const match = text.match(pattern);
    if (match) {
      data.browser = match[1].trim();
      break;
    }
  }

  for (const pattern of PATTERNS.platform) {
    const match = text.match(pattern);
    if (match) {
      data.platform = match[1].trim();
      break;
    }
  }

  for (const pattern of PATTERNS.submittedAt) {
    const match = text.match(pattern);
    if (match) {
      data.submittedAt = match[1].trim();
      break;
    }
  }

  // Extract Meta Ads tracking (skip placeholder values like "input_hidden")
  const isValidTrackingValue = (value: string): boolean => {
    if (!value || value.length === 0) return false;
    const invalidValues = ['input_hidden', 'hidden', 'n/a', 'na', 'none', 'null', 'undefined', ''];
    return !invalidValues.includes(value.toLowerCase());
  };

  for (const pattern of PATTERNS.metaCampaignId) {
    const match = text.match(pattern);
    if (match) {
      const value = match[1].trim();
      if (isValidTrackingValue(value)) {
        data.metaCampaignId = value;
      }
      break;
    }
  }

  for (const pattern of PATTERNS.metaAdsetId) {
    const match = text.match(pattern);
    if (match) {
      const value = match[1].trim();
      if (isValidTrackingValue(value)) {
        data.metaAdsetId = value;
      }
      break;
    }
  }

  for (const pattern of PATTERNS.metaAdId) {
    const match = text.match(pattern);
    if (match) {
      const value = match[1].trim();
      if (isValidTrackingValue(value)) {
        data.metaAdId = value;
      }
      break;
    }
  }

  for (const pattern of PATTERNS.metaAccountId) {
    const match = text.match(pattern);
    if (match) {
      const value = match[1].trim();
      if (isValidTrackingValue(value)) {
        data.metaAccountId = value;
      }
      break;
    }
  }

  for (const pattern of PATTERNS.utmCampaign) {
    const match = text.match(pattern);
    if (match) {
      const value = match[1].trim();
      if (isValidTrackingValue(value)) {
        data.utmCampaign = value;
      }
      break;
    }
  }

  for (const pattern of PATTERNS.utmSource) {
    const match = text.match(pattern);
    if (match) {
      const value = match[1].trim();
      if (isValidTrackingValue(value)) {
        data.utmSource = value;
      }
      break;
    }
  }

  for (const pattern of PATTERNS.utmMedium) {
    const match = text.match(pattern);
    if (match) {
      const value = match[1].trim();
      if (isValidTrackingValue(value)) {
        data.utmMedium = value;
      }
      break;
    }
  }

  return data;
}

/**
 * Check if email is a system/noreply address
 */
function isSystemEmail(email: string): boolean {
  const systemPatterns = [
    /noreply/i,
    /no-reply/i,
    /donotreply/i,
    /notifications?@/i,
    /mailer-daemon/i,
    /postmaster/i,
    /support@/i,
    /info@/i,
    /admin@/i,
  ];

  return systemPatterns.some((p) => p.test(email));
}

/**
 * Clean phone number to standard format
 */
function cleanPhone(phone: string): string {
  // Remove all non-digit characters except +
  return phone.replace(/[^\d+]/g, "").slice(0, 15);
}

/**
 * Clean name (capitalize first letter, remove extra spaces)
 */
function cleanName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
    .slice(0, 50);
}

/**
 * Check if email appears to be a form submission
 */
export function isFormSubmissionEmail(subject: string, fromAddress: string): boolean {
  // Check for [LEAD] prefix first (our custom format)
  if (/^\[LEAD\]/i.test(subject)) {
    return true;
  }

  const formIndicators = [
    /form\s*submission/i,
    /new\s*lead/i,
    /website\s*inquiry/i,
    /contact\s*form/i,
    /new\s*contact/i,
    /inquiry\s*from/i,
    /new\s*message/i,
    /new\s*inquiry/i,
  ];

  const fromIndicators = [
    /noreply/i,
    /no-reply/i,
    /notifications?@/i,
    /forms?@/i,
    /wix/i,
    /squarespace/i,
    /wordpress/i,
    /webform/i,
    /fluentforms/i,
  ];

  const subjectMatch = formIndicators.some((p) => p.test(subject));
  const fromMatch = fromIndicators.some((p) => p.test(fromAddress));

  return subjectMatch || fromMatch;
}
