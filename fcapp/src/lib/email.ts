import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type { Dealership } from "@prisma/client";
import dns from "dns";

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromName?: string;
  fromAddress?: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  inReplyTo?: string;
  trackingId?: string; // Email ID for tracking opens
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Generate tracking pixel HTML to embed in emails
 * When loaded, this image pings our server to record the open
 */
export function generateTrackingPixel(baseUrl: string, emailId: string): string {
  const trackingUrl = `${baseUrl}/api/email/track/${emailId}`;
  return `<img src="${trackingUrl}" width="1" height="1" style="display:none;" alt="" />`;
}

/**
 * Add tracking pixel to HTML email
 */
export function addTrackingToHtml(html: string, baseUrl: string, emailId: string): string {
  const trackingPixel = generateTrackingPixel(baseUrl, emailId);

  // Try to insert before </body> or append at end
  if (html.includes("</body>")) {
    return html.replace("</body>", `${trackingPixel}</body>`);
  }
  return html + trackingPixel;
}

/**
 * Create SMTP transporter from dealership config
 */
export function createSmtpTransporter(dealership: Dealership): Transporter | null {
  if (!dealership.smtpHost || !dealership.smtpUser || !dealership.smtpPassword) {
    return null;
  }

  return nodemailer.createTransport({
    host: dealership.smtpHost,
    port: dealership.smtpPort || 587,
    secure: dealership.smtpSecure,
    auth: {
      user: dealership.smtpUser,
      pass: dealership.smtpPassword,
    },
    // Use IPv4 preference which helps with some DNS issues
    family: 4,
    // Connection timeout
    connectionTimeout: 10000,
  });
}

/**
 * Send email using dealership SMTP config
 */
export async function sendEmail(
  dealership: Dealership,
  options: SendEmailOptions
): Promise<SendEmailResult> {
  const transporter = createSmtpTransporter(dealership);

  if (!transporter) {
    return {
      success: false,
      error: "Email not configured for this dealership",
    };
  }

  const fromName = dealership.emailFromName || dealership.name;
  const fromAddress = dealership.emailFromAddress || dealership.smtpUser;

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo,
      headers: options.inReplyTo
        ? {
            "In-Reply-To": options.inReplyTo,
            References: options.inReplyTo,
          }
        : undefined,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("Failed to send email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

/**
 * Test SMTP connection
 */
export async function testSmtpConnection(config: EmailConfig): Promise<{ success: boolean; error?: string }> {
  try {
    // First try to resolve the hostname to catch DNS issues early
    await new Promise<void>((resolve, reject) => {
      dns.lookup(config.host, (err) => {
        if (err) {
          reject(new Error(`DNS lookup failed for ${config.host}: ${err.code || err.message}`));
        } else {
          resolve();
        }
      });
    });

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.password,
      },
      // Use IPv4 preference which helps with some DNS issues
      family: 4,
      // Connection timeout
      connectionTimeout: 10000,
    });

    await transporter.verify();
    return { success: true };
  } catch (error) {
    console.error("SMTP test failed:", error);
    const errorMessage = error instanceof Error ? error.message : "Connection failed";

    // Provide more helpful error messages
    if (errorMessage.includes("EBADNAME") || errorMessage.includes("DNS")) {
      return {
        success: false,
        error: `Cannot resolve hostname "${config.host}". Please check the server address.`,
      };
    }
    if (errorMessage.includes("ECONNREFUSED")) {
      return {
        success: false,
        error: `Connection refused. Check if the port ${config.port} is correct and the server is accessible.`,
      };
    }
    if (errorMessage.includes("ETIMEDOUT")) {
      return {
        success: false,
        error: `Connection timed out. The server may be unreachable or blocked by firewall.`,
      };
    }
    if (errorMessage.includes("authentication") || errorMessage.includes("535")) {
      return {
        success: false,
        error: `Authentication failed. Please check your username and password.`,
      };
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Generate plain text from HTML
 */
export function htmlToPlainText(html: string): string {
  // Simple HTML to text conversion
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
