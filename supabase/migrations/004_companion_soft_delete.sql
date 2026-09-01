-- =============================================================================
-- Acadence — Companion Soft Delete Migration
-- =============================================================================
-- Adds soft-delete support to companions table and hardens FK safety.
--
-- Why soft delete:
--   learning_sessions.companion_id REFERENCES companions(id) ON DELETE CASCADE
--   Hard-deleting a companion would cascade-destroy all sessions, messages,
--   and AI notes. Soft-delete preserves all historical learning data.
--
-- Safety net:
--   Changes the FK from ON DELETE CASCADE to ON DELETE RESTRICT so that
--   even a raw SQL DELETE will be blocked if sessions reference the companion.
-- =============================================================================

-- 1. Add deleted_at column for soft deletion
ALTER TABLE companions ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- 2. Index for efficient filtering of active companions
CREATE INDEX IF NOT EXISTS idx_companions_deleted_at ON companions(deleted_at);

-- 3. Harden FK — change from CASCADE to RESTRICT
--    This prevents accidental data loss from raw SQL deletes.
ALTER TABLE learning_sessions
  DROP CONSTRAINT IF EXISTS learning_sessions_companion_id_fkey;

ALTER TABLE learning_sessions
  ADD CONSTRAINT learning_sessions_companion_id_fkey
    FOREIGN KEY (companion_id) REFERENCES companions(id) ON DELETE RESTRICT;
