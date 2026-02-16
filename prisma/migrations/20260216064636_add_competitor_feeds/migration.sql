-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "competitorFeeds" TEXT[] DEFAULT ARRAY[]::TEXT[];
