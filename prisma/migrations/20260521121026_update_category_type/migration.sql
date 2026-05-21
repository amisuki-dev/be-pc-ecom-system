-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('GROUP', 'CATEGORY');

-- AlterTable
ALTER TABLE "category" ADD COLUMN     "type" "CategoryType" NOT NULL DEFAULT 'CATEGORY';
