import imaps from "imap-simple";
import { simpleParser, ParsedMail } from "mailparser";
import type { Dealership, User } from "@prisma/client";
import prisma from "@/lib/db";
import { htmlToPlainText } from "./email";
import { parseFormEmail, isFormSubmissionEmail } from "./email-parser";
import { getLocationFromIp } from "./geolocation";

/**
 * Get the next salesperson for round-robin assignment
 * Returns null if no salespeople available
 */
async function getNextSalesperson(dealershipId: string, lastAssignedId: string | null): Promise<User | null> {
  // Get all active salespeople only (not managers)
  const salespeople = await prisma.user.findMany({
    where: {
      dealershipId,
      isActive: true,
      role: "salesperson",
    },
    orderBy: { createdAt: "asc" }, // Consistent ordering
  });

  if (salespeople.length === 0) {
    return null;
  }

  // If only one salesperson, return them
  if (salespeople.length === 1) {
    return salespeople[0];
  }

  // Find the index of the last assigned person
  const lastIndex = lastAssignedId
    ? salespeople.findIndex(sp => sp.id === lastAssignedId)
    : -1;

  // Get the next person in rotation (wraps around)
  const nextIndex = (lastIndex + 1) % salespeople.length;
  return salespeople[nextIndex];
}

export interface ImapConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  secure: boolean;
}

export interface ParsedEmail {
  messageId: string;
  from: string;
  to: string;
  subject: string;
  bodyText: string | null;
  bodyHtml: string | null;
  date: Date;
  inReplyTo: string | null;
}

/**
 * Create IMAP config from dealership
 */
export function getImapConfig(dealership: Dealership): ImapConfig | null {
  if (!dealership.imapHost || !dealership.imapUser || !dealership.imapPassword) {
    return null;
  }

  return {
    host: dealership.imapHost,
    port: dealership.imapPort || 993,
    user: dealership.imapUser,
    password: dealership.imapPassword,
    secure: dealership.imapSecure,
  };
}

/**
 * Fetch new emails from IMAP server
 */
export async function fetchNewEmails(
  dealership: Dealership,
  since?: Date
): Promise<ParsedEmail[]> {
  const config = getImapConfig(dealership);
  if (!config) {
    throw new Error("IMAP not configured for this dealership");
  }

  const imapConfig = {
    imap: {
      user: config.user,
      password: config.password,
      host: config.host,
      port: config.port,
      tls: config.secure,
      authTimeout: 10000,
      tlsOptions: { rejectUnauthorized: false },
    },
  };

  let connection: imaps.ImapSimple | null = null;

  try {
    connection = await imaps.connect(imapConfig);
    await connection.openBox("INBOX");

    // Build search criteria
    const searchCriteria: any[] = ["ALL"];
    if (since) {
      // Format date for IMAP SINCE query
      const sinceStr = since.toISOString().split("T")[0];
      searchCriteria.push(["SINCE", sinceStr]);
    }

    const fetchOptions = {
      bodies: ["HEADER", "TEXT", ""],
      struct: true,
      markSeen: false,
    };

    const messages = await connection.search(searchCriteria, fetchOptions);
    const emails: ParsedEmail[] = [];

    for (const message of messages) {
      try {
        const all = message.parts.find((p: any) => p.which === "");
        if (!all) continue;

        const parsed: ParsedMail = await simpleParser(all.body);

        // Extract sender email
        const fromAddress = parsed.from?.value?.[0]?.address || "";
        const toAddress = parsed.to
          ? Array.isArray(parsed.to)
            ? parsed.to[0]?.value?.[0]?.address || ""
            : parsed.to.value?.[0]?.address || ""
          : "";

        emails.push({
          messageId: parsed.messageId || `${Date.now()}-${Math.random()}`,
          from: fromAddress,
          to: toAddress,
          subject: parsed.subject || "(No Subject)",
          bodyText: parsed.text || null,
          bodyHtml: parsed.html || null,
          date: parsed.date || new Date(),
          inReplyTo: parsed.inReplyTo || null,
        });
      } catch (parseError) {
        console.error("Failed to parse email:", parseError);
      }
    }

    return emails;
  } finally {
    if (connection) {
      connection.end();
    }
  }
}

/**
 * Test IMAP connection
 */
