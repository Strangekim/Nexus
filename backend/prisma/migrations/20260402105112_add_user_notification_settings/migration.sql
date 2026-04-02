-- AlterTable
ALTER TABLE "users" ADD COLUMN     "notify_browser" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notify_sms" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notify_sound" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "phone" VARCHAR(20);
