/*
  # Fix User ID Columns for Clerk Authentication

  1. Changes
    - Convert `companions.author` from uuid to text (for Clerk user IDs)
    - Convert `session_history.user_id` from uuid to text (for Clerk user IDs)
    - Convert `bookmarks.user_id` from uuid to text (for Clerk user IDs)
    - Drop and recreate RLS policies to work with text-based user IDs

  2. Important Notes
    - This migration assumes no existing data or drops existing data
    - Clerk user IDs are strings like "user_xxxxxxxxxxxxx", not UUIDs
    - The schema will now properly support Clerk authentication
*/

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Anyone can view companions" ON companions;
DROP POLICY IF EXISTS "Users can create their own companions" ON companions;
DROP POLICY IF EXISTS "Users can update their own companions" ON companions;
DROP POLICY IF EXISTS "Users can delete their own companions" ON companions;
DROP POLICY IF EXISTS "Users can view their own session history" ON session_history;
DROP POLICY IF EXISTS "Users can create their own session history" ON session_history;
DROP POLICY IF EXISTS "Users can delete their own session history" ON session_history;
DROP POLICY IF EXISTS "Users can view their own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can create their own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON bookmarks;

-- Drop foreign key constraints temporarily
ALTER TABLE session_history DROP CONSTRAINT IF EXISTS session_history_user_id_fkey;
ALTER TABLE bookmarks DROP CONSTRAINT IF EXISTS bookmarks_user_id_fkey;

-- Alter companions.author from uuid to text
DO $$
BEGIN
  -- Drop the column and recreate it as text
  ALTER TABLE companions DROP COLUMN IF EXISTS author;
  ALTER TABLE companions ADD COLUMN author text NOT NULL DEFAULT '';
END $$;

-- Alter session_history.user_id from uuid to text
DO $$
BEGIN
  ALTER TABLE session_history DROP COLUMN IF EXISTS user_id;
  ALTER TABLE session_history ADD COLUMN user_id text NOT NULL DEFAULT '';
END $$;

-- Alter bookmarks.user_id from uuid to text
DO $$
BEGIN
  ALTER TABLE bookmarks DROP COLUMN IF EXISTS user_id;
  ALTER TABLE bookmarks ADD COLUMN user_id text NOT NULL DEFAULT '';
END $$;

-- Add missing columns to companions table that were in the original migration
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companions' AND column_name = 'avatar') THEN
    ALTER TABLE companions ADD COLUMN avatar text DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companions' AND column_name = 'description') THEN
    ALTER TABLE companions ADD COLUMN description text DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companions' AND column_name = 'instructions') THEN
    ALTER TABLE companions ADD COLUMN instructions text DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companions' AND column_name = 'updated_at') THEN
    ALTER TABLE companions ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Rename voice column to voice_id if needed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companions' AND column_name = 'voice') THEN
    ALTER TABLE companions RENAME COLUMN voice TO voice_id;
  END IF;
END $$;

-- Rename style column to avatar if that's what it represents, or drop it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companions' AND column_name = 'style') THEN
    ALTER TABLE companions DROP COLUMN style;
  END IF;
END $$;

-- Rename duration if it exists (not in our schema)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companions' AND column_name = 'duration') THEN
    ALTER TABLE companions DROP COLUMN duration;
  END IF;
END $$;

-- Recreate unique constraint on bookmarks
ALTER TABLE bookmarks DROP CONSTRAINT IF EXISTS bookmarks_companion_id_user_id_key;
ALTER TABLE bookmarks ADD CONSTRAINT bookmarks_companion_id_user_id_key UNIQUE(companion_id, user_id);

-- Recreate RLS policies for companions (anyone can view, only authors can modify)
CREATE POLICY "Anyone can view companions"
  ON companions
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create companions"
  ON companions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authors can update their own companions"
  ON companions
  FOR UPDATE
  TO authenticated
  USING (author = current_user)
  WITH CHECK (author = current_user);

CREATE POLICY "Authors can delete their own companions"
  ON companions
  FOR DELETE
  TO authenticated
  USING (author = current_user);

-- Recreate RLS policies for session_history
CREATE POLICY "Users can view their own session history"
  ON session_history
  FOR SELECT
  TO authenticated
  USING (user_id = current_user);

CREATE POLICY "Users can create their own session history"
  ON session_history
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = current_user);

CREATE POLICY "Users can delete their own session history"
  ON session_history
  FOR DELETE
  TO authenticated
  USING (user_id = current_user);

-- Recreate RLS policies for bookmarks
CREATE POLICY "Users can view their own bookmarks"
  ON bookmarks
  FOR SELECT
  TO authenticated
  USING (user_id = current_user);

CREATE POLICY "Users can create their own bookmarks"
  ON bookmarks
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = current_user);

CREATE POLICY "Users can delete their own bookmarks"
  ON bookmarks
  FOR DELETE
  TO authenticated
  USING (user_id = current_user);

-- Recreate indexes
DROP INDEX IF EXISTS idx_companions_author;
DROP INDEX IF EXISTS idx_session_history_user_id;
DROP INDEX IF EXISTS idx_bookmarks_user_id;

CREATE INDEX IF NOT EXISTS idx_companions_author ON companions(author);
CREATE INDEX IF NOT EXISTS idx_companions_subject ON companions(subject);
CREATE INDEX IF NOT EXISTS idx_session_history_user_id ON session_history(user_id);
CREATE INDEX IF NOT EXISTS idx_session_history_companion_id ON session_history(companion_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_companion_id ON bookmarks(companion_id);
