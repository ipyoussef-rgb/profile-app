-- CreateTable
CREATE TABLE "eid_verifications" (
    "user_id" UUID NOT NULL,
    "verified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transaction_id" TEXT,
    "given_names" TEXT,
    "family_names" TEXT,
    "date_of_birth" TEXT,
    "place_of_birth" TEXT,
    "street" TEXT,
    "city" TEXT,
    "zip_code" TEXT,
    "country" TEXT,

    CONSTRAINT "eid_verifications_pkey" PRIMARY KEY ("user_id")
);
