-- Run this if your coupons table doesn't have is_exclusive_partner yet
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS is_exclusive_partner BOOLEAN DEFAULT false;
