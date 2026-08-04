-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "profiles" (
    "user_id" UUID NOT NULL,
    "display_name" VARCHAR(80),
    "avatar_url" TEXT,
    "bio" VARCHAR(500),
    "locale" TEXT,
    "timezone" TEXT,
    "phone" TEXT,
    "address_json" JSONB,
    "profile_visibility" TEXT NOT NULL DEFAULT 'private',
    "notification_preferences_json" JSONB,
    "privacy_settings_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deletion_requested_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "anonymized_at" TIMESTAMP(3),

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "user_consents" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "purpose" TEXT NOT NULL,
    "legal_basis" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "notice_version" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawn_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "actor_subject" UUID NOT NULL,
    "actor_client_id" TEXT,
    "action" TEXT NOT NULL,
    "changed_fields" TEXT[],
    "decision" TEXT NOT NULL,
    "reason" TEXT,
    "request_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "privacy_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "request_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "privacy_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_consents_user_id_purpose_created_at_idx" ON "user_consents"("user_id", "purpose", "created_at");

-- CreateIndex
CREATE INDEX "profile_audit_logs_user_id_created_at_idx" ON "profile_audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "privacy_requests_user_id_requested_at_idx" ON "privacy_requests"("user_id", "requested_at");

