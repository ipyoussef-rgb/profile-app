-- CreateTable: attribute_catalogs (admin-managed lists like personal_interests)
CREATE TABLE "attribute_catalogs" (
    "id"           UUID NOT NULL,
    "slug"         TEXT NOT NULL,
    "name_en"      TEXT NOT NULL,
    "name_de"      TEXT NOT NULL,
    "multi_select" BOOLEAN NOT NULL DEFAULT true,
    "active"       BOOLEAN NOT NULL DEFAULT true,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attribute_catalogs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "attribute_catalogs_slug_key" ON "attribute_catalogs"("slug");

-- CreateTable: attribute_catalog_values
CREATE TABLE "attribute_catalog_values" (
    "id"         UUID NOT NULL,
    "catalog_id" UUID NOT NULL,
    "slug"       TEXT NOT NULL,
    "label_en"   TEXT NOT NULL,
    "label_de"   TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active"     BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attribute_catalog_values_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "attribute_catalog_values_catalog_id_slug_key"
    ON "attribute_catalog_values"("catalog_id", "slug");
CREATE INDEX "attribute_catalog_values_catalog_id_active_sort_order_idx"
    ON "attribute_catalog_values"("catalog_id", "active", "sort_order");
ALTER TABLE "attribute_catalog_values"
    ADD CONSTRAINT "attribute_catalog_values_catalog_id_fkey"
    FOREIGN KEY ("catalog_id") REFERENCES "attribute_catalogs"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: user_attribute_values (user's selections per catalog)
CREATE TABLE "user_attribute_values" (
    "id"         UUID NOT NULL,
    "user_id"    UUID NOT NULL,
    "catalog_id" UUID NOT NULL,
    "value_id"   UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_attribute_values_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_attribute_values_user_id_catalog_id_value_id_key"
    ON "user_attribute_values"("user_id", "catalog_id", "value_id");
CREATE INDEX "user_attribute_values_user_id_catalog_id_idx"
    ON "user_attribute_values"("user_id", "catalog_id");

-- CreateTable: user_verifications
CREATE TABLE "user_verifications" (
    "id"                 UUID NOT NULL,
    "user_id"            UUID NOT NULL,
    "verification_type"  TEXT NOT NULL,
    "method"             TEXT NOT NULL,
    "assurance_level"    TEXT,
    "status"             TEXT NOT NULL,
    "purpose"            TEXT,
    "provider_reference" TEXT,
    "session_id"         TEXT,
    "verified_at"        TIMESTAMP(3),
    "expires_at"         TIMESTAMP(3),
    "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"         TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_verifications_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_verifications_session_id_key" ON "user_verifications"("session_id");
CREATE INDEX "user_verifications_user_id_verification_type_status_idx"
    ON "user_verifications"("user_id", "verification_type", "status");

-- CreateTable: user_verified_claims
CREATE TABLE "user_verified_claims" (
    "id"              UUID NOT NULL,
    "user_id"         UUID NOT NULL,
    "verification_id" UUID NOT NULL,
    "claim_name"      TEXT NOT NULL,
    "claim_value"     TEXT NOT NULL,
    "source"          TEXT NOT NULL,
    "assurance_level" TEXT,
    "verified_at"     TIMESTAMP(3) NOT NULL,
    "expires_at"      TIMESTAMP(3),
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_verified_claims_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "user_verified_claims_user_id_claim_name_expires_at_idx"
    ON "user_verified_claims"("user_id", "claim_name", "expires_at");
ALTER TABLE "user_verified_claims"
    ADD CONSTRAINT "user_verified_claims_verification_id_fkey"
    FOREIGN KEY ("verification_id") REFERENCES "user_verifications"("id")
    ON DELETE NO ACTION ON UPDATE CASCADE;

-- CreateTable: admin_audit_logs
CREATE TABLE "admin_audit_logs" (
    "id"             UUID NOT NULL,
    "admin_subject"  UUID NOT NULL,
    "admin_username" TEXT,
    "target_user_id" UUID,
    "action"         TEXT NOT NULL,
    "resource"       TEXT,
    "metadata"       JSONB,
    "request_id"     TEXT,
    "ip_address"     TEXT,
    "user_agent"     TEXT,
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "admin_audit_logs_admin_subject_created_at_idx"
    ON "admin_audit_logs"("admin_subject", "created_at");
CREATE INDEX "admin_audit_logs_target_user_id_created_at_idx"
    ON "admin_audit_logs"("target_user_id", "created_at");

-- Seed: personal_interests catalog with starter values.
INSERT INTO "attribute_catalogs" (id, slug, name_en, name_de, multi_select, active, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'personal_interests',
    'Personal Interests',
    'Persönliche Interessen',
    true,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

INSERT INTO "attribute_catalog_values" (id, catalog_id, slug, label_en, label_de, sort_order, active, created_at, updated_at)
SELECT gen_random_uuid(), c.id, v.slug, v.label_en, v.label_de, v.sort_order, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "attribute_catalogs" c
CROSS JOIN (VALUES
    ('music',       'Music',         'Musik',          10),
    ('sports',      'Sports',        'Sport',          20),
    ('technology',  'Technology',    'Technik',        30),
    ('politics',    'Politics',      'Politik',        40),
    ('culture',     'Culture',       'Kultur',         50),
    ('travel',      'Travel',        'Reisen',         60),
    ('food',        'Food & Dining', 'Essen & Trinken', 70),
    ('environment', 'Environment',   'Umwelt',         80)
) AS v(slug, label_en, label_de, sort_order)
WHERE c.slug = 'personal_interests';
