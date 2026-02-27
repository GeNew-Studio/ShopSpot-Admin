-- Run this in Supabase Dashboard → SQL Editor for your project (kvonaxrmepckfhkntaas)
-- This adds store coupons support. The StoreDetail page now uses admin_get_application
-- for store info (which already works) and these functions for coupons.

-- 1. Create store_coupons table (skip if already exists)
CREATE TABLE IF NOT EXISTS store_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  expires_at TIMESTAMPTZ,
  is_exclusive_partner BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, code)
);

CREATE INDEX IF NOT EXISTS idx_store_coupons_store_id ON store_coupons(store_id);

-- 2. Get coupons for a store
CREATE OR REPLACE FUNCTION admin_get_store_coupons(p_admin_id UUID, p_store_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_coupons JSON;
BEGIN
  IF p_admin_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Unauthorized'); END IF;
  SELECT COALESCE(json_agg(row_to_json(c) ORDER BY c.created_at DESC), '[]'::json) INTO v_coupons
  FROM (SELECT id, code, description, discount_type, discount_value, expires_at, is_exclusive_partner, created_at FROM store_coupons WHERE store_id = p_store_id) c;
  RETURN json_build_object('success', true, 'coupons', v_coupons);
EXCEPTION WHEN undefined_table THEN RETURN json_build_object('success', true, 'coupons', '[]'::json);
END;
$$;

-- 3. Add coupon
CREATE OR REPLACE FUNCTION admin_add_store_coupon(p_admin_id UUID, p_store_id UUID, p_code TEXT, p_description TEXT, p_discount_type TEXT, p_discount_value NUMERIC, p_expires_at TIMESTAMPTZ DEFAULT NULL, p_is_exclusive_partner BOOLEAN DEFAULT false)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_coupon store_coupons;
BEGIN
  IF p_admin_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Unauthorized'); END IF;
  IF NOT EXISTS (SELECT 1 FROM applications WHERE id = p_store_id AND status = 'approved') THEN RETURN json_build_object('success', false, 'error', 'Store not found'); END IF;
  INSERT INTO store_coupons (store_id, code, description, discount_type, discount_value, expires_at, is_exclusive_partner)
  VALUES (p_store_id, trim(upper(p_code)), nullif(trim(p_description), ''), p_discount_type, p_discount_value, p_expires_at, COALESCE(p_is_exclusive_partner, false))
  RETURNING * INTO v_coupon;
  RETURN json_build_object('success', true, 'coupon', row_to_json(v_coupon));
EXCEPTION
  WHEN unique_violation THEN RETURN json_build_object('success', false, 'error', 'A coupon with this code already exists for this store');
  WHEN check_violation THEN RETURN json_build_object('success', false, 'error', 'Invalid discount type or value');
END;
$$;

-- 4. Remove coupon
CREATE OR REPLACE FUNCTION admin_remove_store_coupon(p_admin_id UUID, p_coupon_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_admin_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Unauthorized'); END IF;
  DELETE FROM store_coupons WHERE id = p_coupon_id;
  RETURN json_build_object('success', true);
END;
$$;
