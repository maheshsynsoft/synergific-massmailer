-- AlterTable
ALTER TABLE "Contact" ADD COLUMN "category" TEXT;
ALTER TABLE "Contact" ADD COLUMN "city" TEXT;
ALTER TABLE "Contact" ADD COLUMN "country" TEXT;
ALTER TABLE "Contact" ADD COLUMN "department" TEXT;
ALTER TABLE "Contact" ADD COLUMN "designation" TEXT;
ALTER TABLE "Contact" ADD COLUMN "industry" TEXT;
ALTER TABLE "Contact" ADD COLUMN "lastDeliveryStatus" TEXT;
ALTER TABLE "Contact" ADD COLUMN "type" TEXT;

-- CreateTable
CREATE TABLE "ScheduledEmail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "templateId" TEXT,
    "contactIds" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "scheduledAt" DATETIME NOT NULL,
    "sentAt" DATETIME,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "autoFollowUp" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "ScheduledEmail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Suppression" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "source" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Suppression_email_key" ON "Suppression"("email");

-- CreateIndex
CREATE INDEX "Suppression_reason_idx" ON "Suppression"("reason");

-- CreateIndex
CREATE INDEX "Contact_type_idx" ON "Contact"("type");
