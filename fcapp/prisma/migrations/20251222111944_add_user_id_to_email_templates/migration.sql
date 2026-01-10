-- AlterTable
ALTER TABLE "email_templates" ADD COLUMN     "user_id" TEXT;

-- CreateIndex
CREATE INDEX "email_templates_user_id_idx" ON "email_templates"("user_id");

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
