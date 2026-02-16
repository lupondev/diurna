-- CreateIndex
CREATE INDEX "Article_siteId_idx" ON "Article"("siteId");

-- CreateIndex
CREATE INDEX "Site_organizationId_idx" ON "Site"("organizationId");

-- CreateIndex
CREATE INDEX "Tag_siteId_idx" ON "Tag"("siteId");
