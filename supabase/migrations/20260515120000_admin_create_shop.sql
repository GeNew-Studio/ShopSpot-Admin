-- Admin: create a shop with a valid business_accounts parent (required by shops_business_account_id_fkey).
-- Uses a synthetic brand user + dummy business email, same pattern as seeded brands (is_dummy = true).

CREATE OR REPLACE FUNCTION public.admin_create_shop(
  p_admin_id uuid,
  p_store_name text,
  p_location text,
  p_industry text,
  p_industry_type text,
  p_latitude double precision,
  p_longitude double precision,
  p_contact_info text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_google_place_id text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_email text;
  v_brand_user uuid;
  v_business_account_id uuid;
  v_shop_id uuid;
  v_dummy_email text;
BEGIN
  IF p_admin_id IS NULL OR auth.uid() IS DISTINCT FROM p_admin_id THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT email INTO v_admin_email FROM auth.users WHERE id = p_admin_id;
  IF v_admin_email IS NULL OR NOT public.is_admin(v_admin_email) THEN
    RETURN json_build_object('success', false, 'error', 'Forbidden');
  END IF;

  IF trim(p_store_name) = '' OR trim(p_location) = '' THEN
    RETURN json_build_object('success', false, 'error', 'Store name and address are required');
  END IF;

  IF trim(p_industry) = '' OR trim(p_industry_type) = '' THEN
    RETURN json_build_object('success', false, 'error', 'Industry and type are required');
  END IF;

  IF p_latitude IS NULL OR p_longitude IS NULL
     OR p_latitude < -90 OR p_latitude > 90
     OR p_longitude < -180 OR p_longitude > 180 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid coordinates');
  END IF;

  v_brand_user := gen_random_uuid();
  v_dummy_email := 'admin-created-' || replace(v_brand_user::text, '-', '') || '@dummy.shopspot.local';

  INSERT INTO public.business_accounts (user_id, email, is_dummy)
  VALUES (v_brand_user, v_dummy_email, true)
  RETURNING id INTO v_business_account_id;

  INSERT INTO public.shops (
    user_id,
    business_account_id,
    store_name,
    location,
    contact_info,
    description,
    industry,
    industry_type,
    latitude,
    longitude,
    google_place_id,
    banner_urls
  )
  VALUES (
    v_brand_user,
    v_business_account_id,
    trim(p_store_name),
    trim(p_location),
    nullif(trim(p_contact_info), ''),
    nullif(trim(p_description), ''),
    trim(p_industry),
    trim(p_industry_type),
    p_latitude,
    p_longitude,
    nullif(trim(p_google_place_id), ''),
    '{}'::text[]
  )
  RETURNING id INTO v_shop_id;

  UPDATE public.business_accounts
  SET flagship_shop_id = v_shop_id,
      updated_at = now()
  WHERE id = v_business_account_id;

  RETURN json_build_object(
    'success', true,
    'shop_id', v_shop_id,
    'business_account_id', v_business_account_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_shop(
  uuid, text, text, text, text, double precision, double precision, text, text, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_create_shop(
  uuid, text, text, text, text, double precision, double precision, text, text, text
) TO authenticated;
