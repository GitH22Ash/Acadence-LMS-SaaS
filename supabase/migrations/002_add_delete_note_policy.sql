-- =============================================================================
-- Acadence Learning Memory — Delete Note Policy
-- =============================================================================

-- Add policy to allow users to delete their own notes
CREATE POLICY "Users can delete their own notes"
  ON learning_notes FOR DELETE
  USING (user_id = (auth.jwt() ->> 'sub'));
