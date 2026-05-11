-- Custom constraints not expressible in Prisma schema DSL.
-- Apply once after `prisma db push` with:
--   psql $DATABASE_URL -f prisma/custom-constraints.sql
-- or:
--   docker compose exec db psql -U postgres chesstourney -f /prisma/custom-constraints.sql

-- Prevents a player from having two REGISTERED entries in the same tournament.
-- A player can have a WITHDRAWN record and re-register; this only blocks concurrent REGISTERED rows.
CREATE UNIQUE INDEX IF NOT EXISTS "Registration_active_player_unique"
    ON "Registration" ("tournamentId", "playerId")
    WHERE "status" = 'REGISTERED';
