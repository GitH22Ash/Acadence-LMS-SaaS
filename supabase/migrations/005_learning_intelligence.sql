-- =============================================================================
-- Acadence Learning Intelligence — Database Migration
-- =============================================================================
-- Run this migration in your Supabase SQL Editor.
-- It creates tables for the learning intelligence feature:
--   1. learning_topics  — topics extracted from sessions/notes
--   2. topic_performance_events — log of performance for determinism
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. learning_topics
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learning_topics (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text NOT NULL,
  subject         text NOT NULL,
  name            text NOT NULL,
  mastery_score   real DEFAULT 0,
  needs_review    boolean DEFAULT false,
  last_studied_at timestamptz DEFAULT now(),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(user_id, subject, name)
);

CREATE INDEX idx_learning_topics_user_id ON learning_topics(user_id);
CREATE INDEX idx_learning_topics_subject ON learning_topics(subject);
CREATE INDEX idx_learning_topics_needs_review ON learning_topics(user_id, needs_review);

ALTER TABLE learning_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own topics"
  ON learning_topics FOR SELECT
  USING (user_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "Users can insert their own topics"
  ON learning_topics FOR INSERT
  WITH CHECK (user_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "Users can update their own topics"
  ON learning_topics FOR UPDATE
  USING (user_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (user_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "Users can delete their own topics"
  ON learning_topics FOR DELETE
  USING (user_id = (auth.jwt() ->> 'sub'));


-- ---------------------------------------------------------------------------
-- 2. topic_performance_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS topic_performance_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id        uuid NOT NULL REFERENCES learning_topics(id) ON DELETE CASCADE,
  user_id         text NOT NULL,
  source_type     text NOT NULL CHECK (source_type IN ('quiz', 'flashcard_review', 'session')),
  source_id       uuid,
  score           real NOT NULL,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_topic_performance_events_topic_id ON topic_performance_events(topic_id);
CREATE INDEX idx_topic_performance_events_user_id ON topic_performance_events(user_id);
CREATE INDEX idx_topic_performance_events_created ON topic_performance_events(created_at DESC);

ALTER TABLE topic_performance_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own events"
  ON topic_performance_events FOR SELECT
  USING (user_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "Users can insert their own events"
  ON topic_performance_events FOR INSERT
  WITH CHECK (user_id = (auth.jwt() ->> 'sub'));

-- Note: Events are immutable, so no update policy.
CREATE POLICY "Users can delete their own events"
  ON topic_performance_events FOR DELETE
  USING (user_id = (auth.jwt() ->> 'sub'));


-- ---------------------------------------------------------------------------
-- Updated_at trigger for learning_topics
-- ---------------------------------------------------------------------------
-- We reuse the update_updated_at_column() function from 001_learning_memory.sql

CREATE TRIGGER update_learning_topics_updated_at
  BEFORE UPDATE ON learning_topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
