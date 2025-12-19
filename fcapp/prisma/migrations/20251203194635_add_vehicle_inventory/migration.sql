-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('available', 'pending', 'sold', 'reserved');

-- AlterTable
ALTER TABLE "dealerships" ADD COLUMN     "city" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "zip" TEXT;

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "dealership_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "trim" TEXT,
    "vin" TEXT,
    "asking_price" DECIMAL(12,2),
    "sold_price" DECIMAL(12,2),
    "status" "VehicleStatus" NOT NULL DEFAULT 'available',
    "mileage" INTEGER,
    "exterior_color" TEXT,
    "interior_color" TEXT,
    "transmission" TEXT,
    "engine" TEXT,
    "description" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "location_city" TEXT,
    "location_state" TEXT,
    "location_zip" TEXT,
    "stock_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "sold_at" TIMESTAMP(3),

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_vin_key" ON "vehicles"("vin");

-- CreateIndex
CREATE INDEX "vehicles_dealership_id_idx" ON "vehicles"("dealership_id");

-- CreateIndex
CREATE INDEX "vehicles_status_idx" ON "vehicles"("status");

-- CreateIndex
CREATE INDEX "vehicles_make_model_idx" ON "vehicles"("make", "model");

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_dealership_id_fkey" FOREIGN KEY ("dealership_id") REFERENCES "dealerships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
