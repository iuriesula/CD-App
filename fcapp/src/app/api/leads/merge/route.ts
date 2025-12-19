import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession, isAgencyAdmin } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { primaryLeadId, secondaryLeadId } = body;

    if (!primaryLeadId || !secondaryLeadId) {
      return NextResponse.json(
        { error: "Both primaryLeadId and secondaryLeadId are required" },
        { status: 400 }
      );
    }

    if (primaryLeadId === secondaryLeadId) {
      return NextResponse.json(
        { error: "Cannot merge a lead with itself" },
        { status: 400 }
      );
    }

    const whereClause = isAgencyAdmin(session.role) ? {} : { dealershipId: session.dealershipId };

    // Fetch both leads
    const [primaryLead, secondaryLead] = await Promise.all([
      prisma.lead.findFirst({
        where: { id: primaryLeadId, ...whereClause },
      }),
      prisma.lead.findFirst({
        where: { id: secondaryLeadId, ...whereClause },
      }),
    ]);

    if (!primaryLead || !secondaryLead) {
      return NextResponse.json(
        { error: "One or both leads not found" },
        { status: 404 }
      );
    }

    // Collect all contact info
    const allEmails = new Set<string>();
    const allPhones = new Set<string>();

    // Add primary lead's contacts
    if (primaryLead.primaryEmail) allEmails.add(primaryLead.primaryEmail);
    primaryLead.alternateEmails.forEach((e) => allEmails.add(e));
    if (primaryLead.primaryPhone) allPhones.add(primaryLead.primaryPhone);
    primaryLead.alternatePhones.forEach((p) => allPhones.add(p));

    // Add secondary lead's contacts
    if (secondaryLead.primaryEmail) allEmails.add(secondaryLead.primaryEmail);
    secondaryLead.alternateEmails.forEach((e) => allEmails.add(e));
    if (secondaryLead.primaryPhone) allPhones.add(secondaryLead.primaryPhone);
    secondaryLead.alternatePhones.forEach((p) => allPhones.add(p));

    // Primary email/phone stays from primary lead, rest goes to alternates
    const alternateEmails = Array.from(allEmails).filter(
      (e) => e !== primaryLead.primaryEmail
    );
    const alternatePhones = Array.from(allPhones).filter(
      (p) => p !== primaryLead.primaryPhone
    );

    // Combine interested vehicles
    const vehicles: string[] = [];
    if (primaryLead.interestedVehicle) vehicles.push(primaryLead.interestedVehicle);
    if (secondaryLead.interestedVehicle && secondaryLead.interestedVehicle !== primaryLead.interestedVehicle) {
      vehicles.push(secondaryLead.interestedVehicle);
    }
    const combinedVehicles = vehicles.join("; ");

    // Combine notes
    let combinedNotes = primaryLead.notes || "";
    if (secondaryLead.notes) {
      if (combinedNotes) {
        combinedNotes += `\n\n--- Merged from ${secondaryLead.firstName || ""} ${secondaryLead.lastName || ""} ---\n${secondaryLead.notes}`;
      } else {
        combinedNotes = secondaryLead.notes;
      }
    }

    // Use best available name
    const firstName = primaryLead.firstName || secondaryLead.firstName;
    const lastName = primaryLead.lastName || secondaryLead.lastName;

    // Use best available location
    const city = primaryLead.city || secondaryLead.city;
    const state = primaryLead.state || secondaryLead.state;
    const zip = primaryLead.zip || secondaryLead.zip;

    // Perform merge in a transaction
    const mergedLead = await prisma.$transaction(async (tx) => {
      // Update primary lead with merged data
      const updated = await tx.lead.update({
        where: { id: primaryLeadId },
        data: {
          firstName,
          lastName,
          alternateEmails,
          alternatePhones,
          interestedVehicle: combinedVehicles || primaryLead.interestedVehicle,
          notes: combinedNotes || null,
          city,
          state,
          zip,
          attemptCount: primaryLead.attemptCount + secondaryLead.attemptCount,
        },
      });

      // Move activities from secondary to primary
      await tx.activity.updateMany({
        where: { leadId: secondaryLeadId },
        data: { leadId: primaryLeadId },
      });

      // Move tasks from secondary to primary
      await tx.task.updateMany({
        where: { leadId: secondaryLeadId },
        data: { leadId: primaryLeadId },
      });

      // Log the merge as an activity
      await tx.activity.create({
        data: {
          leadId: primaryLeadId,
          userId: session.id,
          activityType: "note_added",
          details: {
            note: `Merged with lead: ${secondaryLead.firstName || ""} ${secondaryLead.lastName || ""} (${secondaryLead.primaryEmail || secondaryLead.primaryPhone || "unknown"})`,
            mergedLeadId: secondaryLeadId,
          },
        },
      });

      // Delete the secondary lead
      await tx.lead.delete({
        where: { id: secondaryLeadId },
      });

      return updated;
    });

    return NextResponse.json({
      lead: mergedLead,
      message: "Leads merged successfully",
    });
  } catch (error) {
    console.error("Failed to merge leads:", error);
    return NextResponse.json(
      { error: "Failed to merge leads" },
      { status: 500 }
    );
  }
}
