-- Add is_exclusive column to coupons (matching main website column name)
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS is_exclusive BOOLEAN DEFAULT FALSE;

-- Migrate any existing is_exclusive_partner data to is_exclusive
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'coupons' AND column_name = 'is_exclusive_partner'
  ) THEN
    UPDATE coupons SET is_exclusive = is_exclusive_partner WHERE is_exclusive_partner = true AND (is_exclusive IS NULL OR is_exclusive = false);
  END IF;
END $$;

-- Enable RLS on coupons table
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (prevents conflicts)
DROP POLICY IF EXISTS "Public can read active coupons" ON coupons;
DROP POLICY IF EXISTS "Users can read own coupons" ON coupons;
DROP POLICY IF EXISTS "Users can insert own coupons" ON coupons;
DROP POLICY IF EXISTS "Users can update own coupons" ON coupons;
DROP POLICY IF EXISTS "Users can delete own coupons" ON coupons;

-- Anyone (even anon) can read active, non-deleted coupons
CREATE POLICY "Public can read active coupons" ON coupons
  FOR SELECT USING (is_active = true AND deleted_at IS NULL);

-- Authenticated users can always read their own coupons (including drafts)
CREATE POLICY "Users can read own coupons" ON coupons
  FOR SELECT USING (auth.uid() = user_id);

-- Authenticated users can create coupons under their own user_id
CREATE POLICY "Users can insert own coupons" ON coupons
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own coupons
CREATE POLICY "Users can update own coupons" ON coupons
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own coupons
CREATE POLICY "Users can delete own coupons" ON coupons
  FOR DELETE USING (auth.uid() = user_id);