export async function testImapConnection(config: ImapConfig): Promise<{ success: boolean; error?: string }> {
  const imapConfig = {
    imap: {
      user: config.user,
      password: config.password,
      host: config.host,
      port: config.port,
      tls: config.secure,
      authTimeout: 10000,
      tlsOptions: { rejectUnauthorized: false },
    },
  };

  let connection: imaps.ImapSimple | null = null;

  try {
    connection = await imaps.connect(imapConfig);
    await connection.openBox("INBOX");
    return { success: true };
  } catch (error) {
    console.error("IMAP test failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  } finally {
    if (connection) {
      connection.end();
    }
  }
}

/**
 * Sync emails for a dealership - fetches new emails and stores them
 */
export async function syncDealershipEmails(dealershipId: string): Promise<{
  success: boolean;
  newEmails: number;
  newLeads: number;
  error?: string;
}> {
  try {
    const dealership = await prisma.dealership.findUnique({
      where: { id: dealershipId },
    });

    if (!dealership) {
      return { success: false, newEmails: 0, newLeads: 0, error: "Dealership not found" };
    }

    if (!dealership.emailSyncEnabled) {
      return { success: false, newEmails: 0, newLeads: 0, error: "Email sync not enabled" };
    }

    const since = dealership.lastEmailSync || undefined;
    const emails = await fetchNewEmails(dealership, since);

    let newEmailCount = 0;
    let newLeadCount = 0;

    for (const email of emails) {
      // Check if we already have this email
      const existing = await prisma.email.findFirst({
        where: {
          dealershipId,
          messageId: email.messageId,
        },
      });

      if (existing) continue;

      let leadId: string | null = null;
      let isNewLead = false;

      // Check if this is a form submission email
      const isFormEmail = isFormSubmissionEmail(email.subject, email.from);

      if (isFormEmail) {
        // Parse the form email to extract lead data
        const parsedData = parseFormEmail(
          email.from,
          email.subject,
          email.bodyHtml,
          email.bodyText
        );

        // Only create lead if we got at least an email or phone
        if (parsedData.email || parsedData.phone) {
          // Check for existing lead with this email
          const existingLead = parsedData.email
            ? await prisma.lead.findFirst({
                where: {
                  dealershipId,
                  OR: [
                    { primaryEmail: parsedData.email.toLowerCase() },
                    { alternateEmails: { has: parsedData.email.toLowerCase() } },
                  ],
                },
              })
            : null;

          if (existingLead) {
            leadId = existingLead.id;
          } else {
            // Create new lead from form submission
            // Notes only contain the user's message - tracking info is in the email

            // If we have an IP but no city/state, try to look it up
            let city = parsedData.city || null;
            let state = parsedData.state || null;
            let zip = parsedData.zip || null;

            if (parsedData.ipAddress && (!city || !state)) {
              const geoResult = await getLocationFromIp(parsedData.ipAddress);
              if (geoResult.success) {
                // Only fill in missing fields - don't overwrite form data
                if (!city && geoResult.city) city = geoResult.city;
                if (!state) {
                  // Prefer state code (e.g., "FL") over full name
                  state = geoResult.stateCode || geoResult.state || null;
                }
                if (!zip && geoResult.zip) zip = geoResult.zip;
              }
            }

            // Get the next salesperson via round-robin
            const nextSalesperson = await getNextSalesperson(
              dealershipId,
              dealership.lastLeadAssignedToId
            );

            const newLead = await prisma.lead.create({
              data: {
                dealershipId,
                assignedToId: nextSalesperson?.id || null,
                firstName: parsedData.firstName || null,
                lastName: parsedData.lastName || null,
                primaryEmail: parsedData.email?.toLowerCase() || null,
                primaryPhone: parsedData.phone || null,
                interestedVehicle: parsedData.interestedVehicle || null,
                notes: parsedData.message || null,
                city,
                state,
                zip,
                sourceIp: parsedData.ipAddress || null,
                source: "website_form",
                stage: "new_lead",
                winProbability: 0.1,
                // Meta Ads tracking
                metaCampaignId: parsedData.metaCampaignId || null,
                metaAdsetId: parsedData.metaAdsetId || null,
                metaAdId: parsedData.metaAdId || null,
                metaAccountId: parsedData.metaAccountId || null,
                utmCampaign: parsedData.utmCampaign || null,
                utmSource: parsedData.utmSource || null,
                utmMedium: parsedData.utmMedium || null,
              },
            });

            // Update the dealership's round-robin tracker
            if (nextSalesperson) {
              await prisma.dealership.update({
                where: { id: dealershipId },
                data: { lastLeadAssignedToId: nextSalesperson.id },
              });
            }

            leadId = newLead.id;
            isNewLead = true;
            newLeadCount++;
          }
        }
      } else {
        // Regular email - try to match to existing lead by sender
        const lead = await prisma.lead.findFirst({
          where: {
            dealershipId,
            OR: [
              { primaryEmail: email.from.toLowerCase() },
              { alternateEmails: { has: email.from.toLowerCase() } },
            ],
          },
        });
        leadId = lead?.id || null;
      }

      // Store the email
      const savedEmail = await prisma.email.create({
        data: {
          dealershipId,
          leadId,
          direction: "inbound",
          fromAddress: email.from,
          toAddress: email.to,
          subject: email.subject,
          bodyText: email.bodyText,
          bodyHtml: email.bodyHtml,
          messageId: email.messageId,
          inReplyTo: email.inReplyTo,
          createdAt: email.date,
        },
      });

      // Create activity if linked to lead
      if (leadId) {
        await prisma.activity.create({
          data: {
            leadId,
            activityType: "email_received",
            details: {
              emailId: savedEmail.id,
              subject: email.subject,
              from: email.from,
              isNewLead,
              isFormSubmission: isFormEmail,
            },
          },
        });
      }

      newEmailCount++;
    }

    // Update last sync time
    await prisma.dealership.update({
      where: { id: dealershipId },
      data: { lastEmailSync: new Date() },
    });

    return { success: true, newEmails: newEmailCount, newLeads: newLeadCount };
  } catch (error) {
    console.error("Email sync failed:", error);
    return {
      success: false,
      newEmails: 0,
      newLeads: 0,
      error: error instanceof Error ? error.message : "Sync failed",
    };
  }
}
