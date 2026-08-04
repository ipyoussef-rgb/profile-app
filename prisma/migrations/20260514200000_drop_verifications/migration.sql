-- Drop eID/age verification surface area — removed from scope.
-- Email/phone changes go through KOBIL Identity's `kc_action` flow instead.

DROP TABLE IF EXISTS "user_verified_claims";
DROP TABLE IF EXISTS "user_verifications";
