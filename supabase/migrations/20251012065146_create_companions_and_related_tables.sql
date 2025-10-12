/*
  # Create Companions and Related Tables

  1. New Tables
    - `companions`
      - `id` (uuid, primary key) - Unique identifier for the companion
      - `name` (text) - Name of the companion
      - `subject` (text) - Subject area (e.g., Math, Science)
      - `topic` (text) - Specific topic within the subject
      - `author` (text) - Clerk user ID of the creator
      - `avatar` (text) - URL or identifier for the companion's avatar
      - `description` (text) - Description of the companion
      - `instructions` (text) - Instructions for the companion's behavior
      - `voice_id` (text) - Identifier for the voice used by the companion
      - `created_at` (timestamptz) - Timestamp of creation
      - `updated_at` (timestamptz) - Timestamp of last update

    - `session_history`
      - `id` (uuid, primary key) - Unique identifier for the session
      - `companion_id` (uuid, foreign key) - Reference to the companion
      - `user_id` (text) - Clerk user ID of the user
      - `created_at` (timestamptz) - Timestamp of session creation

    - `bookmarks`
      - `id` (uuid, primary key) - Unique identifier for the bookmark
      - `companion_id` (uuid, foreign key) - Reference to the companion
      - `user_id` (text) - Clerk user ID of the user
      - `created_at` (timestamptz) - Timestamp of bookmark creation

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Users can view all companions
    - Users can only create/edit their own companions
    - Users can only manage their own bookmarks and session history
*/

-- Create companions table
CREATE TABLE IF NOT EXISTS companions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  topic text NOT NULL,
  author text NOT NULL,
  avatar text DEFAULT '',
  description text DEFAULT '',
  instructions text DEFAULT '',
  voice_id text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create session_history table
CREATE TABLE IF NOT EXISTS session_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  companion_id uuid NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  companion_id uuid NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(companion_id, user_id)
);

-- Enable RLS
ALTER TABLE companions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Companions policies
CREATE POLICY "Anyone can view companions"
  ON companions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own companions"
  ON companions
  FOR INSERT
  TO authenticated
  WITH CHECK (author = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own companions"
  ON companions
  FOR UPDATE
  TO authenticated
  USING (author = current_setting('request.jwt.claims', true)::json->>'sub')
  WITH CHECK (author = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own companions"
  ON companions
  FOR DELETE
  TO authenticated
  USING (author = current_setting('request.jwt.claims', true)::json->>'sub');

-- Session history policies
CREATE POLICY "Users can view their own session history"
  ON session_history
  FOR SELECT
  TO authenticated
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can create their own session history"
  ON session_history
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own session history"
  ON session_history
  FOR DELETE
  TO authenticated
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Bookmarks policies
CREATE POLICY "Users can view their own bookmarks"
  ON bookmarks
  FOR SELECT
  TO authenticated
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can create their own bookmarks"
  ON bookmarks
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own bookmarks"
  ON bookmarks
  FOR DELETE
  TO authenticated
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_companions_author ON companions(author);
CREATE INDEX IF NOT EXISTS idx_companions_subject ON companions(subject);
CREATE INDEX IF NOT EXISTS idx_session_history_user_id ON session_history(user_id);
CREATE INDEX IF NOT EXISTS idx_session_history_companion_id ON session_history(companion_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_companion_id ON bookmarks(companion_id);
