-- CreateTable
CREATE TABLE "Subscriber" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),

    CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Subscriber_siteId_isActive_idx" ON "Subscriber"("siteId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_siteId_email_key" ON "Subscriber"("siteId", "email");

-- AddForeignKey
ALTER TABLE "Subscriber" ADD CONSTRAINT "Subscriber_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
