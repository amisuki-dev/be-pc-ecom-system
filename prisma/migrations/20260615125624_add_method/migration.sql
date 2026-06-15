-- CreateEnum
CREATE TYPE "MethodType" AS ENUM ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS');

-- AlterTable
ALTER TABLE "permission" ADD COLUMN     "method" "MethodType" NOT NULL DEFAULT 'OPTIONS';
