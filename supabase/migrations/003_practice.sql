-- =============================================================================
-- Acadence Practice — Database Migration
-- =============================================================================
-- Creates tables for the Practice feature (flashcards + quizzes):
--   1. flashcard_decks     — groups of flashcards from a learning session
--   2. flashcards          — individual front/back study cards
--   3. flashcard_reviews   — spaced repetition review records
--   4. quizzes             — AI-generated quizzes from learning material
--   5. quiz_questions      — individual questions within a quiz
--   6. quiz_attempts       — user's quiz attempt sessions
--   7. quiz_answers        — individual answers within an attempt
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. flashcard_decks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS flashcard_decks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           text NOT NULL,
  title             text NOT NULL,
  subject           text,
  source_note_id    uuid REFERENCES learning_notes(id) ON DELETE SET NULL,
  source_session_id uuid REFERENCES learning_sessions(id) ON DELETE SET NULL,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX idx_flashcard_decks_user_id        ON flashcard_decks(user_id);
CREATE INDEX idx_flashcard_decks_source_note     ON flashcard_decks(source_note_id);
CREATE INDEX idx_flashcard_decks_created_at      ON flashcard_decks(created_at DESC);

ALTER TABLE flashcard_decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own decks"
  ON flashcard_decks FOR SELECT
  USING (user_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "Users can insert their own decks"
  ON flashcard_decks FOR INSERT
  WITH CHECK (user_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "Users can update their own decks"
  ON flashcard_decks FOR UPDATE
  USING (user_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (user_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "Users can delete their own decks"
  ON flashcard_decks FOR DELETE
  USING (user_id = (auth.jwt() ->> 'sub'));


-- ---------------------------------------------------------------------------
-- 2. flashcards
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS flashcards (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id         uuid NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
  front           text NOT NULL,
  back            text NOT NULL,
  hint            text,
  difficulty      text NOT NULL DEFAULT 'medium'
                    CHECK (difficulty IN ('easy', 'medium', 'hard')),
  source_note_id  uuid REFERENCES learning_notes(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_flashcards_deck_id    ON flashcards(deck_id);
CREATE INDEX idx_flashcards_created_at ON flashcards(created_at DESC);

ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

-- Access flashcards via deck ownership
CREATE POLICY "Users can view flashcards in their decks"
  ON flashcards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM flashcard_decks fd
      WHERE fd.id = flashcards.deck_id
        AND fd.user_id = (auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY "Users can insert flashcards in their decks"
  ON flashcards FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM flashcard_decks fd
      WHERE fd.id = flashcards.deck_id
        AND fd.user_id = (auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY "Users can update flashcards in their decks"
  ON flashcards FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM flashcard_decks fd
      WHERE fd.id = flashcards.deck_id
        AND fd.user_id = (auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY "Users can delete flashcards in their decks"
  ON flashcards FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM flashcard_decks fd
      WHERE fd.id = flashcards.deck_id
        AND fd.user_id = (auth.jwt() ->> 'sub')
    )
  );


-- ---------------------------------------------------------------------------
-- 3. flashcard_reviews
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS flashcard_reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flashcard_id    uuid NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  user_id         text NOT NULL,
  rating          text NOT NULL CHECK (rating IN ('again', 'hard', 'good', 'easy')),
  reviewed_at     timestamptz DEFAULT now(),
  next_review_at  timestamptz NOT NULL,
  interval_days   real NOT NULL DEFAULT 0,
  ease_factor     real NOT NULL DEFAULT 2.5,
  review_count    integer NOT NULL DEFAULT 1
);

CREATE INDEX idx_flashcard_reviews_flashcard  ON flashcard_reviews(flashcard_id);
CREATE INDEX idx_flashcard_reviews_user_id    ON flashcard_reviews(user_id);
CREATE INDEX idx_flashcard_reviews_next       ON flashcard_reviews(user_id, next_review_at);

ALTER TABLE flashcard_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reviews"
  ON flashcard_reviews FOR SELECT
  USING (user_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "Users can insert their own reviews"
  ON flashcard_reviews FOR INSERT
  WITH CHECK (user_id = (auth.jwt() ->> 'sub'));


-- ---------------------------------------------------------------------------
-- 4. quizzes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quizzes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           text NOT NULL,
  title             text NOT NULL,
  subject           text,
  source_note_id    uuid REFERENCES learning_notes(id) ON DELETE SET NULL,
  source_session_id uuid REFERENCES learning_sessions(id) ON DELETE SET NULL,
  question_count    integer NOT NULL DEFAULT 0,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX idx_quizzes_user_id        ON quizzes(user_id);
CREATE INDEX idx_quizzes_source_note    ON quizzes(source_note_id);
CREATE INDEX idx_quizzes_created_at     ON quizzes(created_at DESC);

ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quizzes"
  ON quizzes FOR SELECT
  USING (user_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "Users can insert their own quizzes"
  ON quizzes FOR INSERT
  WITH CHECK (user_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "Users can update their own quizzes"
  ON quizzes FOR UPDATE
  USING (user_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (user_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "Users can delete their own quizzes"
  ON quizzes FOR DELETE
  USING (user_id = (auth.jwt() ->> 'sub'));


-- ---------------------------------------------------------------------------
-- 5. quiz_questions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quiz_questions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id         uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question        text NOT NULL,
  question_type   text NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false')),
  options         jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_answer  text NOT NULL,
  explanation     text,
  difficulty      text NOT NULL DEFAULT 'medium'
                    CHECK (difficulty IN ('easy', 'medium', 'hard')),
  position        integer NOT NULL DEFAULT 0
);

CREATE INDEX idx_quiz_questions_quiz_id  ON quiz_questions(quiz_id, position);

ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view questions in their quizzes"
  ON quiz_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      WHERE q.id = quiz_questions.quiz_id
        AND q.user_id = (auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY "Users can insert questions in their quizzes"
  ON quiz_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quizzes q
      WHERE q.id = quiz_questions.quiz_id
        AND q.user_id = (auth.jwt() ->> 'sub')
    )
  );


-- ---------------------------------------------------------------------------
-- 6. quiz_attempts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id          uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id          text NOT NULL,
  score            integer,
  total_questions  integer NOT NULL DEFAULT 0,
  started_at       timestamptz DEFAULT now(),
  completed_at     timestamptz,
  weak_topics      jsonb DEFAULT '[]'::jsonb
);

CREATE INDEX idx_quiz_attempts_quiz_id   ON quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempts_user_id   ON quiz_attempts(user_id);
CREATE INDEX idx_quiz_attempts_created   ON quiz_attempts(started_at DESC);

ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own attempts"
  ON quiz_attempts FOR SELECT
  USING (user_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "Users can insert their own attempts"
  ON quiz_attempts FOR INSERT
  WITH CHECK (user_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "Users can update their own attempts"
  ON quiz_attempts FOR UPDATE
  USING (user_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (user_id = (auth.jwt() ->> 'sub'));


-- ---------------------------------------------------------------------------
-- 7. quiz_answers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quiz_answers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id    uuid NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id   uuid NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  answer        text NOT NULL,
  is_correct    boolean NOT NULL DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_quiz_answers_attempt_id  ON quiz_answers(attempt_id);

ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view answers in their attempts"
  ON quiz_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quiz_attempts qa
      WHERE qa.id = quiz_answers.attempt_id
        AND qa.user_id = (auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY "Users can insert answers in their attempts"
  ON quiz_answers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quiz_attempts qa
      WHERE qa.id = quiz_answers.attempt_id
        AND qa.user_id = (auth.jwt() ->> 'sub')
    )
  );


-- ---------------------------------------------------------------------------
-- Updated_at triggers (reuse function from 001)
-- ---------------------------------------------------------------------------
CREATE TRIGGER update_flashcard_decks_updated_at
  BEFORE UPDATE ON flashcard_decks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flashcards_updated_at
  BEFORE UPDATE ON flashcards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quizzes_updated_at
  BEFORE UPDATE ON quizzes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
