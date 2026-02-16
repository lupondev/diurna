/*
  Warnings:

  - You are about to drop the column `pageId` on the `SocialConnection` table. All the data in the column will be lost.
  - You are about to drop the column `pageName` on the `SocialConnection` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SocialConnection" DROP COLUMN "pageId",
DROP COLUMN "pageName",
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "refreshToken" TEXT;

-- CreateTable
CREATE TABLE "SocialPage" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "pageName" TEXT NOT NULL,
    "pageToken" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SocialPage_connectionId_pageId_key" ON "SocialPage"("connectionId", "pageId");

-- AddForeignKey
ALTER TABLE "SocialPage" ADD CONSTRAINT "SocialPage_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "SocialConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
