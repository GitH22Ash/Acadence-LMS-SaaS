-- =============================================================================
-- Acadence Learning Memory — Database Migration
-- =============================================================================
-- Run this migration in your Supabase SQL Editor.
-- It creates three tables for the learning memory feature:
--   1. learning_sessions  — one row per completed voice learning session
--   2. conversation_messages — finalized messages from the conversation
--   3. learning_notes     — AI-generated structured study notes
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. learning_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learning_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text NOT NULL,
  companion_id    uuid NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
  vapi_call_id    text UNIQUE,
  title           text,
  subject         text NOT NULL,
  topic           text,
  status          text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'completed', 'failed')),
  notes_status    text NOT NULL DEFAULT 'pending'
                    CHECK (notes_status IN ('pending', 'generating', 'completed', 'failed')),
  started_at      timestamptz DEFAULT now(),
  ended_at        timestamptz,
  duration_seconds integer,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_learning_sessions_user_id    ON learning_sessions(user_id);
CREATE INDEX idx_learning_sessions_vapi_call  ON learning_sessions(vapi_call_id);
CREATE INDEX idx_learning_sessions_created_at ON learning_sessions(created_at DESC);

-- RLS
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
  ON learning_sessions FOR SELECT
  USING (user_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "Users can insert their own sessions"
  ON learning_sessions FOR INSERT
  WITH CHECK (user_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "Users can update their own sessions"
  ON learning_sessions FOR UPDATE
  USING (user_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (user_id = (auth.jwt() ->> 'sub'));


-- ---------------------------------------------------------------------------
-- 2. conversation_messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversation_messages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       uuid NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  role             text NOT NULL CHECK (role IN ('user', 'assistant')),
  content          text NOT NULL,
  sequence_number  integer NOT NULL,
  message_timestamp timestamptz,
  created_at       timestamptz DEFAULT now(),
  UNIQUE(session_id, sequence_number)
);

-- Indexes
CREATE INDEX idx_conversation_messages_session ON conversation_messages(session_id, sequence_number);

-- RLS — access via session ownership
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages for their sessions"
  ON conversation_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM learning_sessions ls
      WHERE ls.id = conversation_messages.session_id
        AND ls.user_id = (auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY "Users can insert messages for their sessions"
  ON conversation_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM learning_sessions ls
      WHERE ls.id = conversation_messages.session_id
        AND ls.user_id = (auth.jwt() ->> 'sub')
    )
  );


-- ---------------------------------------------------------------------------
-- 3. learning_notes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learning_notes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          uuid NOT NULL UNIQUE REFERENCES learning_sessions(id) ON DELETE CASCADE,
  user_id             text NOT NULL,
  title               text,
  subject             text,
  summary             text,
  key_concepts        jsonb DEFAULT '[]'::jsonb,
  important_points    jsonb DEFAULT '[]'::jsonb,
  examples            jsonb DEFAULT '[]'::jsonb,
  questions_to_review jsonb DEFAULT '[]'::jsonb,
  misconceptions      jsonb DEFAULT '[]'::jsonb,
  next_steps          jsonb DEFAULT '[]'::jsonb,
  model_name          text,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_learning_notes_user_id    ON learning_notes(user_id);
CREATE INDEX idx_learning_notes_session_id ON learning_notes(session_id);
CREATE INDEX idx_learning_notes_created_at ON learning_notes(created_at DESC);

-- RLS
ALTER TABLE learning_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notes"
  ON learning_notes FOR SELECT
  USING (user_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "Users can insert their own notes"
  ON learning_notes FOR INSERT
  WITH CHECK (user_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "Users can update their own notes"
  ON learning_notes FOR UPDATE
  USING (user_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (user_id = (auth.jwt() ->> 'sub'));


-- ---------------------------------------------------------------------------
-- Updated_at trigger (reusable)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_learning_sessions_updated_at
  BEFORE UPDATE ON learning_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_notes_updated_at
  BEFORE UPDATE ON learning_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
