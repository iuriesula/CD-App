-- CreateEnum
CREATE TYPE "ContractorDepartment" AS ENUM ('it', 'marketing', 'content');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "RequestPriority" AS ENUM ('low', 'normal', 'high', 'urgent');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'contractor';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "contractor_department" "ContractorDepartment";

-- CreateTable
CREATE TABLE "contractor_dealership_access" (
    "id" TEXT NOT NULL,
    "contractor_id" TEXT NOT NULL,
    "dealership_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT,

    CONSTRAINT "contractor_dealership_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requests" (
    "id" TEXT NOT NULL,
    "dealership_id" TEXT NOT NULL,
    "department" "ContractorDepartment" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "RequestPriority" NOT NULL DEFAULT 'normal',
    "status" "RequestStatus" NOT NULL DEFAULT 'open',
    "requested_by_id" TEXT,
    "assigned_to_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_messages" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_attachments" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "message_id" TEXT,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contractor_dealership_access_contractor_id_idx" ON "contractor_dealership_access"("contractor_id");

-- CreateIndex
CREATE INDEX "contractor_dealership_access_dealership_id_idx" ON "contractor_dealership_access"("dealership_id");

-- CreateIndex
CREATE UNIQUE INDEX "contractor_dealership_access_contractor_id_dealership_id_key" ON "contractor_dealership_access"("contractor_id", "dealership_id");

-- CreateIndex
CREATE INDEX "requests_dealership_id_idx" ON "requests"("dealership_id");

-- CreateIndex
CREATE INDEX "requests_department_idx" ON "requests"("department");

-- CreateIndex
CREATE INDEX "requests_status_idx" ON "requests"("status");

-- CreateIndex
CREATE INDEX "requests_assigned_to_id_idx" ON "requests"("assigned_to_id");

-- CreateIndex
CREATE INDEX "requests_created_at_idx" ON "requests"("created_at");

-- CreateIndex
CREATE INDEX "request_messages_request_id_idx" ON "request_messages"("request_id");

-- CreateIndex
CREATE INDEX "request_messages_created_at_idx" ON "request_messages"("created_at");

-- CreateIndex
CREATE INDEX "request_attachments_request_id_idx" ON "request_attachments"("request_id");

-- CreateIndex
CREATE INDEX "request_attachments_message_id_idx" ON "request_attachments"("message_id");

-- AddForeignKey
ALTER TABLE "contractor_dealership_access" ADD CONSTRAINT "contractor_dealership_access_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_dealership_access" ADD CONSTRAINT "contractor_dealership_access_dealership_id_fkey" FOREIGN KEY ("dealership_id") REFERENCES "dealerships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_dealership_id_fkey" FOREIGN KEY ("dealership_id") REFERENCES "dealerships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_messages" ADD CONSTRAINT "request_messages_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_messages" ADD CONSTRAINT "request_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_attachments" ADD CONSTRAINT "request_attachments_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_attachments" ADD CONSTRAINT "request_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "request_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
