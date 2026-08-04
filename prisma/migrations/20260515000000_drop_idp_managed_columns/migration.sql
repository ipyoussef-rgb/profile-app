-- IDP-managed attributes (locale, phone, address, birthdate, firstName, etc.)
-- now read/written through KOBIL Identity via getUserInfo / updateProfileUser.
-- Local columns that were holding stale/duplicate IDP data are dropped.
-- bio and timezone are also dropped — explicitly removed from scope.

ALTER TABLE "profiles" DROP COLUMN IF EXISTS "bio";
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "timezone";
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "locale";
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "phone";
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "address_json";
