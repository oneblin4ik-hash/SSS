-- CreateEnum
CREATE TYPE "SafetyMode" AS ENUM ('CONSERVATIVE', 'BALANCED', 'AGGRESSIVE');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('CONNECTING', 'ACTIVE', 'WARMING', 'PAUSED', 'ERROR', 'BANNED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ProxyType" AS ENUM ('SOCKS5', 'HTTP', 'MTPROTO');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('CHANNEL', 'GROUP');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('NEW', 'DRAFTED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('PENDING', 'APPROVED', 'PUBLISHED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('REACTION', 'MAILING', 'INVITE', 'STORY_VIEW');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "targetChannel" TEXT,
    "defaultTone" TEXT NOT NULL DEFAULT 'Дружелюбный, по делу',
    "safetyMode" "SafetyMode" NOT NULL DEFAULT 'BALANCED',
    "autoPauseOnRisk" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "username" TEXT,
    "sessionEnc" TEXT,
    "proxyId" TEXT,
    "status" "AccountStatus" NOT NULL DEFAULT 'CONNECTING',
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "lastRiskReason" TEXT,
    "floodUntil" TIMESTAMP(3),
    "toneStyle" TEXT NOT NULL DEFAULT 'Дружелюбный, по делу',
    "systemPrompt" TEXT,
    "dailyReplyLimit" INTEGER NOT NULL DEFAULT 20,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proxy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ProxyType" NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "username" TEXT,
    "password" TEXT,
    "secret" TEXT,
    "label" TEXT,

    CONSTRAINT "Proxy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitoredSource" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "tgId" TEXT,
    "title" TEXT NOT NULL,
    "username" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastScanAt" TIMESTAMP(3),
    "autoComment" BOOLEAN NOT NULL DEFAULT false,
    "autoAccountIds" TEXT[],
    "autoDailyLimit" INTEGER NOT NULL DEFAULT 10,
    "autoTone" TEXT,
    "autoNextScanAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonitoredSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoundMessage" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "tgChatId" TEXT NOT NULL,
    "tgMessageId" TEXT NOT NULL,
    "authorName" TEXT,
    "authorTgId" TEXT,
    "authorUsername" TEXT,
    "text" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL,
    "matchedKeywords" TEXT[],
    "status" "MessageStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FoundMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftReply" (
    "id" TEXT NOT NULL,
    "foundMessageId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "variants" TEXT[],
    "editedContent" TEXT,
    "status" "DraftStatus" NOT NULL DEFAULT 'PENDING',
    "aiModel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "tgMessageId" TEXT,

    CONSTRAINT "DraftReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Keyword" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Keyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Audience" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceRef" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Audience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudienceContact" (
    "id" TEXT NOT NULL,
    "audienceId" TEXT NOT NULL,
    "tgUserId" TEXT NOT NULL,
    "username" TEXT,
    "name" TEXT,

    CONSTRAINT "AudienceContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CampaignType" NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "targets" TEXT[],
    "emoji" TEXT,
    "reactCount" INTEGER NOT NULL DEFAULT 3,
    "audienceId" TEXT,
    "message" TEXT,
    "accountIds" TEXT[],
    "perAccountLimit" INTEGER NOT NULL DEFAULT 30,
    "cursor" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "pauseMinSec" INTEGER,
    "pauseMaxSec" INTEGER,
    "lastTickAt" TIMESTAMP(3),
    "nextTickAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignLog" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarmupPlan" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentDay" INTEGER NOT NULL DEFAULT 1,
    "totalDays" INTEGER NOT NULL DEFAULT 21,
    "actionsToday" INTEGER NOT NULL DEFAULT 0,
    "totalActions" INTEGER NOT NULL DEFAULT 0,
    "dayStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "channels" TEXT[],
    "lastTickAt" TIMESTAMP(3),
    "nextTickAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WarmupPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarmupLog" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WarmupLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "accountId" TEXT,
    "draftReplyId" TEXT,
    "trackedLinkId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackedLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT,
    "slug" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "label" TEXT,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackedLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactTouch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tgUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactTouch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "TelegramAccount_userId_idx" ON "TelegramAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramAccount_userId_phone_key" ON "TelegramAccount"("userId", "phone");

-- CreateIndex
CREATE INDEX "Proxy_userId_idx" ON "Proxy"("userId");

-- CreateIndex
CREATE INDEX "MonitoredSource_userId_idx" ON "MonitoredSource"("userId");

-- CreateIndex
CREATE INDEX "MonitoredSource_autoComment_autoNextScanAt_idx" ON "MonitoredSource"("autoComment", "autoNextScanAt");

-- CreateIndex
CREATE INDEX "FoundMessage_sourceId_idx" ON "FoundMessage"("sourceId");

-- CreateIndex
CREATE INDEX "FoundMessage_status_idx" ON "FoundMessage"("status");

-- CreateIndex
CREATE UNIQUE INDEX "FoundMessage_tgChatId_tgMessageId_key" ON "FoundMessage"("tgChatId", "tgMessageId");

-- CreateIndex
CREATE INDEX "DraftReply_status_idx" ON "DraftReply"("status");

-- CreateIndex
CREATE INDEX "DraftReply_accountId_idx" ON "DraftReply"("accountId");

-- CreateIndex
CREATE INDEX "Keyword_userId_idx" ON "Keyword"("userId");

-- CreateIndex
CREATE INDEX "Audience_userId_idx" ON "Audience"("userId");

-- CreateIndex
CREATE INDEX "AudienceContact_audienceId_idx" ON "AudienceContact"("audienceId");

-- CreateIndex
CREATE INDEX "Campaign_userId_idx" ON "Campaign"("userId");

-- CreateIndex
CREATE INDEX "Campaign_status_nextTickAt_idx" ON "Campaign"("status", "nextTickAt");

-- CreateIndex
CREATE INDEX "CampaignLog_campaignId_idx" ON "CampaignLog"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignLog_accountId_ok_createdAt_idx" ON "CampaignLog"("accountId", "ok", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WarmupPlan_accountId_key" ON "WarmupPlan"("accountId");

-- CreateIndex
CREATE INDEX "WarmupPlan_userId_idx" ON "WarmupPlan"("userId");

-- CreateIndex
CREATE INDEX "WarmupPlan_status_nextTickAt_idx" ON "WarmupPlan"("status", "nextTickAt");

-- CreateIndex
CREATE INDEX "WarmupLog_planId_idx" ON "WarmupLog"("planId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_type_idx" ON "AnalyticsEvent"("type");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_trackedLinkId_idx" ON "AnalyticsEvent"("trackedLinkId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackedLink_slug_key" ON "TrackedLink"("slug");

-- CreateIndex
CREATE INDEX "TrackedLink_userId_idx" ON "TrackedLink"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ContactTouch_userId_tgUserId_action_key" ON "ContactTouch"("userId", "tgUserId", "action");

-- AddForeignKey
ALTER TABLE "TelegramAccount" ADD CONSTRAINT "TelegramAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramAccount" ADD CONSTRAINT "TelegramAccount_proxyId_fkey" FOREIGN KEY ("proxyId") REFERENCES "Proxy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proxy" ADD CONSTRAINT "Proxy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoredSource" ADD CONSTRAINT "MonitoredSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoundMessage" ADD CONSTRAINT "FoundMessage_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "MonitoredSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftReply" ADD CONSTRAINT "DraftReply_foundMessageId_fkey" FOREIGN KEY ("foundMessageId") REFERENCES "FoundMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftReply" ADD CONSTRAINT "DraftReply_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TelegramAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Keyword" ADD CONSTRAINT "Keyword_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audience" ADD CONSTRAINT "Audience_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudienceContact" ADD CONSTRAINT "AudienceContact_audienceId_fkey" FOREIGN KEY ("audienceId") REFERENCES "Audience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_audienceId_fkey" FOREIGN KEY ("audienceId") REFERENCES "Audience"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignLog" ADD CONSTRAINT "CampaignLog_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignLog" ADD CONSTRAINT "CampaignLog_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TelegramAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarmupPlan" ADD CONSTRAINT "WarmupPlan_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TelegramAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarmupPlan" ADD CONSTRAINT "WarmupPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarmupLog" ADD CONSTRAINT "WarmupLog_planId_fkey" FOREIGN KEY ("planId") REFERENCES "WarmupPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_draftReplyId_fkey" FOREIGN KEY ("draftReplyId") REFERENCES "DraftReply"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_trackedLinkId_fkey" FOREIGN KEY ("trackedLinkId") REFERENCES "TrackedLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackedLink" ADD CONSTRAINT "TrackedLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackedLink" ADD CONSTRAINT "TrackedLink_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TelegramAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactTouch" ADD CONSTRAINT "ContactTouch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
