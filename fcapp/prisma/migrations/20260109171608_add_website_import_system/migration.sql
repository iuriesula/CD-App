-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('pending', 'discovering', 'importing', 'completed', 'failed', 'cancelled');

-- AlterTable
ALTER TABLE "dealerships" ADD COLUMN     "last_import_at" TIMESTAMP(3),
ADD COLUMN     "website_listing_path" TEXT;

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "imported_at" TIMESTAMP(3),
ADD COLUMN     "source_url" TEXT;

-- CreateTable
CREATE TABLE "website_import_jobs" (
    "id" TEXT NOT NULL,
    "dealership_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'pending',
    "website_url" TEXT NOT NULL,
    "listing_path" TEXT NOT NULL DEFAULT '/listing/',
    "total_vehicles" INTEGER,
    "processed_count" INTEGER NOT NULL DEFAULT 0,
    "created_count" INTEGER NOT NULL DEFAULT 0,
    "updated_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "logs" JSONB NOT NULL DEFAULT '[]',
    "errors" JSONB NOT NULL DEFAULT '[]',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "website_import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "website_import_jobs_dealership_id_idx" ON "website_import_jobs"("dealership_id");

-- CreateIndex
CREATE INDEX "website_import_jobs_status_idx" ON "website_import_jobs"("status");

-- AddForeignKey
ALTER TABLE "website_import_jobs" ADD CONSTRAINT "website_import_jobs_dealership_id_fkey" FOREIGN KEY ("dealership_id") REFERENCES "dealerships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_import_jobs" ADD CONSTRAINT "website_import_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
