import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create Prisma adapter and client
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Create a dealership
  const dealership = await prisma.dealership.upsert({
    where: { id: "demo-dealership-1" },
    update: {
      city: "Chicago",
      state: "IL",
      zip: "60601",
    },
    create: {
      id: "demo-dealership-1",
      name: "Classic Cars of Chicago",
      address: "123 Auto Drive",
      city: "Chicago",
      state: "IL",
      zip: "60601",
      phone: "(312) 555-0100",
      settings: {},
    },
  });

  console.log(`Created dealership: ${dealership.name}`);

  // Create an agency admin
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@fcapp.com" },
    update: {},
    create: {
      email: "admin@fcapp.com",
      passwordHash: adminPassword,
      name: "Agency Admin",
      role: "agency_admin",
      dealershipId: null,
    },
  });

  console.log(`Created admin user: ${admin.email}`);

  // Create a dealership manager
  const managerPassword = await bcrypt.hash("manager123", 12);
  const manager = await prisma.user.upsert({
    where: { email: "manager@classiccars.com" },
    update: {},
    create: {
      email: "manager@classiccars.com",
      passwordHash: managerPassword,
      name: "Jane Manager",
      role: "manager",
      dealershipId: dealership.id,
      voipExtension: "100",
    },
  });

  console.log(`Created manager: ${manager.email}`);

  // Create a salesperson
  const salesPassword = await bcrypt.hash("sales123", 12);
  const salesperson = await prisma.user.upsert({
    where: { email: "john@classiccars.com" },
    update: {},
    create: {
      email: "john@classiccars.com",
      passwordHash: salesPassword,
      name: "John Smith",
      role: "salesperson",
      dealershipId: dealership.id,
      voipExtension: "101",
    },
  });

  console.log(`Created salesperson: ${salesperson.email}`);

  // Create some sample leads
  const leads = [
    {
      firstName: "Michael",
      lastName: "Johnson",
      primaryEmail: "michael.j@email.com",
      primaryPhone: "(555) 123-4567",
      interestedVehicle: "1967 Ford Mustang Fastback",
      source: "meta_ad" as const,
      stage: "new_lead" as const,
      city: "Oak Park",
      state: "IL",
    },
    {
      firstName: "Sarah",
      lastName: "Williams",
      primaryEmail: "sarah.w@email.com",
      primaryPhone: "(555) 234-5678",
      interestedVehicle: "1969 Chevrolet Camaro SS",
      source: "website_form" as const,
      stage: "interested" as const,
      city: "Naperville",
      state: "IL",
    },
    {
      firstName: "Robert",
      lastName: "Davis",
      primaryEmail: "robert.d@email.com",
      primaryPhone: "(555) 345-6789",
      interestedVehicle: "1970 Plymouth Barracuda",
      source: "phone_call" as const,
      stage: "negotiating" as const,
      city: "Evanston",
      state: "IL",
    },
    {
      firstName: "Jennifer",
      lastName: "Miller",
      primaryEmail: "jennifer.m@email.com",
      primaryPhone: "(555) 456-7890",
      interestedVehicle: "1965 Shelby Cobra",
      source: "referral" as const,
      stage: "buyers_order_sent" as const,
      city: "Schaumburg",
      state: "IL",
    },
    {
      firstName: "David",
      lastName: "Garcia",
      primaryEmail: "david.g@email.com",
      primaryPhone: "(555) 567-8901",
      interestedVehicle: "1971 Dodge Challenger R/T",
      source: "meta_ad" as const,
      stage: "new_lead" as const,
      city: "Arlington Heights",
      state: "IL",
    },
  ];

  for (const leadData of leads) {
    const winProbabilities: Record<string, number> = {
      new_lead: 0.10,
      interested: 0.20,
      negotiating: 0.40,
      buyers_order_sent: 0.60,
    };

    const lead = await prisma.lead.upsert({
      where: {
        dealershipId_primaryEmail: {
          dealershipId: dealership.id,
          primaryEmail: leadData.primaryEmail,
        },
      },
      update: {},
      create: {
        dealershipId: dealership.id,
        assignedToId: salesperson.id,
        ...leadData,
        winProbability: winProbabilities[leadData.stage] || 0.10,
        nextFollowUpAt: leadData.stage === "new_lead" ? new Date() : null,
      },
    });

    // Create follow-up task for new leads
    if (leadData.stage === "new_lead") {
      await prisma.task.upsert({
        where: {
          id: `task-${lead.id}`,
        },
        update: {},
        create: {
          id: `task-${lead.id}`,
          leadId: lead.id,
          userId: salesperson.id,
          dealershipId: dealership.id,
          taskType: "follow_up_call",
          title: "Initial contact - Attempt 1 of 5",
          dueDate: new Date(),
          isAutoGenerated: true,
          attemptNumber: 1,
        },
      });
    }

    console.log(`Created lead: ${leadData.firstName} ${leadData.lastName}`);
  }

  console.log("\nSeed completed!");
  console.log("\nLogin credentials:");
  console.log("  Agency Admin: admin@fcapp.com / admin123");
  console.log("  Dealership Manager: manager@classiccars.com / manager123");
  console.log("  Salesperson: john@classiccars.com / sales123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
