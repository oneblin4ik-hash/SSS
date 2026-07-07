-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "targetChannel" TEXT,
    "defaultTone" TEXT NOT NULL DEFAULT 'Дружелюбный, по делу',
    "safetyMode" TEXT NOT NULL DEFAULT 'BALANCED',
    "autoPauseOnRisk" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TelegramAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "username" TEXT,
    "sessionEnc" TEXT,
    "proxyId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONNECTING',
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "lastRiskReason" TEXT,
    "floodUntil" DATETIME,
    "toneStyle" TEXT NOT NULL DEFAULT 'Дружелюбный, по делу',
    "systemPrompt" TEXT,
    "dailyReplyLimit" INTEGER NOT NULL DEFAULT 20,
    "autoReplyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoReplyNextTickAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCheckedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TelegramAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TelegramAccount_proxyId_fkey" FOREIGN KEY ("proxyId") REFERENCES "Proxy" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Proxy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "username" TEXT,
    "password" TEXT,
    "secret" TEXT,
    "label" TEXT,
    CONSTRAINT "Proxy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MonitoredSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "tgId" TEXT,
    "title" TEXT NOT NULL,
    "username" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastScanAt" DATETIME,
    "autoComment" BOOLEAN NOT NULL DEFAULT false,
    "autoAccountIds" TEXT NOT NULL DEFAULT '[]',
    "autoDailyLimit" INTEGER NOT NULL DEFAULT 10,
    "autoTone" TEXT,
    "autoNextScanAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MonitoredSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FoundMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "tgChatId" TEXT NOT NULL,
    "tgMessageId" TEXT NOT NULL,
    "authorName" TEXT,
    "authorTgId" TEXT,
    "authorUsername" TEXT,
    "text" TEXT NOT NULL,
    "postedAt" DATETIME NOT NULL,
    "matchedKeywords" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FoundMessage_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "MonitoredSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DraftReply" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "foundMessageId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "variants" TEXT NOT NULL DEFAULT '[]',
    "editedContent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "aiModel" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" DATETIME,
    "tgMessageId" TEXT,
    CONSTRAINT "DraftReply_foundMessageId_fkey" FOREIGN KEY ("foundMessageId") REFERENCES "FoundMessage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DraftReply_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TelegramAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Keyword" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Keyword_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "peerTgId" TEXT NOT NULL,
    "peerUsername" TEXT,
    "peerName" TEXT,
    "peerAccessHash" TEXT,
    "autoReply" BOOLEAN NOT NULL DEFAULT true,
    "unread" BOOLEAN NOT NULL DEFAULT true,
    "lastMessageAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Conversation_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TelegramAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "tgMessageId" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Audience" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceRef" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Audience_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AudienceContact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "audienceId" TEXT NOT NULL,
    "tgUserId" TEXT NOT NULL,
    "username" TEXT,
    "name" TEXT,
    CONSTRAINT "AudienceContact_audienceId_fkey" FOREIGN KEY ("audienceId") REFERENCES "Audience" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "targets" TEXT NOT NULL DEFAULT '[]',
    "emoji" TEXT,
    "reactCount" INTEGER NOT NULL DEFAULT 3,
    "audienceId" TEXT,
    "message" TEXT,
    "accountIds" TEXT NOT NULL DEFAULT '[]',
    "perAccountLimit" INTEGER NOT NULL DEFAULT 30,
    "cursor" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "pauseMinSec" INTEGER,
    "pauseMaxSec" INTEGER,
    "lastTickAt" DATETIME,
    "nextTickAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Campaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Campaign_audienceId_fkey" FOREIGN KEY ("audienceId") REFERENCES "Audience" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampaignLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "detail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampaignLog_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignLog_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TelegramAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WarmupPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentDay" INTEGER NOT NULL DEFAULT 1,
    "totalDays" INTEGER NOT NULL DEFAULT 21,
    "actionsToday" INTEGER NOT NULL DEFAULT 0,
    "totalActions" INTEGER NOT NULL DEFAULT 0,
    "dayStartedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "channels" TEXT NOT NULL DEFAULT '[]',
    "lastTickAt" DATETIME,
    "nextTickAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WarmupPlan_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TelegramAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WarmupPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WarmupLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "detail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WarmupLog_planId_fkey" FOREIGN KEY ("planId") REFERENCES "WarmupPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "accountId" TEXT,
    "draftReplyId" TEXT,
    "trackedLinkId" TEXT,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalyticsEvent_draftReplyId_fkey" FOREIGN KEY ("draftReplyId") REFERENCES "DraftReply" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AnalyticsEvent_trackedLinkId_fkey" FOREIGN KEY ("trackedLinkId") REFERENCES "TrackedLink" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrackedLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accountId" TEXT,
    "slug" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "label" TEXT,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrackedLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TrackedLink_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TelegramAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContactTouch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tgUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContactTouch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "TelegramAccount_userId_idx" ON "TelegramAccount"("userId");

-- CreateIndex
CREATE INDEX "TelegramAccount_autoReplyEnabled_autoReplyNextTickAt_idx" ON "TelegramAccount"("autoReplyEnabled", "autoReplyNextTickAt");

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
CREATE INDEX "Conversation_accountId_lastMessageAt_idx" ON "Conversation"("accountId", "lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_accountId_peerTgId_key" ON "Conversation"("accountId", "peerTgId");

-- CreateIndex
CREATE INDEX "ChatMessage_conversationId_createdAt_idx" ON "ChatMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChatMessage_conversationId_tgMessageId_key" ON "ChatMessage"("conversationId", "tgMessageId");

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
