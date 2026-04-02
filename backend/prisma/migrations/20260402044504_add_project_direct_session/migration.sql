/*
  Warnings:

  - Added the required column `project_id` to the `sessions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "project_id" UUID NOT NULL,
ALTER COLUMN "folder_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "sessions_project_id_idx" ON "sessions"("project_id");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
