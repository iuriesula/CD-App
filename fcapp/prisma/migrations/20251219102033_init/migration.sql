-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'tech';
ALTER TYPE "UserRole" ADD VALUE 'content_creator';

-- AlterTable
ALTER TABLE "dealerships" ADD COLUMN     "brand_color" TEXT,
ADD COLUMN     "contact_emails" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "email" TEXT,
ADD COLUMN     "email_from_address" TEXT,
ADD COLUMN     "email_from_name" TEXT,
ADD COLUMN     "email_sync_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "imap_host" TEXT,
ADD COLUMN     "imap_password" TEXT,
ADD COLUMN     "imap_port" INTEGER,
ADD COLUMN     "imap_secure" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "imap_user" TEXT,
ADD COLUMN     "last_email_sync" TIMESTAMP(3),
ADD COLUMN     "last_lead_assigned_to_id" TEXT,
ADD COLUMN     "logo_url" TEXT,
ADD COLUMN     "phones" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "smtp_host" TEXT,
ADD COLUMN     "smtp_password" TEXT,
ADD COLUMN     "smtp_port" INTEGER,
ADD COLUMN     "smtp_secure" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "smtp_user" TEXT,
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "emails" ADD COLUMN     "folder" TEXT,
ADD COLUMN     "is_important" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "meta_account_id" TEXT,
ADD COLUMN     "source_ip" TEXT,
ADD COLUMN     "utm_campaign" TEXT,
ADD COLUMN     "utm_medium" TEXT,
ADD COLUMN     "utm_source" TEXT,
ADD COLUMN     "vehicle_id" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "must_change_password" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "call_script" TEXT,
ADD COLUMN     "technical_bulletpoints" TEXT,
ADD COLUMN     "website_description" TEXT;

-- CreateTable
CREATE TABLE "dealership_media" (
    "id" TEXT NOT NULL,
    "dealership_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mime_type" TEXT,
    "size" INTEGER,
    "folder" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dealership_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "dealership_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body_html" TEXT NOT NULL,
    "body_text" TEXT,
    "category" TEXT NOT NULL DEFAULT 'custom',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_signatures" (
    "id" TEXT NOT NULL,
    "dealership_id" TEXT NOT NULL,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dealership_media_dealership_id_idx" ON "dealership_media"("dealership_id");

-- CreateIndex
CREATE INDEX "dealership_media_dealership_id_folder_idx" ON "dealership_media"("dealership_id", "folder");

-- CreateIndex
CREATE INDEX "email_templates_dealership_id_idx" ON "email_templates"("dealership_id");

-- CreateIndex
CREATE INDEX "email_signatures_dealership_id_idx" ON "email_signatures"("dealership_id");

-- CreateIndex
CREATE INDEX "email_signatures_user_id_idx" ON "email_signatures"("user_id");

-- CreateIndex
CREATE INDEX "emails_folder_idx" ON "emails"("folder");

-- CreateIndex
CREATE INDEX "emails_is_important_idx" ON "emails"("is_important");

-- CreateIndex
CREATE INDEX "leads_vehicle_id_idx" ON "leads"("vehicle_id");

-- AddForeignKey
ALTER TABLE "dealership_media" ADD CONSTRAINT "dealership_media_dealership_id_fkey" FOREIGN KEY ("dealership_id") REFERENCES "dealerships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_dealership_id_fkey" FOREIGN KEY ("dealership_id") REFERENCES "dealerships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_signatures" ADD CONSTRAINT "email_signatures_dealership_id_fkey" FOREIGN KEY ("dealership_id") REFERENCES "dealerships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_signatures" ADD CONSTRAINT "email_signatures_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
