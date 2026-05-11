-- DropIndex
DROP INDEX IF EXISTS "User_googleId_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN IF EXISTS "googleId",
ALTER COLUMN "passwordHash" SET NOT NULL;
