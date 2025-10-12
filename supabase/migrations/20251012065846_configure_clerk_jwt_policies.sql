/*
  # Configure Clerk JWT Authentication Policies

  1. Changes
    - Update RLS policies to properly extract Clerk user IDs from JWT
    - Create helper function in public schema for getting current user ID
    
  2. Important Notes
    - Clerk stores the user ID in the JWT under the 'sub' claim
    - We extract it directly in policies using current_setting
*/

-- Create a helper function to get the current Clerk user ID from the JWT
CREATE OR REPLACE FUNCTION public.get_clerk_user_id() 
RETURNS text 
LANGUAGE sql 
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    ''
  );
$$;

-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can view companions" ON companions;
DROP POLICY IF EXISTS "Authenticated users can create companions" ON companions;
DROP POLICY IF EXISTS "Authors can update their own companions" ON companions;
DROP POLICY IF EXISTS "Authors can delete their own companions" ON companions;
DROP POLICY IF EXISTS "Users can view their own session history" ON session_history;
DROP POLICY IF EXISTS "Users can create their own session history" ON session_history;
DROP POLICY IF EXISTS "Users can delete their own session history" ON session_history;
DROP POLICY IF EXISTS "Users can view their own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can create their own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON bookmarks;

-- Recreate companions policies with Clerk JWT support
CREATE POLICY "Anyone can view companions"
  ON companions
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create companions"
  ON companions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.get_clerk_user_id() != '');

CREATE POLICY "Authors can update their own companions"
  ON companions
  FOR UPDATE
  TO authenticated
  USING (author = public.get_clerk_user_id())
  WITH CHECK (author = public.get_clerk_user_id());

CREATE POLICY "Authors can delete their own companions"
  ON companions
  FOR DELETE
  TO authenticated
  USING (author = public.get_clerk_user_id());

-- Recreate session_history policies with Clerk JWT support
CREATE POLICY "Users can view their own session history"
  ON session_history
  FOR SELECT
  TO authenticated
  USING (user_id = public.get_clerk_user_id());

CREATE POLICY "Users can create their own session history"
  ON session_history
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = public.get_clerk_user_id());

CREATE POLICY "Users can delete their own session history"
  ON session_history
  FOR DELETE
  TO authenticated
  USING (user_id = public.get_clerk_user_id());

-- Recreate bookmarks policies with Clerk JWT support
CREATE POLICY "Users can view their own bookmarks"
  ON bookmarks
  FOR SELECT
  TO authenticated
  USING (user_id = public.get_clerk_user_id());

CREATE POLICY "Users can create their own bookmarks"
  ON bookmarks
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = public.get_clerk_user_id());

CREATE POLICY "Users can delete their own bookmarks"
  ON bookmarks
  FOR DELETE
  TO authenticated
  USING (user_id = public.get_clerk_user_id());
